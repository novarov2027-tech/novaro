import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: '', trim: true }, // filled from the first order
    phone: { type: String, default: '' }, // from "Mon compte" or remembered from the last order
    address: { type: String, default: '', trim: true },
    passwordHash: String, // customers only: the owner has no password, he logs in with an emailed code
    role: { type: String, enum: ['customer', 'owner'], default: 'customer' },
    // owner one-time login code (only a hash is stored)
    loginCodeHash: String,
    loginCodeExpires: Date,
    loginCodeAttempts: { type: Number, default: 0 },
    loginCodeSentAt: Date,
  },
  { timestamps: true }
);
schema.methods.toPublic = function () {
  return { id: this._id, username: this.username, name: this.name, phone: this.phone, address: this.address, role: this.role };
};
export default mongoose.model('User', schema);
