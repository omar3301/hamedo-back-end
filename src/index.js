import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import orderRoutes    from './routes/orders.js';
import productRoutes  from './routes/products.js';
import authRoutes     from './routes/auth.js';
import visitRoutes    from './routes/visits.js';
import settingsRoutes, { seedSettings } from './routes/settings.js';
import uploadRoutes   from './routes/upload.js';
import Admin from './models/Admin.js';

const app = express();

// ── Security headers ────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    process.env.ADMIN_URL  || 'http://localhost:5174',
  ],
  credentials: true,
}));

// ── Body parsers ────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Global rate limit (all routes) ─────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// ── Strict rate limit on auth login ────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 attempts max
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please wait 15 minutes.' },
});
app.use('/api/auth/login', loginLimiter);

// ── Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/visits',   visitRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload',   uploadRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Global error handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;

const start = async () => {
  await connectDB();

  // Seed default admin — REQUIRES env vars, no fallback values in code
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
  if (!existing) {
    await Admin.create({
      email:    process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      name: 'Hamed',
      role: 'superadmin',
    });
    console.log('✅ Default admin created');
  }

  await seedSettings();
  console.log('✅ Settings ready');

  app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
};

start();
