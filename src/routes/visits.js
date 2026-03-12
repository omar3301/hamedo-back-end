// ─────────────────────────────────────────────
//  Visits API
//  POST /api/visits  → called from storefront on page load (public)
//  GET  /api/visits/stats → admin only
// ─────────────────────────────────────────────
import { Router } from 'express';
import Visit from '../models/Visit.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// ── PUBLIC: Log a visit ───────────────────────────────────────────────
// The frontend calls this silently when someone opens the site
router.post('/', async (req, res) => {
  try {
    const { page = 'home', source = 'direct' } = req.body;

    // Detect device from User-Agent header
    const ua = req.headers['user-agent'] || '';
    let device = 'desktop';
    if (/mobile/i.test(ua))  device = 'mobile';
    if (/tablet|ipad/i.test(ua)) device = 'tablet';

    // Detect source from Referer header (only keep domain)
    let detectedSource = source;
    const referer = req.headers['referer'] || '';
    if (referer.includes('instagram')) detectedSource = 'instagram';
    else if (referer.includes('google')) detectedSource = 'google';
    else if (referer.includes('facebook')) detectedSource = 'facebook';
    else if (referer && !referer.includes('localhost')) detectedSource = 'referral';

    await Visit.create({ page, source: detectedSource, device });

    // Don't return anything useful (no need to expose data to visitors)
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ADMIN: Visit stats ────────────────────────────────────────────────
router.get('/stats', protect, async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalVisits,
      visitsThisWeek,
      visitsByDay,
      visitsByPage,
      visitsByDevice,
      visitsBySource,
    ] = await Promise.all([
      Visit.countDocuments(),
      Visit.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),

      // Daily visits for last 7 days
      Visit.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),

      // Which pages/categories people land on
      Visit.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$page', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Mobile vs desktop vs tablet
      Visit.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$device', count: { $sum: 1 } } },
      ]),

      // Where they came from
      Visit.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      totalVisits,
      visitsThisWeek,
      visitsByDay,
      visitsByPage,
      visitsByDevice,
      visitsBySource,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;