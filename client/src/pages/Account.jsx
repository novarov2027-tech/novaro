import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// "Mon compte": the customer keeps his name, phone and address here. They pre-fill the order form.
export default function Account() {
  const { user, updateProfile } = useAuth();
  const [f, setF] = useState({ name: user.name || '', phone: user.phone || '', address: user.address || '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setMsg(''); };
  const remove = (k) => () => { setF({ ...f, [k]: '' }); setMsg(''); };

  const save = async (e) => {
    e.preventDefault(); setErr(''); setMsg(''); setBusy(true);
    try {
      const u = await updateProfile(f);
      setF({ name: u.name || '', phone: u.phone || '', address: u.address || '' });
      setMsg('Vos informations sont enregistrées.');
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  const Label = ({ htmlFor, children, field }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <label htmlFor={htmlFor}>{children}</label>
      {f[field] && <button type="button" className="lnk" style={{ padding: 0, fontSize: 14 }} onClick={remove(field)}>Retirer</button>}
    </div>
  );

  return (
    <div className="page">
      <h2>Mon compte</h2>
      <p className="sub">Identifiant : <b style={{ color: 'var(--ivory)' }}>{user.username}</b> · <Link className="lnk" to="/orders">Mes commandes</Link></p>
      <form className="modal narrow" style={{ margin: 0, width: '100%' }} onSubmit={save}>
        <div className="body">
          <p style={{ color: 'var(--mute)', margin: '0 0 6px' }}>
            Ces informations remplissent automatiquement votre commande. Pour en supprimer une, appuyez sur « Retirer » puis sur « Enregistrer ».
          </p>
          <Label htmlFor="an" field="name">Nom</Label>
          <input id="an" autoComplete="name" value={f.name} onChange={set('name')} />
          <Label htmlFor="ap" field="phone">Téléphone</Label>
          <input id="ap" type="tel" inputMode="numeric" autoComplete="tel" placeholder="55 123 456" value={f.phone} onChange={set('phone')} />
          <Label htmlFor="aa" field="address">Adresse de livraison</Label>
          <input id="aa" autoComplete="street-address" value={f.address} onChange={set('address')} />
          {err && <div className="err">{err}</div>}
          {msg && <p style={{ color: 'var(--gold2)', margin: '12px 0 0' }}>{msg}</p>}
          <button className="btn" style={{ width: '100%', marginTop: 14 }} disabled={busy}>Enregistrer</button>
        </div>
      </form>
    </div>
  );
}
