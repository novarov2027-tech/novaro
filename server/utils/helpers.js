import Setting from '../models/Setting.js';
export const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
export const bad = (status, message) => Object.assign(new Error(message), { status });
// Tunisian mobile numbers: 8 digits, optional +216 prefix
export const cleanPhone = (s) => {
  const d = String(s || '').replace(/\D/g, '').replace(/^216/, '');
  return d.length === 8 ? d : '';
};
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const maskEmail = (e) => {
  const [u, d] = String(e || '').split('@');
  return u && d ? `${u[0]}***@${d}` : '***';
};

// Footer social links, read from .env (FACEBOOK_URL, INSTAGRAM_URL, WHATSAPP_NUMBER). Empty = icon hidden.
const toLink = (v, base) => {
  v = String(v || '').trim().slice(0, 200);
  if (!v) return '';
  if (/^https:\/\//i.test(v)) return v;
  if (/^http:\/\//i.test(v)) return 'https://' + v.slice(7);
  return base + v.replace(/^@/, '').replace(/^\/+/, '');
};
export const socialFromEnv = () => {
  let whatsapp = String(process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  if (whatsapp.length === 8) whatsapp = '216' + whatsapp; // Tunisian local number
  return {
    facebook: toLink(process.env.FACEBOOK_URL, 'https://www.facebook.com/'),
    instagram: toLink(process.env.INSTAGRAM_URL, 'https://www.instagram.com/'),
    whatsapp: whatsapp.length >= 10 && whatsapp.length <= 15 ? whatsapp : '',
  };
};

// Delivery fee added to every order (DT). The owner sets it in the admin (tab "Livraison").
// Until he does, DELIVERY_FEE from .env is used (7 by default).
const defaultFee = () => {
  const v = process.env.DELIVERY_FEE;
  const n = v === undefined || v === '' ? 7 : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 7;
};
export const getDeliveryFee = async () => {
  const s = await Setting.findOne({ key: 'shop' }).lean();
  const n = Number(s?.value?.deliveryFee);
  return s?.value?.deliveryFee !== undefined && Number.isFinite(n) && n >= 0 ? n : defaultFee();
};

// Very small in-memory rate limiter (one Render instance). Key = visitor IP.
// Behind Cloudflare/Render the real IP is in CF-Connecting-IP, otherwise Express' req.ip is used.
const hits = new Map();
export const rateLimit = ({ windowMs, max, message }) => (req, res, next) => {
  const key = `${req.path}|${req.headers['cf-connecting-ip'] || req.ip}`;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return next(Object.assign(new Error(message), { status: 429 }));
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  next();
};
