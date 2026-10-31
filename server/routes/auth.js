import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { issueToken, cookieOpts, userFromReq, requireAuth } from '../middleware/auth.js';
import { wrap, bad, maskEmail, cleanPhone } from '../utils/helpers.js';
import { sendMail } from '../utils/mailer.js';

const router = Router();
const USERNAME_RX = /^[a-z0-9_.-]{3,20}$/;
const norm = (u) => String(u || '').trim().toLowerCase();
const CODE_TTL = 10 * 60 * 1000; // a code is valid 10 minutes
const COOLDOWN = 60 * 1000; // at most one email per minute
const MAX_TRIES = 5;
const hashCode = (code) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(String(code)).digest('hex');

/* ---------- customers: username + password ---------- */
router.post('/register', wrap(async (req, res) => {
  const username = norm(req.body.username);
  const password = String(req.body.password || '');
  if (!USERNAME_RX.test(username)) throw bad(400, 'Identifiant : 3 à 20 caractères (lettres, chiffres, point, tiret ou underscore).');
  if (password.length < 6) throw bad(400, 'Mot de passe : 6 caractères minimum.');
  if (await User.exists({ username })) throw bad(409, 'Cet identifiant est déjà pris.');
  let user;
  try {
    user = await User.create({ username, passwordHash: await bcrypt.hash(password, 10) });
  } catch (e) {
    if (e.code === 11000) throw bad(409, 'Cet identifiant est déjà pris.');
    throw e;
  }
  issueToken(res, user);
  res.status(201).json({ user: user.toPublic() });
}));

router.post('/login', wrap(async (req, res) => {
  const user = await User.findOne({ username: norm(req.body.username) });
  const ok = user && user.role !== 'owner' && user.passwordHash && (await bcrypt.compare(String(req.body.password || ''), user.passwordHash));
  if (!ok) throw bad(401, 'Identifiant ou mot de passe incorrect.');
  issueToken(res, user);
  res.json({ user: user.toPublic() });
}));

/* ---------- login step 1: tells the page which method to show ---------- */
// Customer (or unknown username): "password". Owner: a 6-digit code is emailed to OWNER_EMAIL.
router.post('/start', wrap(async (req, res) => {
  const user = await User.findOne({ username: norm(req.body.username) });
  if (user?.role !== 'owner') return res.json({ method: 'password' });

  const to = process.env.OWNER_EMAIL;
  if (!to) throw bad(500, "OWNER_EMAIL n'est pas configuré sur le serveur.");
  const now = Date.now();
  const recent = user.loginCodeSentAt && now - user.loginCodeSentAt.getTime() < COOLDOWN && user.loginCodeExpires > now;
  if (!recent) {
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    user.loginCodeHash = hashCode(code);
    user.loginCodeExpires = new Date(now + CODE_TTL);
    user.loginCodeAttempts = 0;
    user.loginCodeSentAt = new Date(now);
    await user.save();
    await sendMail({
      to,
      subject: `Novaro : votre code de connexion ${code}`,
      text: `Votre code de connexion Novaro : ${code}\n\nIl est valable 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
      html: `<p>Votre code de connexion Novaro :</p><p style="font-size:28px;letter-spacing:6px"><b>${code}</b></p><p>Il est valable 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`,
    });
  }
  res.json({ method: 'code', hint: maskEmail(to), alreadySent: !!recent });
}));

/* ---------- owner login step 2: username + code ---------- */
router.post('/owner/verify', wrap(async (req, res) => {
  const user = await User.findOne({ username: norm(req.body.username), role: 'owner' });
  const code = String(req.body.code || '').replace(/\D/g, '');
  const invalid = bad(401, 'Code incorrect ou expiré.');
  if (!user || !user.loginCodeHash || !user.loginCodeExpires || user.loginCodeExpires < new Date()) throw invalid;
  if (user.loginCodeAttempts >= MAX_TRIES) throw bad(429, 'Trop d’essais. Attendez une minute et demandez un nouveau code.');
  const a = Buffer.from(hashCode(code));
  const b = Buffer.from(user.loginCodeHash);
  if (code.length !== 6 || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    user.loginCodeAttempts += 1;
    await user.save();
    throw invalid;
  }
  user.loginCodeHash = undefined; // a code works only once
  user.loginCodeExpires = undefined;
  user.loginCodeAttempts = 0;
  await user.save();
  issueToken(res, user);
  res.json({ user: user.toPublic() });
}));

// "Mon compte": the customer edits his name, phone and address. An empty value removes it.
router.patch('/profile', requireAuth, wrap(async (req, res) => {
  const b = req.body || {};
  const phone = String(b.phone || '').trim();
  const ph = phone ? cleanPhone(phone) : '';
  if (phone && !ph) throw bad(400, 'Numéro de téléphone invalide (8 chiffres).');
  req.user.name = String(b.name || '').trim().slice(0, 60);
  req.user.phone = ph;
  req.user.address = String(b.address || '').trim().slice(0, 200);
  await req.user.save();
  res.json({ user: req.user.toPublic() });
}));

router.get('/me', wrap(async (req, res) => {
  const user = await userFromReq(req);
  res.json({ user: user ? user.toPublic() : null });
}));

router.post('/logout', (req, res) => {
  res.clearCookie('token', { ...cookieOpts, maxAge: undefined });
  res.json({ ok: true });
});

export default router;
