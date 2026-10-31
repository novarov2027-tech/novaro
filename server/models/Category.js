import mongoose from 'mongoose';
export default mongoose.model(
  'Category',
  new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    position: { type: Number, default: 0 },
  })
);
