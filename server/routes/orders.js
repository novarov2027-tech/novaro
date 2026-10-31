import { Router } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { wrap, bad, cleanPhone, deliveryFee, rateLimit } from '../utils/helpers.js';

const router = Router();
const release = (done) => Promise.all(done.map(([id, q]) => Product.updateOne({ _id: id }, { $inc: { stock: q } })));

// No customer accounts: anyone can send an order with a name and a phone number.
// The owner then calls the customer, and confirms or cancels the order from the admin.
// Stock is reserved immediately (atomic per product) and given back if the owner cancels.
router.post(
  '/',
  rateLimit({ windowMs: 3600 * 1000, max: 20, message: 'Trop de commandes depuis cet appareil. Appelez-nous pour commander.' }),
  wrap(async (req, res) => {
    const { items, customer = {} } = req.body;
    if (req.body.website) return res.status(201).json({ orderNo: 'NV-OK', total: 0 }); // honeypot: bots fill the hidden field

    const name = String(customer.name || '').trim().slice(0, 60);
    const phone = cleanPhone(customer.phone);
    const address = String(customer.address || '').trim().slice(0, 200);
    if (name.length < 2) throw bad(400, 'Entrez votre nom.');
    if (!phone) throw bad(400, 'Entrez un numéro de téléphone valide (8 chiffres).');
    if (!Array.isArray(items) || !items.length || items.length > 50) throw bad(400, 'Votre panier est vide.');

    // at most 3 orders per phone number per hour (stops accidental double sends and spam)
    const recent = await Order.countDocuments({ 'customer.phone': phone, createdAt: { $gte: new Date(Date.now() - 3600 * 1000) } });
    if (recent >= 3) throw bad(429, 'Vous avez déjà passé plusieurs commandes. Nous vous appelons très bientôt.');

    const wanted = new Map();
    for (const i of items) {
      const q = parseInt(i.qty, 10);
      if (!mongoose.isValidObjectId(i.productId) || !(q > 0) || q > 50) throw bad(400, 'Panier invalide.');
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
          throw bad(409, cur ? `Stock insuffisant pour ${cur.name}.` : 'Un produit de votre panier n’est plus disponible.');
        }
        done.push([id, q]);
        lines.push({ product: p._id, name: p.name, price: p.price, qty: q });
      }
      const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
      const fee = deliveryFee();
      const order = await Order.create({
        orderNo: 'NV-' + Date.now().toString(36).slice(-5).toUpperCase(),
        customer: { name, phone, address },
        items: lines,
        subtotal,
        deliveryFee: fee,
        total: subtotal + fee,
        history: [{ status: 'new' }],
      });
      res.status(201).json({ orderNo: order.orderNo, total: order.total });
    } catch (e) {
      await release(done); // put the stock back if anything failed
      throw e;
    }
  })
);

export default router;
