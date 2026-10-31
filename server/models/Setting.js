import mongoose from 'mongoose';
// Small key/value store for shop settings (e.g. the rotating header banner).
export default mongoose.model('Setting', new mongoose.Schema({ key: { type: String, unique: true }, value: mongoose.Schema.Types.Mixed }));
