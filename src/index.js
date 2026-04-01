import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { connectDB } from './config/db.js';
import { logger } from './config/logger.js';
import orderRoutes    from './routes/orders.js';
import productRoutes  from './routes/products.js';
import authRoutes     from './routes/auth.js';
import visitRoutes    from './routes/visits.js';
import settingsRoutes, { seedSettings } from './routes/settings.js';
import uploadRoutes   from './routes/upload.js';
import Admin from './models/Admin.js';
import { startNotificationWorker } from './workers/notifyWorker.js';

const app = express();
mongoose.connect(process.env.MONGODB_URI, {
  family: 4 // This forces Node to use IPv4
})
.then(() => console.log('Connected to MongoDB!'))
.catch(err => console.error(err));
// ── Security headers ─────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    process.env.ADMIN_URL  || 'http://localhost:5174',
  ],
  credentials: true, // required for cookies
}));

// ── Body + Cookie parsers ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Request logger ───────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](`${req.method} ${req.path} ${res.statusCode} — ${ms}ms`);
  });
  next();
});

// ── Global rate limit ────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
}));

// ── Strict login rate limit ──────────────────────────────────────────
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please wait 15 minutes.' },
}));

// ── Swagger docs ─────────────────────────────────────────────────────
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'HamedoSport API', version: '1.0.0', description: 'Padel & Football store API' },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── Routes ───────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/visits',   visitRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload',   uploadRoutes);
app.get('/api/health',  (req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Global error handler ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;

const start = async () => {
  await connectDB();

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    logger.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
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
    logger.info('Default admin created');
  }

  await seedSettings();
  logger.info('Settings ready');

  // Start background notification worker
  startNotificationWorker();

  app.listen(PORT, () => logger.info(`Server running at http://localhost:${PORT}`));
  logger.info(`Swagger docs at http://localhost:${PORT}/api/docs`);
};

start();
