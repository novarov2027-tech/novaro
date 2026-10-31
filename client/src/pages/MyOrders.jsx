import { useEffect, useState } from 'react';
import { api, tnd, fmtDate, STATUS } from '../api.js';
import Modal from '../components/Modal.jsx';

const CLOSED = ['delivered', 'cancelled'];

export default function MyOrders() {
  const [orders, setOrders] = useState(null);
  const [ask, setAsk] = useState(null); // order to cancel
  const [clr, setClr] = useState(null); // 'all' | order to clear from the list
  const [err, setErr] = useState('');

  const load = () => api('/api/orders/mine').then(setOrders).catch(() => setOrders([]));
  useEffect(() => { load(); }, []);
  const closed = (orders || []).filter((o) => CLOSED.includes(o.status));

  const cancel = async () => {
    setErr('');
    try { await api(`/api/orders/${ask._id}/cancel`, { method: 'POST' }); setAsk(null); await load(); }
    catch (e) { setErr(e.message); setAsk(null); await load(); }
  };
  const clear = async () => {
    setErr('');
    try { await api('/api/orders/mine/clear', { method: 'POST', body: clr === 'all' ? {} : { id: clr._id } }); }
    catch (e) { setErr(e.message); }
    setClr(null); await load();
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Mes commandes</h2>
        {closed.length > 0 && <button className="btn line sm" onClick={() => setClr('all')}>Effacer les commandes terminées et annulées ({closed.length})</button>}
      </div>
      {err && <p className="err">{err}</p>}
      {orders && !orders.length && <p className="empty">Aucune commande pour le moment.</p>}
      {orders?.map((o) => (
        <div key={o._id} style={{ border: '1px solid var(--line)', background: 'var(--panel)', padding: 16, margin: '14px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <b>{o.orderNo}</b>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={'status ' + o.status}>{STATUS[o.status]}</span>
              {o.status === 'new' && <button className="btn line sm" onClick={() => setAsk(o)}>Annuler</button>}
              {CLOSED.includes(o.status) && <button className="lnk" onClick={() => setClr(o)}>Effacer</button>}
            </span>
          </div>
          <small style={{ color: 'var(--mute)' }}>{fmtDate(o.createdAt)}</small>
          {o.items.map((i, k) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>{i.name} x{i.qty}</span><span>{tnd(i.price * i.qty)}</span></div>)}
          {o.deliveryFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--mute)' }}><span>Livraison</span><span>{tnd(o.deliveryFee)}</span></div>}
          <div className="tot" style={{ margin: '8px 0 0' }}><span>Total</span><b className="price">{tnd(o.total)}</b></div>
        </div>
      ))}

      {ask && (
        <Modal onClose={() => setAsk(null)}>
          <div className="ok">
            <h3 className="serif" style={{ fontSize: 28, margin: '0 0 8px', color: 'var(--gold2)' }}>Annuler la commande {ask.orderNo} ?</h3>
            <p style={{ color: 'var(--mute)' }}>Les produits seront remis en stock. Cette action est définitive.</p>
            <button className="btn line" onClick={() => setAsk(null)}>Retour</button>{' '}
            <button className="btn" onClick={cancel}>Annuler la commande</button>
          </div>
        </Modal>
      )}
      {clr && (
        <Modal onClose={() => setClr(null)}>
          <div className="ok">
            <h3 className="serif" style={{ fontSize: 28, margin: '0 0 8px', color: 'var(--gold2)' }}>
              {clr === 'all' ? 'Effacer ces commandes ?' : `Effacer la commande ${clr.orderNo} ?`}
            </h3>
            <p style={{ color: 'var(--mute)' }}>
              {clr === 'all' ? `Les ${closed.length} commandes livrées ou annulées` : 'Cette commande'} disparaîtront de votre liste. Les commandes en cours ne sont pas touchées.
            </p>
            <button className="btn line" onClick={() => setClr(null)}>Retour</button>{' '}
            <button className="btn" onClick={clear}>Effacer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
