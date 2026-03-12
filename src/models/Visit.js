import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema({
  page:    { type: String, default: 'home' },
  source:  { type: String, default: 'direct' },
  device:  { type: String, default: 'unknown' },
  country: { type: String, default: 'EG' },
}, {
  timestamps: true,
});

export default mongoose.model('Visit', visitSchema);