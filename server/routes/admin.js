import { Router } from 'express';
import ExcelJS from 'exceljs';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Setting from '../models/Setting.js';
import Order, { STATUSES } from '../models/Order.js';
import { requireAuth, requireOwner } from '../middleware/auth.js';
import { wrap, bad, escapeRegex, normalizeSocial } from '../utils/helpers.js';

const router = Router();
router.use(requireAuth, requireOwner);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/* ---------- orders ---------- */
router.get('/orders', wrap(async (req, res) => {
  const { status, q } = req.query;
  const filter = {};
  if (STATUSES.includes(status)) filter.status = status;
  if (q?.trim()) {
    const rx = new RegExp(escapeRegex(q.trim().replace(/\s/g, '')), 'i');
    filter.$or = [{ orderNo: rx }, { 'customer.name': new RegExp(escapeRegex(q.trim()), 'i') }, { 'customer.phone': rx }];
  }
  res.json(await Order.find(filter).sort('-createdAt').limit(300));
}));

router.get('/stats', wrap(async (req, res) => {
  const [newCount, total, revenue, lowStock, closed] = await Promise.all([
    Order.countDocuments({ status: 'new' }),
    Order.countDocuments(),
    Order.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, sum: { $sum: '$total' } } }]),
    Product.countDocuments({ stock: { $lte: 3 }, isActive: true }),
    Order.countDocuments({ status: { $in: ['delivered', 'cancelled'] } }),
  ]);
  res.json({ newCount, total, revenue: revenue[0]?.sum || 0, lowStock, closed });
}));

/* ---------- Excel export + purge of the history ---------- */
const CLOSED = ['delivered', 'cancelled'];
const LABEL = { new: 'Nouvelle', confirmed: 'Confirmée', shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée' };
const closedFilter = (until) => ({ status: { $in: CLOSED }, ...(until ? { updatedAt: { $lte: new Date(until) } } : {}) });

// GET /orders/export.xlsx            -> every order
// GET /orders/export.xlsx?scope=closed&until=ISO -> delivered + cancelled orders last updated before `until`
router.get('/orders/export.xlsx', wrap(async (req, res) => {
  const filter = req.query.scope === 'closed' ? closedFilter(req.query.until) : {};
  const orders = await Order.find(filter).sort('createdAt').lean();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Novaro';
  const ws = wb.addWorksheet('Commandes');
  ws.columns = [
    { header: 'N° commande', key: 'no', width: 14 },
    { header: 'Date', key: 'date', width: 18, style: { numFmt: 'dd/mm/yyyy hh:mm' } },
    { header: 'Client', key: 'name', width: 22 },
    { header: 'Téléphone', key: 'phone', width: 14 },
    { header: 'Adresse', key: 'addr', width: 34 },
    { header: 'Produits', key: 'items', width: 54 },
    { header: 'Livraison (DT)', key: 'fee', width: 14 },
    { header: 'Total (DT)', key: 'total', width: 12 },
    { header: 'Statut', key: 'status', width: 12 },
  ];
  const wd = wb.addWorksheet('Détail des produits');
  wd.columns = [
    { header: 'N° commande', key: 'no', width: 14 },
    { header: 'Produit', key: 'name', width: 40 },
    { header: 'Quantité', key: 'qty', width: 10 },
    { header: 'Prix unitaire (DT)', key: 'price', width: 18 },
    { header: 'Sous-total (DT)', key: 'sub', width: 16 },
  ];
  for (const o of orders) {
    ws.addRow({
      no: o.orderNo,
      date: new Date(o.createdAt),
      name: o.customer?.name || '',
      phone: String(o.customer?.phone || ''),
      addr: [o.customer?.address, o.customer?.governorate].filter(Boolean).join(', '),
      items: o.items.map((i) => `${i.name} x${i.qty}`).join(' ; '),
      fee: o.deliveryFee || 0,
      total: o.total,
      status: LABEL[o.status] || o.status,
    });
    for (const i of o.items) wd.addRow({ no: o.orderNo, name: i.name, qty: i.qty, price: i.price, sub: i.price * i.qty });
  }
  for (const sheet of [ws, wd]) { sheet.getRow(1).font = { bold: true }; sheet.views = [{ state: 'frozen', ySplit: 1 }]; }
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="commandes-novaro-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}));

// DELETE /orders/closed?until=ISO : removes delivered + cancelled orders (same set as the export).
// New / confirmed / shipped orders are never deleted. Cancelled orders already gave their stock back.
router.delete('/orders/closed', wrap(async (req, res) => {
  if (!req.query.until || Number.isNaN(new Date(req.query.until).getTime())) throw bad(400, 'Date limite manquante.');
  const { deletedCount } = await Order.deleteMany(closedFilter(req.query.until));
  res.json({ deleted: deletedCount });
}));

// confirm / cancel / ship / deliver. Cancelling gives the stock back, re-opening takes it again.
router.patch('/orders/:id/status', wrap(async (req, res) => {
  const to = req.body.status;
  if (!STATUSES.includes(to)) throw bad(400, 'Statut invalide.');
  if (!mongoose.isValidObjectId(req.params.id)) throw bad(404, 'Commande introuvable.');
  const order = await Order.findById(req.params.id);
  if (!order) throw bad(404, 'Commande introuvable.');
  if (order.status === to) return res.json(order);

  if (to === 'cancelled') {
    await Promise.all(order.items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty } })));
  } else if (order.status === 'cancelled') {
    const done = [];
    try {
      for (const i of order.items) {
        const p = await Product.findOneAndUpdate({ _id: i.product, stock: { $gte: i.qty } }, { $inc: { stock: -i.qty } });
        if (!p) throw bad(409, `Stock insuffisant pour ${i.name}.`);
        done.push(i);
      }
    } catch (e) {
      await Promise.all(done.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty } })));
      throw e;
    }
  }
  order.status = to;
  order.history.push({ status: to });
  await order.save();
  res.json(order);
}));

/* ---------- categories ---------- */
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'categorie';
router.post('/categories', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw bad(400, 'Entrez le nom de la catégorie.');
  if (await Category.exists({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') })) throw bad(409, 'Cette catégorie existe déjà.');
  let slug = slugify(name), n = 1;
  while (await Category.exists({ slug })) slug = `${slugify(name)}-${++n}`;
  const last = await Category.findOne().sort('-position');
  res.status(201).json(await Category.create({ name, slug, position: (last?.position ?? -1) + 1 }));
}));
// Deleting a category keeps its products: they become "sans catégorie" and only show under "Tout".
router.delete('/categories/:id', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw bad(404, 'Catégorie introuvable.');
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) throw bad(404, 'Catégorie introuvable.');
  const { modifiedCount } = await Product.updateMany({ category: cat._id }, { $set: { category: null } });
  res.json({ ok: true, moved: modifiedCount });
}));

/* ---------- products ---------- */
const imgs = (b) => (Array.isArray(b.images) ? b.images : b.image ? [b.image] : []).filter((u) => typeof u === 'string' && u).slice(0, 6);
const pick = (b) => ({
  name: String(b.name || '').trim(),
  category: b.category || null,
  price: Number(b.price),
  stock: Math.max(0, parseInt(b.stock, 10) || 0),
  description: String(b.description || '').trim(),
  images: imgs(b),
  image: imgs(b)[0] || '',
  isActive: b.isActive !== false,
});
const validate = async (d) => {
  if (!d.name || !(d.price >= 0)) throw bad(400, 'Nom et prix valides requis.');
  if (d.category && (!mongoose.isValidObjectId(d.category) || !(await Category.exists({ _id: d.category })))) throw bad(400, 'Catégorie invalide.');
};

router.get('/products', wrap(async (req, res) => {
  res.json(await Product.find().populate('category', 'name slug').sort('category name'));
}));
router.post('/products', wrap(async (req, res) => {
  const d = pick(req.body); await validate(d);
  res.status(201).json(await Product.create(d));
}));
router.put('/products/:id', wrap(async (req, res) => {
  const d = pick(req.body); await validate(d);
  const p = await Product.findByIdAndUpdate(req.params.id, d, { new: true });
  if (!p) throw bad(404, 'Produit introuvable.');
  res.json(p);
}));
router.patch('/products/:id', wrap(async (req, res) => { // quick edits: stock / visibility
  const set = {};
  if (req.body.stock !== undefined) set.stock = Math.max(0, parseInt(req.body.stock, 10) || 0);
  if (req.body.isActive !== undefined) set.isActive = !!req.body.isActive;
  const p = await Product.findByIdAndUpdate(req.params.id, set, { new: true });
  if (!p) throw bad(404, 'Produit introuvable.');
  res.json(p);
}));
router.delete('/products/:id', wrap(async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* ---------- footer links and phone number ---------- */
router.put('/settings/social', wrap(async (req, res) => {
  const value = normalizeSocial(req.body);
  await Setting.findOneAndUpdate({ key: 'social' }, { value }, { upsert: true });
  res.json(value);
}));

/* ---------- delivery fee ---------- */
router.put('/settings/shop', wrap(async (req, res) => {
  const n = Number(String(req.body.deliveryFee).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 1000) throw bad(400, 'Entrez un montant valide (en DT, entre 0 et 1000).');
  const deliveryFee = Math.round(n * 1000) / 1000;
  await Setting.findOneAndUpdate({ key: 'shop' }, { value: { deliveryFee } }, { upsert: true });
  res.json({ deliveryFee });
}));

/* ---------- header banner ---------- */
router.put('/settings/hero', wrap(async (req, res) => {
  const images = (Array.isArray(req.body.images) ? req.body.images : [])
    .filter((u) => typeof u === 'string' && /^(https:\/\/|\/)/.test(u)).slice(0, 10);
  const interval = Math.min(60, Math.max(2, Number(req.body.interval) || 3)); // other images
  const mainInterval = Math.min(60, Math.max(2, Number(req.body.mainInterval) || 10)); // first image
  await Setting.findOneAndUpdate({ key: 'hero' }, { value: { images, interval, mainInterval } }, { upsert: true });
  res.json({ images, interval, mainInterval });
}));

router.post('/upload', upload.single('image'), wrap(async (req, res) => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) throw bad(501, 'Cloudinary non configuré.');
  if (!req.file) throw bad(400, 'Aucune image reçue.');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  const result = await new Promise((resolve, reject) =>
    cloudinary.uploader
      .upload_stream({ folder: 'novaro', transformation: [req.query.kind === 'hero' ? { width: 2000, crop: 'limit', quality: 'auto' } : { width: 1200, height: 1200, crop: 'limit', quality: 'auto' }] }, (e, r) => (e ? reject(e) : resolve(r)))
      .end(req.file.buffer)
  );
  res.json({ url: result.secure_url });
}));

export default router;
