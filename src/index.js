import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import orderRoutes    from './routes/orders.js';
import productRoutes  from './routes/products.js';
import authRoutes     from './routes/auth.js';
import visitRoutes    from './routes/visits.js';
import settingsRoutes, { seedSettings } from './routes/settings.js';
import Admin from './models/Admin.js';

const app = express();

app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    process.env.ADMIN_URL  || 'http://hamedo-back-end-production-63a0.up.railway.app',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',     authRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/visits',   visitRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;

const start = async () => {
  await connectDB();

  // Seed default admin
  const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
  if (!existing) {
    await Admin.create({
      email: process.env.ADMIN_EMAIL    || 'admin@hamedosport.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@2025!',
      name: 'Hamed', role: 'superadmin',
    });
    console.log('✅ Default admin created');
  }

  // Seed default settings (shipping cost etc)
  await seedSettings();
  console.log('✅ Settings ready');

  app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
};

start();
