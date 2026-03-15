import { Router } from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import { getSetting } from './settings.js';
import { createOrderSchema } from '../validators/order.js';
import { notifyNewOrder } from '../services/notify.js';

const router = Router();

// ── PUBLIC: Submit order ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    // 1. Validate input
    const { error, value } = createOrderSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: 'Validation failed',
        details: error.details.map((d) => d.message),
      });
    }

    const { customer, delivery, items, source, deliveryMethod } = value;

    // 2. Read shipping settings
    const shippingCost  = await getSetting('shipping_cost', 70);
    const freeShipAbove = await getSetting('free_shipping_above', 1000);

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

    const isStoreSale = source === 'store';
    const isPickup    = deliveryMethod === 'pickup';
    const shipping    = (isStoreSale || isPickup) ? 0 : (subtotal >= freeShipAbove ? 0 : shippingCost);
    const total       = subtotal + shipping;

    // 3. Save order
    const order = await Order.create({
      customer, delivery, items, subtotal, shipping, total,
      source: source || 'website',
      notes: value.notes || '',
    });

    // 4. Deduct stock for each ordered item
    try {
      const bulkOps = items.map((item) => ({
        updateOne: {
          filter: {
            _id: item.productId,
            'variants.color': item.color,
          },
          update: {
            $inc: { 'variants.$[v].sizes.$[s].stock': -item.qty },
          },
          arrayFilters: [
            { 'v.color': item.color },
            { 's.label': item.size },
          ],
        },
      }));
      await Product.bulkWrite(bulkOps);
    } catch (stockErr) {
      // Stock deduction failure should NOT cancel the order
      console.error('⚠️  Stock deduction failed for order', order.orderNumber, stockErr.message);
    }

    // 5. Notify admin (WhatsApp/SMS) — never crashes the response
    await notifyNewOrder(order);

    res.status(201).json({
      success:     true,
      orderNumber: order.orderNumber,
      total:       order.total,
      shipping:    order.shipping,
      subtotal:    order.subtotal,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to place order', error: err.message });
  }
});

// ── ADMIN: List orders ─────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, sort = '-createdAt' } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (req.query.source) query.source = req.query.source;
    if (search) {
      query.$or = [
        { orderNumber:          { $regex: search, $options: 'i' } },
        { 'customer.firstName': { $regex: search, $options: 'i' } },
        { 'customer.lastName':  { $regex: search, $options: 'i' } },
        { 'customer.phone':     { $regex: search, $options: 'i' } },
      ];
    }
    const total  = await Order.countDocuments(query);
    const orders = await Order.find(query).sort(sort).skip((page - 1) * limit).limit(Number(limit));
    res.json({ orders, total, pages: Math.ceil(total / limit), page: Number(page) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── ADMIN: Single order ────────────────────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── ADMIN: Update status / notes ──────────────────────────────────────
router.patch('/:id', protect, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const update = {};
    if (status) update.status = status;
    if (notes !== undefined) update.notes = notes;
    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!order) return res.status(404).json({ message: 'Not found' });
    res.json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── ADMIN: Delete order ────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── ADMIN: Dashboard stats ─────────────────────────────────────────────
router.get('/meta/stats', protect, async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalOrders, pendingOrders, revenueAgg, recentOrders, statusBreakdown] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.aggregate([{ $match: { status: { $nin: ['cancelled'] } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.find().sort('-createdAt').limit(5),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const dailyRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, status: { $nin: ['cancelled'] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', name: { $first: '$items.name' }, brand: { $first: '$items.brand' }, image: { $first: '$items.image' }, totalQty: { $sum: '$items.qty' }, totalRevenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
      { $sort: { totalQty: -1 } }, { $limit: 5 },
    ]);

    const soldByVariant = await Order.aggregate([
      { $match: { status: { $nin: ['cancelled'] } } },
      { $unwind: '$items' },
      { $group: { _id: { productId: '$items.productId', name: '$items.name', size: '$items.size', color: '$items.color' }, qty: { $sum: '$items.qty' }, image: { $first: '$items.image' } } },
      { $sort: { qty: -1 } }, { $limit: 30 },
    ]);

    const revenueByGov = await Order.aggregate([
      { $match: { status: { $nin: ['cancelled'] } } },
      { $group: { _id: '$delivery.governorate', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { revenue: -1 } }, { $limit: 10 },
    ]);

    res.json({ totalOrders, pendingOrders, totalRevenue: revenueAgg[0]?.total || 0, recentOrders, statusBreakdown, dailyRevenue, topProducts, soldByVariant, revenueByGov });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
