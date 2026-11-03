import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import Social from '../../components/Social.jsx';

// Footer links: Facebook, Instagram and the WhatsApp / phone number shown to customers.
export default function SocialSettings() {
  const [f, setF] = useState({ facebook: '', instagram: '', whatsapp: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setMsg(''); };

  // show a Tunisian number without the +216 prefix
  const local = (n) => (n && n.startsWith('216') && n.length === 11 ? n.slice(3) : n || '');
  useEffect(() => {
    api('/api/settings/social').then((d) => setF({ ...d, whatsapp: local(d.whatsapp) })).catch((e) => setErr(e.message));
  }, []);

  const save = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    try {
      const d = await api('/api/admin/settings/social', { method: 'PUT', body: f });
      setF({ ...d, whatsapp: local(d.whatsapp) });
      setMsg('Enregistré. Les changements sont visibles en bas de la boutique.');
    } catch (x) { setErr(x.message); }
  };

  const digits = f.whatsapp.replace(/\D/g, '');
  const preview = { ...f, whatsapp: digits.length === 8 ? '216' + digits : digits };
  const toUrl = (v, base) => (!v.trim() ? '' : /^https?:\/\//i.test(v.trim()) ? v.trim() : base + v.trim().replace(/^@/, '').replace(/^\/+/, ''));
  preview.facebook = toUrl(f.facebook, 'https://www.facebook.com/');
  preview.instagram = toUrl(f.instagram, 'https://www.instagram.com/');

  return (
    <form style={{ maxWidth: 620 }} onSubmit={save}>
      <p className="sub" style={{ marginBottom: 14 }}>
        Ces liens apparaissent en bas de la boutique. Laissez un champ vide pour ne pas afficher l'icône correspondante.
      </p>
      <label htmlFor="sf">Facebook (lien de la page ou nom de la page)</label>
      <input id="sf" autoCapitalize="none" value={f.facebook} onChange={set('facebook')} />
      <label htmlFor="si">Instagram (lien du profil ou nom d'utilisateur)</label>
      <input id="si" autoCapitalize="none" value={f.instagram} onChange={set('instagram')} />
      <label htmlFor="sw">Numéro WhatsApp (affiché aux clients)</label>
      <input id="sw" type="tel" inputMode="numeric" value={f.whatsapp} onChange={set('whatsapp')} />
      <small style={{ color: 'var(--mute)' }}>8 chiffres pour la Tunisie : l'indicatif +216 est ajouté automatiquement.</small>

      <div style={{ margin: '22px 0 0', border: '1px solid var(--line)', background: '#000', padding: '8px 0' }}>
        <small style={{ color: 'var(--mute)', padding: '0 14px' }}>Aperçu</small>
        <Social links={preview} />
        {!preview.facebook && !preview.instagram && !preview.whatsapp && <p className="empty" style={{ padding: '8px 0' }}>Aucune icône pour le moment.</p>}
      </div>

      {err && <p className="err">{err}</p>}
      {msg && <p style={{ color: 'var(--gold2)' }}>{msg}</p>}
      <button className="btn" style={{ marginTop: 14 }}>Enregistrer</button>
    </form>
  );
}
