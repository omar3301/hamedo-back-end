import { Router } from 'express';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import { createProductSchema, updateProductSchema } from '../validators/product.js';
import { cache, invalidateProducts } from '../config/cache.js';
import { logger } from '../config/logger.js';

const router = Router();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get active products (public)
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: sport
 *         schema: { type: string, enum: [padel, football, all] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Paginated product list
 */
router.get('/', async (req, res) => {
  try {
    const { sport, category, featured, page = 1, limit = 50 } = req.query;

    const cacheKey = `products_pub_${sport || 'all'}_${category || ''}_${featured || ''}_${page}_${limit}`;
    const hit = cache.get(cacheKey);
    if (hit) return res.json(hit);

    const query = { active: true };
    if (sport && sport !== 'all') query.sport = sport;
    if (category) query.category = category;
    if (featured === 'true') query.featured = true;

    const total    = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort('sortOrder -createdAt')
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const result = { products, total, pages: Math.ceil(total / Number(limit)), page: Number(page) };
    cache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    logger.error('GET /products error', { error: err.message });
    res.status(500).json({ message: err.message });
  }
});

// ── PUBLIC: Get single product by slug ───────────────────────────────
router.get('/slug/:slug', async (req, res) => {
  try {
    const cacheKey = `products_slug_${req.params.slug}`;
    const hit = cache.get(cacheKey);
    if (hit) return res.json(hit);

    const product = await Product.findOne({ slug: req.params.slug, active: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    cache.set(cacheKey, product);
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ADMIN: Get all products ───────────────────────────────────────────
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

// Backward-compat alias used by admin panel
router.get('/:id', protect, async (req, res) => {
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
    if (error) return res.status(400).json({ message: 'Validation failed', details: error.details.map((d) => d.message) });

    const product = await Product.create(value);
    invalidateProducts();
    logger.info('Product created', { slug: product.slug });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Slug already exists. Use a unique slug.' });
    res.status(400).json({ message: err.message });
  }
});

// ── ADMIN: Update product ─────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const { error, value } = updateProductSchema.validate(req.body, { abortEarly: false });
    if (error) return res.status(400).json({ message: 'Validation failed', details: error.details.map((d) => d.message) });

    const product = await Product.findByIdAndUpdate(req.params.id, value, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    invalidateProducts();
    logger.info('Product updated', { id: req.params.id });
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
    invalidateProducts();
    logger.info('Product deleted', { id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ADMIN: Toggle active ──────────────────────────────────────────────
router.patch('/:id/toggle', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.active = !product.active;
    await product.save();
    invalidateProducts();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
