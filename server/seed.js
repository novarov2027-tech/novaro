// Usage: npm run seed   (safe to re-run: owner is upserted; categories and sample products are only created on an empty database)
import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import Category from './models/Category.js';
import Product from './models/Product.js';

const CATS = [
  { slug: 'parfum-ambiance', name: "Parfum d'ambiance", n: 10, price: 35, label: 'Ambiance' },
  { slug: 'parfum-linge', name: 'Parfum de linge', n: 10, price: 28, label: 'Linge' },
  { slug: 'bougie-parfumee', name: 'Bougie parfumée', n: 10, price: 45, label: 'Bougie' },
  { slug: 'diffuseur-batonnets', name: 'Diffuseur à bâtonnets', n: 10, price: 55, label: 'Bâtonnets' },
  { slug: 'diffuseur-voiture', name: 'Diffuseur de voiture', n: 10, price: 18, label: 'Voiture' },
  { slug: 'diffuseur-electrique', name: 'Diffuseur électrique', n: 2, price: 120, names: ['Diffuseur électrique noir mat', 'Diffuseur électrique or brossé'] },
  { slug: 'parfum-diffuseur-electrique', name: 'Parfum pour diffuseur électrique', n: 10, price: 30, label: 'Recharge' },
  { slug: 'coffrets', name: 'Coffrets', n: 8, price: 90, names: ['Oud & Ambre', 'Vanille & Santal', 'Musc & Jasmin', 'Cèdre & Cuir', 'Rose & Figue', 'Ambre & Vanille', 'Santal & Oud', 'Découverte'].map((s) => 'Coffret ' + s) },
];
const SCENTS = ['Oud royal', 'Vanille noire', 'Ambre doré', 'Musc blanc', 'Jasmin', 'Santal', 'Cuir fauve', 'Figue', 'Rose safran', 'Cèdre'];

await mongoose.connect(process.env.MONGODB_URI);

// --- migration from the old email + password accounts (safe to run again) ---
try { await User.collection.dropIndex('email_1'); } catch { /* index already gone */ }
for (const u of await User.collection.find({ username: { $exists: false } }).toArray()) {
  const base = (String(u.email || 'user').split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '') + '___').slice(0, 14);
  let username = base, n = 1;
  while (await User.collection.findOne({ username })) username = `${base}${++n}`;
  await User.collection.updateOne({ _id: u._id }, { $set: { username } });
  console.log('Migrated account:', u.email, '->', username);
}

// --- owner: username + emailed code (no password) ---
const ownerName = (process.env.OWNER_USERNAME || 'owner').toLowerCase();
await User.findOneAndUpdate(
  { username: ownerName },
  { $set: { role: 'owner', name: 'Propriétaire' }, $unset: { passwordHash: '' } },
  { upsert: true, setDefaultsOnInsert: true }
);
await User.updateMany({ role: 'owner', username: { $ne: ownerName } }, { $set: { role: 'customer' } }); // only one owner
console.log('Owner ready: username =', ownerName, '| codes are sent to', process.env.OWNER_EMAIL || '(OWNER_EMAIL missing!)');

// Only on a fresh database, so categories deleted in the admin stay deleted.
if ((await Category.countDocuments()) === 0) {
  await Category.insertMany(CATS.map((c, i) => ({ slug: c.slug, name: c.name, position: i })));
  console.log('Categories created:', CATS.length);
}
const cats = await Category.find();

// SEED_SAMPLES=false skips the made-up demo products (use it for the real, online database)
if (process.env.SEED_SAMPLES !== 'false' && (await Product.countDocuments()) === 0) {
  const docs = [];
  CATS.forEach((c, ci) => {
    for (let i = 0; i < c.n; i++)
      docs.push({
        name: c.names ? c.names[i] : `${c.label} ${SCENTS[i]}`,
        category: cats.find((x) => x.slug === c.slug)?._id || null,
        price: c.price + (i % 3) * 3, // placeholder prices, edit them in the admin
        stock: 6 + ((i * 7) % 15),
        description: c.names ? 'Un objet soigné, aux finitions dorées.' : `Notes de ${SCENTS[i].toLowerCase()}, tenue longue durée.`,
      });
  });
  await Product.insertMany(docs);
  console.log('Sample products:', docs.length, '(placeholder data, replace with the real catalog)');
}
await mongoose.disconnect();
