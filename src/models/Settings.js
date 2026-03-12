// Settings — key/value store for admin-controlled config
// e.g. shipping cost, free shipping threshold, WhatsApp number
import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  label: { type: String },   // human-readable name shown in admin
  type:  { type: String, enum: ['number', 'string', 'boolean'], default: 'string' },
}, { timestamps: true });

export default mongoose.model('Settings', settingsSchema);
