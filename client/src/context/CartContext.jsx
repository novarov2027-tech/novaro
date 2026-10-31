import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nv_cart') || '[]'); } catch { return []; }
  });
  const [open, setOpen] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(7);
  // the owner can change the fee, so it is read again whenever the cart or checkout opens
  const refreshFee = () => api('/api/settings/shop').then((d) => setDeliveryFee(d.deliveryFee)).catch(() => {});
  useEffect(() => { refreshFee(); }, []); // eslint-disable-line
  useEffect(() => { try { localStorage.setItem('nv_cart', JSON.stringify(items)); } catch {} }, [items]);

  const inCart = (id) => items.find((i) => i.id === id)?.qty || 0;
  const add = (p, qty = 1) =>
    setItems((cur) => {
      const found = cur.find((i) => i.id === p._id);
      const q = Math.min(p.stock, (found?.qty || 0) + qty);
      if (found) return cur.map((i) => (i.id === p._id ? { ...i, qty: q, stock: p.stock, price: p.price } : i));
      return [...cur, { id: p._id, name: p.name, price: p.price, image: p.images?.[0] || p.image, stock: p.stock, qty: q }];
    });
  const setQty = (id, qty) =>
    setItems((cur) => cur.flatMap((i) => (i.id !== id ? [i] : qty < 1 ? [] : [{ ...i, qty: Math.min(qty, i.stock) }])));

  const value = {
    items, open, setOpen, add, setQty, inCart, deliveryFee, refreshFee,
    clear: () => setItems([]),
    count: items.reduce((s, i) => s + i.qty, 0),
    total: items.reduce((s, i) => s + i.qty * i.price, 0),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
