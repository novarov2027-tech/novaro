import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, tnd } from '../api.js';
import { useCart } from '../context/CartContext.jsx';

const KEY = 'nv_contact';
const saved = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const pretty = (n) => (n.startsWith('216') && n.length === 11 ? `+216 ${n.slice(3, 5)} ${n.slice(5, 8)} ${n.slice(8)}` : `+${n}`);

// Guest checkout: name + phone (address optional). The owner calls to confirm or cancel.
export default function Checkout() {
  const { items, total, clear, deliveryFee, refreshFee } = useCart();
  const [f, setF] = useState(() => ({ name: '', phone: '', address: '', ...saved() })); // remembered on this device
  const [hp, setHp] = useState(''); // honeypot: real people never see or fill it
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState(null);
  const [callNumber, setCallNumber] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => { refreshFee(); }, []); // eslint-disable-line
  useEffect(() => { api('/api/settings/social').then((d) => setCallNumber(d.whatsapp || '')).catch(() => {}); }, []);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const o = await api('/api/orders', { method: 'POST', body: { customer: f, items: items.map((i) => ({ productId: i.id, qty: i.qty })), website: hp } });
      try { localStorage.setItem(KEY, JSON.stringify(f)); } catch { /* private mode */ }
      clear(); setOrder(o);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  if (order)
    return (
      <div className="page"><div className="modal narrow" style={{ margin: '0 auto' }}><div className="ok">
        <img className="blend" src="/mono.jpg" style={{ width: 90, margin: '0 auto 10px' }} alt="" />
        <h3 className="serif" style={{ fontSize: 34, margin: 0, color: 'var(--gold2)' }}>Merci pour votre commande</h3>
        <p style={{ color: 'var(--mute)' }}>
          Votre commande <b style={{ color: 'var(--ivory)' }}>{order.orderNo}</b> a bien été envoyée. Nous vous appelons très bientôt pour la confirmer.
        </p>
        {callNumber && (
          <p style={{ color: 'var(--mute)' }}>
            Pour la modifier ou l’annuler, appelez-nous au <a className="lnk" style={{ padding: 0 }} href={`tel:+${callNumber}`}>{pretty(callNumber)}</a>.
          </p>
        )}
        <Link className="btn" to="/">Continuer mes achats</Link>
      </div></div></div>
    );
  if (!items.length)
    return <div className="page"><p className="empty">Votre panier est vide. <Link className="lnk" to="/">Retour à la boutique</Link></p></div>;

  return (
    <div className="page"><div className="modal narrow" style={{ margin: '0 auto' }}><form className="body" onSubmit={submit}>
      <h3>Finaliser la commande</h3>
      <p style={{ color: 'var(--mute)', margin: '0 0 4px' }}>Pas de compte à créer : indiquez votre nom et votre numéro, nous vous appelons pour confirmer.</p>
      <label htmlFor="cn">Nom</label>
      <input id="cn" autoComplete="name" value={f.name} onChange={set('name')} />
      <label htmlFor="cp">Téléphone</label>
      <input id="cp" type="tel" inputMode="numeric" autoComplete="tel" value={f.phone} onChange={set('phone')} />
      <label htmlFor="ca">Adresse de livraison (facultatif)</label>
      <input id="ca" autoComplete="street-address" value={f.address} onChange={set('address')} />
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={hp} onChange={(e) => setHp(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
      <div style={{ margin: '18px 0 0' }}>
        {items.map((i) => <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}><span>{i.name} x{i.qty}</span><span className="price">{tnd(i.price * i.qty)}</span></div>)}
      </div>
      <div className="err">{err}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mute)', marginTop: 10 }}><span>Sous-total</span><span>{tnd(total)}</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--mute)' }}><span>Livraison</span><span>{deliveryFee > 0 ? tnd(deliveryFee) : 'Gratuite'}</span></div>
      <div className="tot" style={{ marginTop: 8 }}><span>Total (paiement à la livraison)</span><b className="price">{tnd(total + deliveryFee)}</b></div>
      <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Envoi…' : 'Envoyer la commande'}</button>
    </form></div></div>
  );
}
