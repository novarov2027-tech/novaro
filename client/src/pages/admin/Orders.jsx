import { useCallback, useEffect, useState } from 'react';
import { api, tnd, fmtDate, fmtPhone, STATUS, download } from '../../api.js';
import Modal from '../../components/Modal.jsx';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ newCount: 0, total: 0, revenue: 0, lowStock: 0, closed: 0 });
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const [cancel, setCancel] = useState(null);
  const [msg, setMsg] = useState('');
  const [purge, setPurge] = useState(null); // { until, downloaded, busy, deleted }

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ ...(status && { status }), ...(q && { q }) });
    const [o, s] = await Promise.all([api('/api/admin/orders?' + qs), api('/api/admin/stats')]);
    setOrders(o); setStats(s);
    setSel((cur) => (cur ? o.find((x) => x._id === cur._id) || cur : cur));
  }, [status, q]);

  useEffect(() => { const t = setTimeout(() => load().catch(() => {}), 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { const t = setInterval(() => load().catch(() => {}), 15000); return () => clearInterval(t); }, [load]); // pick up new orders

  const setS = async (o, to) => {
    try { await api(`/api/admin/orders/${o._id}/status`, { method: 'PATCH', body: { status: to } }); setMsg(''); await load(); }
    catch (e) { setMsg(e.message); }
  };
  const phone = (o) => o.customer.phone;

  const openPurge = () => setPurge({ until: new Date().toISOString(), busy: false, deleted: null, err: '' });
  const fileUrl = (until) => `/api/admin/orders/export.xlsx?scope=closed&until=${encodeURIComponent(until)}`;
  // Exports the delivered + cancelled orders and, only once the file has been received, deletes exactly those orders.
  const exportAndClear = async () => {
    setPurge((p) => ({ ...p, busy: true, err: '' }));
    try {
      await download(fileUrl(purge.until), 'commandes-terminees.xlsx');
    } catch (e) {
      setPurge((p) => ({ ...p, busy: false, err: `Téléchargement impossible, rien n'a été supprimé. ${e.message}` }));
      return;
    }
    try {
      const r = await api(`/api/admin/orders/closed?until=${encodeURIComponent(purge.until)}`, { method: 'DELETE' });
      setPurge((p) => ({ ...p, busy: false, deleted: r.deleted }));
      await load();
    } catch (e) {
      setPurge((p) => ({ ...p, busy: false, err: `Le fichier est téléchargé, mais la suppression a échoué : ${e.message}` }));
    }
  };
  const exportOnly = () => download(fileUrl(purge.until), 'commandes-terminees.xlsx').catch((e) => setPurge((p) => ({ ...p, err: e.message })));

  return (
    <>
      <div className="stats">
        <div className="stat"><b>{stats.newCount}</b><span>Nouvelles commandes</span></div>
        <div className="stat"><b>{stats.total}</b><span>Commandes au total</span></div>
        <div className="stat"><b>{tnd(stats.revenue)}</b><span>Chiffre d'affaires</span></div>
      </div>
      <p className="sub" style={{ marginBottom: 14 }}>Historique de toutes les commandes, de la plus récente à la plus ancienne.</p>
      {msg && <p className="err">{msg}</p>}
      <div className="tl">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input type="search" aria-label="Rechercher une commande" placeholder="Rechercher un nom ou un numéro" style={{ width: 260 }} value={q} onChange={(e) => setQ(e.target.value)} />
          <select aria-label="Filtrer par statut" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--mute)' }}>{orders.length} commande{orders.length > 1 ? 's' : ''}</span>
          <button className="btn line sm" onClick={openPurge}>Exporter en Excel</button>
        </span>
      </div>
      <div className="tw"><table>
        <thead><tr><th>N°</th><th>Client</th><th>Date</th><th>Total</th><th>Statut</th><th /></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o._id} style={o.status === 'new' ? { background: '#15120a' } : undefined}>
              <td>{o.orderNo}</td>
              <td><span style={{ fontWeight: 500 }}>{o.customer.name}</span><br /><a className="lnk" style={{ padding: 0 }} href={`tel:+216${phone(o)}`}>{fmtPhone(phone(o))}</a></td>
              <td>{fmtDate(o.createdAt)}</td>
              <td className="price">{tnd(o.total)}</td>
              <td><select aria-label={`Statut ${o.orderNo}`} value={o.status} onChange={(e) => (e.target.value === 'cancelled' ? setCancel(o) : setS(o, e.target.value))}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {o.status === 'new' && <><button className="lnk" onClick={() => setS(o, 'confirmed')}>Confirmer</button><button className="lnk" onClick={() => setCancel(o)}>Annuler</button></>}
                <button className="lnk" onClick={() => setSel(o)}>Détails</button>
              </td>
            </tr>
          ))}
          {!orders.length && <tr><td colSpan="6" className="empty">Aucune commande.</td></tr>}
        </tbody>
      </table></div>

      {sel && (
        <Modal onClose={() => setSel(null)}>
          <div className="body">
            <h3>Commande {sel.orderNo}</h3>
            <p style={{ color: 'var(--mute)', margin: '0 0 16px' }}>Reçue le {fmtDate(sel.createdAt)}</p>
            <div style={{ border: '1px solid var(--line)', padding: '14px 16px', marginBottom: 16 }}>
              <div className="serif" style={{ fontSize: 26, lineHeight: 1.2 }}>{sel.customer.name}</div>
              <div className="price" style={{ fontSize: 20, margin: '2px 0 12px' }}>{fmtPhone(phone(sel))}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a className="btn sm" href={`tel:+216${phone(sel)}`}>Appeler</a>
                <a className="btn line sm" href={`https://wa.me/216${phone(sel)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              </div>
              <p style={{ margin: '12px 0 0', color: 'var(--mute)' }}>
                {[sel.customer.address, sel.customer.governorate].filter(Boolean).join(', ') || 'Adresse non renseignée'}
              </p>
            </div>
            {sel.items.map((i, k) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}><span>{i.name} x{i.qty}</span><span className="price">{tnd(i.price * i.qty)}</span></div>)}
            {sel.deliveryFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: 'var(--mute)' }}><span>Livraison</span><span>{tnd(sel.deliveryFee)}</span></div>}
            <div className="tot" style={{ marginTop: 12 }}><span>Total (paiement à la livraison)</span><b className="price">{tnd(sel.total)}</b></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
              {sel.status === 'new' && <button className="btn sm" onClick={() => setS(sel, 'confirmed')}>Confirmer la commande</button>}
              {!['cancelled', 'delivered'].includes(sel.status) && <button className="btn line sm" onClick={() => setCancel(sel)}>Annuler la commande</button>}
            </div>
            <label htmlFor="ost">Statut</label>
            <select id="ost" value={sel.status} onChange={(e) => (e.target.value === 'cancelled' ? setCancel(sel) : setS(sel, e.target.value))}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label>Historique de la commande</label>
            {sel.history.map((h, k) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 14 }}><span>{STATUS[h.status]}</span><span style={{ color: 'var(--mute)' }}>{fmtDate(h.at)}</span></div>)}
          </div>
        </Modal>
      )}

      {cancel && (
        <Modal onClose={() => setCancel(null)}>
          <div className="ok">
            <h3 className="serif" style={{ fontSize: 28, margin: '0 0 8px', color: 'var(--gold2)' }}>Annuler la commande {cancel.orderNo} ?</h3>
            <p style={{ color: 'var(--mute)' }}>Les produits seront remis en stock.</p>
            <button className="btn line" onClick={() => setCancel(null)}>Retour</button>{' '}
            <button className="btn" onClick={async () => { await setS(cancel, 'cancelled'); setCancel(null); }}>Annuler la commande</button>
          </div>
        </Modal>
      )}

      {purge && (
        <Modal onClose={() => setPurge(null)}>
          <div className="body">
            <h3>Exporter en Excel</h3>
            {purge.deleted === null ? (
              <>
                <p style={{ color: 'var(--mute)', margin: '0 0 14px' }}>
                  Le fichier contient les commandes <b style={{ color: 'var(--ivory)' }}>livrées</b> et <b style={{ color: 'var(--ivory)' }}>annulées</b> ({stats.closed}).
                  Dès que le fichier est téléchargé, ces commandes sont <b style={{ color: 'var(--ivory)' }}>supprimées de la base</b>.
                  Les commandes nouvelles, confirmées ou expédiées sont conservées.
                </p>
                <button className="btn" style={{ width: '100%' }} onClick={exportAndClear} disabled={purge.busy || stats.closed === 0}>
                  {purge.busy ? 'Export en cours…' : `Exporter et supprimer ${stats.closed} commande${stats.closed > 1 ? 's' : ''}`}
                </button>
                {stats.closed === 0 && <p className="empty" style={{ padding: '10px 0 0' }}>Aucune commande terminée à exporter.</p>}
                {purge.err && <div className="err">{purge.err}</div>}
                <p style={{ textAlign: 'center', margin: '14px 0 0' }}>
                  <button className="lnk" onClick={exportOnly} disabled={stats.closed === 0}>Télécharger sans supprimer</button>
                </p>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--gold2)' }}>Fichier téléchargé. {purge.deleted} commande{purge.deleted > 1 ? 's' : ''} supprimée{purge.deleted > 1 ? 's' : ''} de la base.</p>
                <button className="btn" onClick={() => setPurge(null)}>Fermer</button>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
