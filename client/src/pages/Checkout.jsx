import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, tnd } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Checkout() {
  const { user, refresh } = useAuth();
  const { items, total, clear, deliveryFee } = useCart();
  const [f, setF] = useState({ name: user.name || '', phone: user.phone || '', address: user.address || '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const o = await api('/api/orders', { method: 'POST', body: { customer: f, items: items.map((i) => ({ productId: i.id, qty: i.qty })) } });
      clear(); setOrder(o);
      refresh(); // the server remembered his name, phone and address for next time
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  if (order)
    return (
      <div className="page"><div className="modal narrow" style={{ margin: '0 auto' }}><div className="ok">
        <img className="blend" src="/mono.jpg" style={{ width: 90, margin: '0 auto 10px' }} alt="" />
        <h3 className="serif" style={{ fontSize: 34, margin: 0, color: 'var(--gold2)' }}>Merci pour votre commande</h3>
        <p style={{ color: 'var(--mute)' }}>Votre commande {order.orderNo} a bien été envoyée. Nous vous appelons très bientôt pour confirmer les détails.</p>
        <Link className="btn" to="/">Continuer mes achats</Link>
      </div></div></div>
    );
  if (!items.length)
    return <div className="page"><p className="empty">Votre panier est vide. <Link className="lnk" to="/">Retour à la boutique</Link></p></div>;

  return (
    <div className="page"><div className="modal narrow" style={{ margin: '0 auto' }}><form className="body" onSubmit={submit}>
      <h3>Finaliser la commande</h3>
      <div className="two">
        <div><label htmlFor="cn">Nom</label><input id="cn" value={f.name} onChange={set('name')} /></div>
        <div><label htmlFor="cp">Téléphone</label><input id="cp" type="tel" inputMode="numeric" value={f.phone} onChange={set('phone')} /></div>
      </div>
      <label htmlFor="ca">Adresse de livraison (facultatif)</label>
      <input id="ca" autoComplete="street-address" value={f.address} onChange={set('address')} />
      <p style={{ color: 'var(--mute)', margin: '10px 0 0', fontSize: 14 }}>Ces informations sont mémorisées pour votre prochaine commande. Vous pouvez les gérer dans « Mon compte ».</p>
      <p style={{ color: 'var(--mute)', margin: '10px 0 0' }}>Paiement à la livraison.</p>
      <div style={{ margin: '18px 0 0' }}>
        {items.map((i) => <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}><span>{i.name} x{i.qty}</span><span className="price">{tnd(i.price * i.qty)}</span></div>)}
      </div>
      <div className="err">{err}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mute)', marginTop: 10 }}><span>Sous-total</span><span>{tnd(total)}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mute)' }}><span>Livraison</span><span>{tnd(deliveryFee)}</span></div>
      <div className="tot" style={{ marginTop: 8 }}><span>Total</span><b className="price">{tnd(total + deliveryFee)}</b></div>
      <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Envoi…' : 'Confirmer la commande'}</button>
    </form></div></div>
  );
}
