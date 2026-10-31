import { Router } from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import { issueToken, cookieOpts, userFromReq } from '../middleware/auth.js';
import { wrap, bad, rateLimit } from '../utils/helpers.js';
import { sendMail } from '../utils/mailer.js';

// There are no customer accounts. This is only the owner's login (page: /admin):
// username, then a 6-digit code emailed to OWNER_EMAIL.
const router = Router();
const norm = (u) => String(u || '').trim().toLowerCase();
const CODE_TTL = 10 * 60 * 1000; // a code is valid 10 minutes
const COOLDOWN = 60 * 1000; // at most one email per minute
const MAX_TRIES = 5;
const hashCode = (code) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(String(code)).digest('hex');
const tenMin = (max) => rateLimit({ windowMs: 10 * 60 * 1000, max, message: 'Trop de tentatives. Réessayez dans quelques minutes.' });

// Step 1: the answer is always the same, so nobody can find out which username is the owner's.
router.post('/start', tenMin(8), wrap(async (req, res) => {
  const user = await User.findOne({ username: norm(req.body.username), role: 'owner' });
  if (user) {
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
  }
  res.json({ ok: true });
}));

// Step 2: username + code
router.post('/owner/verify', tenMin(15), wrap(async (req, res) => {
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

router.get('/me', wrap(async (req, res) => {
  const user = await userFromReq(req);
  res.json({ user: user ? user.toPublic() : null });
}));

router.post('/logout', (req, res) => {
  res.clearCookie('token', { ...cookieOpts, maxAge: undefined });
  res.json({ ok: true });
});

export default router;
