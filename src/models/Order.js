import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId:  { type: String, required: true },
  name:       { type: String, required: true },
  brand:      { type: String },
  sport:      { type: String },
  color:      { type: String },
  colorHex:   { type: String },
  size:       { type: String, required: true },
  qty:        { type: Number, required: true, min: 1 },
  price:      { type: Number, required: true },
  image:      { type: String },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true,
  },
  customer: {
    firstName:  { type: String, required: true },
    lastName:   { type: String, required: true },
    phone:      { type: String, required: true },
    email:      { type: String, default: '' },
  },
  delivery: {
    address:    { type: String, required: true },
    apt:        { type: String, default: '' },
    city:       { type: String, required: true },
    governorate:{ type: String, required: true },
  },
  items:    { type: [orderItemSchema], required: true },
  subtotal: { type: Number, required: true },
  shipping: { type: Number, default: 0 },
  total:    { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  notes:    { type: String, default: '' },
  source:   { type: String, default: 'website' },
}, {
  timestamps: true,
});

// Auto-generate order number before save
orderSchema.pre('validate', async function (next) {
  if (!this.orderNumber) {
    const prefix = 'HS';
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.orderNumber = `${prefix}-${rand}`;
  }
  next();
});

// Virtual: full customer name
orderSchema.virtual('customer.fullName').get(function () {
  return `${this.customer.firstName} ${this.customer.lastName}`;
});

// Virtual: full address
orderSchema.virtual('delivery.fullAddress').get(function () {
  const { address, apt, city, governorate } = this.delivery;
  return [address, apt, city, governorate, 'Egypt'].filter(Boolean).join(', ');
});

export default mongoose.model('Order', orderSchema);
