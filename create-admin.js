// Run this once: node create-admin.js
// Creates the admin account in MongoDB

import 'dotenv/config';
import mongoose from 'mongoose';
import Admin from './src/models/Admin.js';

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected to MongoDB...');

const exists = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
if (exists) {
  console.log('✅ Admin already exists:', exists.email);
} else {
  await Admin.create({
    email:    process.env.ADMIN_EMAIL    || 'admin@hamedosport.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@2025!',
    name:     'Hamed',
    role:     'superadmin',
  });
  console.log('✅ Admin created successfully!');
  console.log('   Email:   ', process.env.ADMIN_EMAIL);
  console.log('   Password:', process.env.ADMIN_PASSWORD);
}

await mongoose.disconnect();
process.exit(0);