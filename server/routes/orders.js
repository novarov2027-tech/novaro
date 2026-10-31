import { Router } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap, bad, cleanPhone, deliveryFee } from '../utils/helpers.js';

const router = Router();
const release = (done) => Promise.all(done.map(([id, q]) => Product.updateOne({ _id: id }, { $inc: { stock: q } })));

// Customer confirms an order: stock is reserved immediately (atomic per product).
router.post('/', requireAuth, wrap(async (req, res) => {
  const { items, customer = {} } = req.body;
  const phone = cleanPhone(customer.phone || req.user.phone);
  const name = String(customer.name || req.user.name || '').trim();
  if (!name) throw bad(400, 'Entrez votre nom.');
  if (!phone) throw bad(400, 'Entrez un numéro de téléphone valide (8 chiffres).');
  if (!Array.isArray(items) || !items.length) throw bad(400, 'Votre panier est vide.');

  const wanted = new Map();
  for (const i of items) {
    const q = parseInt(i.qty, 10);
    if (!mongoose.isValidObjectId(i.productId) || !(q > 0)) throw bad(400, 'Panier invalide.');
    wanted.set(String(i.productId), (wanted.get(String(i.productId)) || 0) + q);
  }

  const done = [];
  const lines = [];
  try {
    for (const [id, q] of wanted) {
      const p = await Product.findOneAndUpdate(
        { _id: id, isActive: true, stock: { $gte: q } },
        { $inc: { stock: -q } },
        { new: true }
      );
      if (!p) {
        const cur = await Product.findById(id);
        throw bad(409, cur ? `Stock insuffisant pour ${cur.name}.` : 'Produit introuvable.');
      }
      done.push([id, q]);
      lines.push({ product: p._id, name: p.name, price: p.price, qty: q });
    }
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const fee = deliveryFee();
    const address = String(customer.address || '').trim().slice(0, 200);
    const order = await Order.create({
      orderNo: 'NV-' + Date.now().toString(36).slice(-5).toUpperCase(),
      user: req.user._id,
      customer: { name, phone, address, governorate: customer.governorate || '' },
      items: lines,
      subtotal,
      deliveryFee: fee,
      total: subtotal + fee,
      history: [{ status: 'new' }],
    });
    // remember the contact details for the next order (never blocks the order itself)
    User.updateOne({ _id: req.user._id }, { $set: { phone, ...(name ? { name } : {}), ...(address ? { address } : {}) } }).catch(() => {});
    res.status(201).json(order);
  } catch (e) {
    await release(done); // put the stock back if anything failed
    throw e;
  }
}));

router.get('/mine', requireAuth, wrap(async (req, res) => {
  res.json(await Order.find({ user: req.user._id, hiddenByCustomer: { $ne: true } }).sort('-createdAt'));
}));

// The customer clears delivered / cancelled orders from HIS list (one order with {id}, or all of them).
// They are only hidden for him: the owner keeps them until he exports and purges the history.
router.post('/mine/clear', requireAuth, wrap(async (req, res) => {
  const filter = { user: req.user._id, status: { $in: ['delivered', 'cancelled'] } };
  if (req.body?.id) {
    if (!mongoose.isValidObjectId(req.body.id)) throw bad(404, 'Commande introuvable.');
    filter._id = req.body.id;
  }
  const { modifiedCount } = await Order.updateMany(filter, { $set: { hiddenByCustomer: true } });
  res.json({ cleared: modifiedCount });
}));

// The customer cancels their own order, only while it is still "new" (not confirmed by the owner yet).
router.post('/:id/cancel', requireAuth, wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw bad(404, 'Commande introuvable.');
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id, status: 'new' },
    { $set: { status: 'cancelled' }, $push: { history: { status: 'cancelled' } } },
    { new: true }
  );
  if (!order) {
    const exists = await Order.exists({ _id: req.params.id, user: req.user._id });
    throw bad(exists ? 409 : 404, exists ? 'Cette commande ne peut plus être annulée en ligne. Contactez-nous.' : 'Commande introuvable.');
  }
  await Promise.all(order.items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty } })));
  res.json(order);
}));

export default router;
