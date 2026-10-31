import { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { tnd, imgs } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export const Stock = ({ p }) =>
  p.stock < 1 ? <small className="stk low">Épuisé</small>
  : p.stock <= 3 ? <small className="stk low">Plus que {p.stock} en stock</small>
  : <small className="stk">{p.stock} en stock</small>;

// Cards: every photo is cropped to the same 4:5 frame so the grid stays even.
export const Visual = ({ p }) => {
  const img = imgs(p)[0];
  return (
    <>
      {img && <img src={img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1 }} />}
      <em>{p.category?.name}</em>
      {!img && <img className="blend" src="/mono.jpg" alt="" />}
    </>
  );
};

// Product page: photos are shown whole (never cropped), with arrows and thumbnails.
function Gallery({ p }) {
  const list = imgs(p);
  const [i, setI] = useState(0);
  if (!list.length) return <div className="vis"><Visual p={p} /></div>;
  const go = (d) => setI((i + d + list.length) % list.length);
  return (
    <div className="gal">
      <div className="vis" style={{ background: '#000' }}>
        <img src={list[i]} alt={p.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 1 }} />
        {list.length > 1 && (
          <>
            <button className="arrow l" onClick={() => go(-1)} aria-label="Photo précédente">‹</button>
            <button className="arrow r" onClick={() => go(1)} aria-label="Photo suivante">›</button>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="thumbs">
          {list.map((u, k) => <button key={u} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Photo ${k + 1}`}><img src={u} alt="" /></button>)}
        </div>
      )}
    </div>
  );
}

export default function ProductModal({ p, onClose }) {
  const { add, inCart, setOpen } = useCart();
  const isOwner = useAuth().user?.role === 'owner'; // the owner only previews the shop
  const left = Math.max(0, p.stock - inCart(p._id));
  const [q, setQ] = useState(1);
  const qty = Math.max(1, Math.min(q, left || 1));
  return (
    <div className="veil on" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <button className="x" onClick={onClose} aria-label="Fermer">&times;</button>
        <div className="split">
          <Gallery p={p} />
          <div className="body">
            <h3>{p.name}</h3>
            <p style={{ color: 'var(--mute)', margin: 0 }}>{p.description}</p>
            <p className="price serif" style={{ fontSize: 30, margin: '16px 0 4px' }}>{tnd(p.price)}</p>
            <p style={{ margin: '0 0 16px' }}><Stock p={p} /></p>
            <div style={{ display: isOwner ? 'none' : 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="qty">
                <button onClick={() => setQ(Math.max(1, qty - 1))} aria-label="Moins">−</button>
                <span>{qty}</span>
                <button onClick={() => setQ(Math.min(left, qty + 1))} aria-label="Plus">+</button>
              </div>
              <button className="btn" disabled={left < 1} onClick={() => { add(p, qty); onClose(); setOpen(true); }}>
                {p.stock < 1 ? 'Épuisé' : left < 1 ? 'Déjà tout dans le panier' : 'Ajouter au panier'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
