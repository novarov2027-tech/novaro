import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import Hero from '../../components/Hero.jsx';

export default function Banner() {
  const [images, setImages] = useState([]);
  const [interval, setSec] = useState(3);
  const [mainSec, setMainSec] = useState(10);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/api/settings/hero').then((d) => { setImages(d.images); setSec(d.interval); setMainSec(d.mainInterval); }).catch((e) => setErr(e.message));
  }, []);

  const upload = async (files) => {
    const list = [...files].slice(0, 10 - images.length);
    if (!list.length) return;
    setErr(''); setMsg(''); setBusy(true);
    try {
      for (const file of list) {
        const fd = new FormData(); fd.append('image', file);
        const { url } = await api('/api/admin/upload?kind=hero', { method: 'POST', form: fd });
        setImages((cur) => [...cur, url]);
      }
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const move = (k, d) => setImages((cur) => { const a = [...cur], j = k + d; if (j < 0 || j >= a.length) return a; [a[k], a[j]] = [a[j], a[k]]; return a; });
  const drop = (k) => setImages((cur) => cur.filter((_, j) => j !== k));
  const save = async () => {
    setErr(''); setMsg('');
    try {
      const d = await api('/api/admin/settings/hero', { method: 'PUT', body: { images, interval, mainInterval: mainSec } });
      setImages(d.images); setSec(d.interval); setMainSec(d.mainInterval); setMsg('Bannière enregistrée. Elle est visible dans la boutique.');
    } catch (e) { setErr(e.message); }
  };

  return (
    <>
      <p className="sub" style={{ marginBottom: 14 }}>
        Ajoutez jusqu'à 10 images pour l'en-tête de la boutique. Avec plusieurs images, elles défilent automatiquement.
        Sans image, la bannière Novaro par défaut est utilisée.
      </p>
      <div style={{ maxWidth: 760, marginBottom: 22 }}>
        <small style={{ color: 'var(--mute)' }}>Aperçu</small>
        <Hero images={images.length ? images : ['/banner.jpg']} interval={Number(interval) || 3} mainInterval={Number(mainSec) || 10} />
      </div>

      <div style={{ maxWidth: 760 }}>
        <div className="two">
          <div><label htmlFor="bm">Image principale (la première), en secondes</label>
            <input id="bm" type="number" min="2" max="60" step="1" value={mainSec} onChange={(e) => setMainSec(e.target.value)} /></div>
          <div><label htmlFor="bs">Autres images, en secondes</label>
            <input id="bs" type="number" min="2" max="60" step="1" value={interval} onChange={(e) => setSec(e.target.value)} /></div>
        </div>
        <p className="sub" style={{ margin: '8px 0 0', fontSize: 14 }}>La première image de la liste est l'image principale : elle reste affichée plus longtemps que les autres. Utilisez les flèches pour la choisir.</p>

        <label htmlFor="bi">Images ({images.length}/10). Format conseillé : horizontal, environ 1600 × 600 px.</label>
        <input id="bi" type="file" accept="image/*" multiple disabled={busy || images.length >= 10} onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
        {busy && <small style={{ color: 'var(--mute)' }}>Envoi des images…</small>}

        <div style={{ marginTop: 12 }}>
          {images.map((u, k) => (
            <div key={k + u} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <img src={u} alt="" style={{ width: 160, height: 60, objectFit: 'cover', background: '#111' }} />
              <span style={{ flex: 1 }}>Image {k + 1}</span>
              <button type="button" className="lnk" disabled={k === 0} onClick={() => move(k, -1)} aria-label="Monter">↑</button>
              <button type="button" className="lnk" disabled={k === images.length - 1} onClick={() => move(k, 1)} aria-label="Descendre">↓</button>
              <button type="button" className="lnk" onClick={() => drop(k)}>Retirer</button>
            </div>
          ))}
        </div>

        {err && <p className="err">{err}</p>}
        {msg && <p style={{ color: 'var(--gold2)' }}>{msg}</p>}
        <button className="btn" style={{ marginTop: 14 }} onClick={save} disabled={busy}>Enregistrer</button>
      </div>
    </>
  );
}
