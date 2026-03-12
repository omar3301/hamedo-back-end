import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  color:    { type: String, required: true },
  colorHex: { type: String, default: '#000000' },
  images:   { type: [String], default: [] },
  sizes: [{
    label: { type: String, required: true },
    stock: { type: Number, default: 0 },
  }],
  active: { type: Boolean, default: true },
}, { _id: false });

const productSchema = new mongoose.Schema({
  slug:           { type: String, required: true, unique: true },
  sport:          { type: String, enum: ['padel', 'football', 'all'], required: true },
  category:       { type: String, required: true },
  brand:          { type: String, required: true },
  name:           { type: String, required: true },
  subtitle:       { type: String, default: '' },
  desc:           { type: String, default: '' },
  price:          { type: Number, required: true },
  // ── Discount ──────────────────────────────────────────────────────
  discountPrice:  { type: Number, default: null },   // discounted price in EGP
  discountActive: { type: Boolean, default: false }, // toggle on/off without deleting
  // ─────────────────────────────────────────────────────────────────
  badge:      { type: String, default: null },
  variants:   { type: [variantSchema], default: [] },
  active:     { type: Boolean, default: true },
  featured:   { type: Boolean, default: false },
  sortOrder:  { type: Number, default: 0 },
}, { timestamps: true });

productSchema.virtual('allSizes').get(function () {
  const sizes = new Set();
  this.variants.forEach(v => v.sizes.forEach(s => sizes.add(s.label)));
  return [...sizes];
});
productSchema.virtual('primaryImage').get(function () {
  return this.variants?.[0]?.images?.[0] || '';
});
productSchema.virtual('color').get(function () {
  return this.variants?.[0]?.color || '';
});

export default mongoose.model('Product', productSchema);