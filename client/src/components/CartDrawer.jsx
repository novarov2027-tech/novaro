import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { tnd } from '../api.js';

export default function CartDrawer() {
  const { items, open, setOpen, setQty, total, deliveryFee, refreshFee } = useCart();
  useEffect(() => { if (open) refreshFee(); }, [open]); // eslint-disable-line
  const nav = useNavigate();
  return (
    <aside className={'drawer' + (open ? ' on' : '')} aria-label="Panier" aria-hidden={!open}>
      <header>
        <h3>Votre panier</h3>
        <button className="ghost" onClick={() => setOpen(false)}>Fermer</button>
      </header>
      <div className="items">
        {items.length === 0 && <p className="empty">Votre panier est vide.</p>}
        {items.map((i) => (
          <div className="it" key={i.id}>
            <b>{i.name}</b>
            <span className="price">{tnd(i.price * i.qty)}</span>
            <button className="lnk" style={{ padding: 0, justifySelf: 'start' }} onClick={() => setQty(i.id, 0)} aria-label={`Retirer ${i.name} du panier`}>Annuler</button>
            <div className="qty">
              <button onClick={() => setQty(i.id, i.qty - 1)} aria-label="Moins">−</button>
              <span>{i.qty}</span>
              <button onClick={() => setQty(i.id, i.qty + 1)} disabled={i.qty >= i.stock} aria-label="Plus">+</button>
            </div>
          </div>
        ))}
      </div>
      {items.length > 0 && (
        <div className="foot">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mute)' }}><span>Sous-total</span><span>{tnd(total)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mute)' }}><span>Livraison</span><span>{deliveryFee > 0 ? tnd(deliveryFee) : 'Gratuite'}</span></div>
          <div className="tot" style={{ marginTop: 8 }}><span>Total</span><b className="price">{tnd(total + deliveryFee)}</b></div>
          <button className="btn" style={{ width: '100%' }} onClick={() => { setOpen(false); nav('/checkout'); }}>Commander</button>
        </div>
      )}
    </aside>
  );
}
