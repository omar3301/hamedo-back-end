import { Router } from 'express';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import { createProductSchema, updateProductSchema } from '../validators/product.js';

const router = Router();

// ── PUBLIC: Get active products with pagination ───────────────────────
router.get('/', async (req, res) => {
  try {
    const { sport, category, featured, page = 1, limit = 50 } = req.query;
    const query = { active: true };
    if (sport && sport !== 'all') query.sport = sport;
    if (category) query.category = category;
    if (featured === 'true') query.featured = true;

    const total    = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort('sortOrder -createdAt')
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      products,
      total,
      pages: Math.ceil(total / Number(limit)),
      page: Number(page),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUBLIC: Get single product by slug ───────────────────────────────
router.get('/slug/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, active: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ADMIN: Get all products (including inactive) ──────────────────────
router.get('/admin/all', protect, async (req, res) => {
  try {
    const { search, sport, page = 1, limit = 50 } = req.query;
    const query = {};
    if (sport && sport !== 'all') query.sport = sport;
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { slug:  { $regex: search, $options: 'i' } },
      ];
    }
    const total    = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort('-createdAt')
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    res.json({ products, total, pages: Math.ceil(total / Number(limit)), page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ADMIN: Get single product by ID ──────────────────────────────────
router.get('/admin/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ADMIN: Create product ─────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { error, value } = createProductSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: 'Validation failed',
        details: error.details.map((d) => d.message),
      });
    }
    const product = await Product.create(value);
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Slug already exists. Use a unique slug.' });
    }
    res.status(400).json({ message: err.message });
  }
});

// ── ADMIN: Update product ─────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const { error, value } = updateProductSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: 'Validation failed',
        details: error.details.map((d) => d.message),
      });
    }
    const product = await Product.findByIdAndUpdate(req.params.id, value, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── ADMIN: Delete product ─────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ADMIN: Toggle active/inactive ────────────────────────────────────
router.patch('/:id/toggle', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.active = !product.active;
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
