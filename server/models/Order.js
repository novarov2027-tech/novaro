import mongoose from 'mongoose';
export const STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const { ObjectId } = mongoose.Schema.Types;
const schema = new mongoose.Schema(
  {
    orderNo: { type: String, unique: true },
    user: { type: ObjectId, ref: 'User', required: true, index: true },
    customer: { name: String, phone: String, address: { type: String, default: '' }, governorate: String },
    items: [
      { _id: false, product: { type: ObjectId, ref: 'Product' }, name: String, price: Number, qty: Number },
    ],
    subtotal: Number, // products only
    deliveryFee: { type: Number, default: 0 },
    total: Number, // subtotal + delivery fee
    hiddenByCustomer: { type: Boolean, default: false }, // the customer cleared it from his list (the owner still sees it)
    status: { type: String, enum: STATUSES, default: 'new', index: true },
    history: [{ _id: false, status: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);
// Stock is reserved while an order is in any status except "cancelled".
export default mongoose.model('Order', schema);
