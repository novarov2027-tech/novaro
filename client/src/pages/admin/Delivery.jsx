import { useEffect, useState } from 'react';
import { api, tnd } from '../../api.js';

export default function Delivery() {
  const [fee, setFee] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/api/settings/shop').then((d) => setFee(String(d.deliveryFee))).catch((e) => setErr(e.message));
  }, []);

  const save = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    try {
      const d = await api('/api/admin/settings/shop', { method: 'PUT', body: { deliveryFee: fee } });
      setFee(String(d.deliveryFee));
      setMsg(`Frais de livraison enregistrés : ${d.deliveryFee > 0 ? tnd(d.deliveryFee) : 'livraison gratuite'}.`);
    } catch (x) { setErr(x.message); }
  };

  return (
    <form style={{ maxWidth: 520 }} onSubmit={save}>
      <p className="sub" style={{ marginBottom: 14 }}>
        Ce montant est ajouté à chaque commande. Le changement s'applique aux <b style={{ color: 'var(--ivory)' }}>nouvelles commandes</b> :
        les commandes déjà envoyées gardent leur montant. Mettez 0 pour une livraison gratuite.
      </p>
      <label htmlFor="df">Frais de livraison (DT)</label>
      <input id="df" type="number" min="0" max="1000" step="0.5" inputMode="decimal" style={{ width: 180 }} value={fee} onChange={(e) => { setFee(e.target.value); setMsg(''); }} />
      {err && <p className="err">{err}</p>}
      {msg && <p style={{ color: 'var(--gold2)' }}>{msg}</p>}
      <button className="btn" style={{ marginTop: 14 }}>Enregistrer</button>
    </form>
  );
}
