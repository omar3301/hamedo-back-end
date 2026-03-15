import { Router } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { protect } from '../middleware/auth.js';
import { logger } from '../config/logger.js';

const router = Router();

const signAccessToken  = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });

const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh', { expiresIn: '7d' });

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// ── Login ──────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin || !(await admin.matchPassword(password))) {
      logger.warn('Failed login attempt', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken  = signAccessToken(admin._id);
    const refreshToken = signRefreshToken(admin._id);

    // Refresh token goes in a secure httpOnly cookie — JS cannot read it
    res.cookie('hs_refresh', refreshToken, COOKIE_OPTS);

    logger.info('Admin logged in', { email: admin.email });

    res.json({
      token: accessToken, // short-lived, stored in memory / localStorage by admin app
      admin: { id: admin._id, email: admin.email, name: admin.name, role: admin.role },
    });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    res.status(500).json({ message: err.message });
  }
});

// ── Refresh access token ───────────────────────────────────────────────
// Admin app calls this when a request returns { expired: true }
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.hs_refresh;
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
    const { id } = jwt.verify(token, secret);

    const admin = await Admin.findById(id).select('-password');
    if (!admin) return res.status(401).json({ message: 'Admin not found' });

    const newAccess  = signAccessToken(admin._id);
    const newRefresh = signRefreshToken(admin._id); // rotate refresh token

    res.cookie('hs_refresh', newRefresh, COOKIE_OPTS);
    res.json({ token: newAccess });
  } catch (err) {
    res.clearCookie('hs_refresh');
    res.status(401).json({ message: 'Refresh token invalid or expired. Please log in again.' });
  }
});

// ── Logout ─────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('hs_refresh');
  res.json({ success: true });
});

// ── Get current admin ──────────────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  res.json(req.admin);
});

// ── Change password ────────────────────────────────────────────────────
router.patch('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8)
      return res.status(400).json({ message: 'New password must be at least 8 characters' });

    const admin = await Admin.findById(req.admin._id);
    if (!(await admin.matchPassword(currentPassword)))
      return res.status(401).json({ message: 'Current password is incorrect' });

    admin.password = newPassword;
    await admin.save();
    logger.info('Password changed', { adminId: admin._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
