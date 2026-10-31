import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { bad, wrap } from '../utils/helpers.js';

const prod = process.env.NODE_ENV === 'production';
export const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: prod, maxAge: 7 * 24 * 3600 * 1000 };
export const issueToken = (res, user) =>
  res.cookie('token', jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' }), cookieOpts);

export async function userFromReq(req) {
  const token = req.cookies?.token;
  if (!token) return null;
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(id);
  } catch {
    return null;
  }
}
export const requireAuth = wrap(async (req, res, next) => {
  req.user = await userFromReq(req);
  if (!req.user) throw bad(401, 'Connexion requise');
  next();
});
export const requireOwner = (req, res, next) =>
  req.user?.role === 'owner' ? next() : next(bad(403, 'Accès réservé au propriétaire'));
