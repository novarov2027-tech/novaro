import { Router } from 'express';
import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Setting from '../models/Setting.js';
import { wrap, bad, getSocial, getDeliveryFee } from '../utils/helpers.js';

const router = Router();

router.get('/categories', wrap(async (req, res) => {
  const [cats, counts] = await Promise.all([
    Category.find().sort('position').lean(),
    Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$category', n: { $sum: 1 } } }]),
  ]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json(cats.map((c) => ({ ...c, count: byId[String(c._id)] || 0 })));
}));

router.get('/products', wrap(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.category) {
    const cat = await Category.findOne({ slug: req.query.category });
    if (!cat) return res.json([]);
    filter.category = cat._id;
  }
  res.json(await Product.find(filter).populate('category', 'name slug').sort('category name').lean());
}));

router.get('/products/:id', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw bad(404, 'Produit introuvable');
  const p = await Product.findOne({ _id: req.params.id, isActive: true }).populate('category', 'name slug');
  if (!p) throw bad(404, 'Produit introuvable');
  res.json(p);
}));

// Social links and phone number shown in the footer (public), edited by the owner in the admin
router.get('/settings/social', wrap(async (req, res) => res.json(await getSocial())));

// Delivery fee (public), set by the owner in the admin
router.get('/settings/shop', wrap(async (req, res) => res.json({ deliveryFee: await getDeliveryFee() })));

// Header banner settings (public): pictures + seconds each one stays on screen
router.get('/settings/hero', wrap(async (req, res) => {
  const s = await Setting.findOne({ key: 'hero' }).lean();
  res.json({ images: s?.value?.images || [], interval: s?.value?.interval || 3, mainInterval: s?.value?.mainInterval || 10 });
}));

export default router;
