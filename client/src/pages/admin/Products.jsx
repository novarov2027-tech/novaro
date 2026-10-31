import { useEffect, useState } from 'react';
import { api, tnd, imgs } from '../../api.js';
import Modal from '../../components/Modal.jsx';

const EMPTY = { name: '', category: '', price: '', stock: 10, description: '', images: [], isActive: true };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => Promise.all([api('/api/admin/products'), api('/api/categories')]).then(([p, c]) => { setProducts(p); setCats(c); });
  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  const patch = async (p, body) => { try { await api(`/api/admin/products/${p._id}`, { method: 'PATCH', body }); await load(); } catch (e) { setErr(e.message); } };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const upload = async (files) => {
    const list = [...files].slice(0, 6 - (form.images?.length || 0));
    if (!list.length) return;
    setErr(''); setBusy(true);
    try {
      for (const file of list) {
        const fd = new FormData(); fd.append('image', file);
        const { url } = await api('/api/admin/upload', { method: 'POST', form: fd });
        setForm((f) => ({ ...f, images: [...(f.images || []), url] }));
      }
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const cover = (k) => setForm((f) => ({ ...f, images: [f.images[k], ...f.images.filter((_, j) => j !== k)] }));
  const drop = (k) => setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== k) }));
  const save = async () => {
    setErr('');
    try {
      const body = { ...form, category: form.category || '' };
      await api(form._id ? `/api/admin/products/${form._id}` : '/api/admin/products', { method: form._id ? 'PUT' : 'POST', body });
      setForm(null); await load();
    } catch (e) { setErr(e.message); }
  };

  const list = products.filter((p) => !filter || (filter === 'none' ? !p.category : p.category?._id === filter));
  return (
    <>
      {err && <p className="err">{err}</p>}
      <div className="tl">
        <select aria-label="Catégorie" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Toutes les catégories</option>
          <option value="none">Sans catégorie</option>
          {cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <button className="btn sm" onClick={() => { setErr(''); setForm({ ...EMPTY, category: filter && filter !== 'none' ? filter : '' }); }}>Nouveau produit</button>
      </div>
      <div className="tw"><table className="stack prods">
        <thead><tr><th /><th>Produit</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Visible</th><th /></tr></thead>
        <tbody>
          {list.map((p) => (
            <tr key={p._id}>
              <td>{imgs(p)[0] ? <img className="thumb" src={imgs(p)[0]} alt="" /> : <img className="thumb blend" src="/mono.jpg" alt="" />}</td>
              <td>{p.name}</td><td>{p.category?.name || <span style={{ color: 'var(--mute)' }}>Sans catégorie</span>}</td><td className="price">{tnd(p.price)}</td>
              <td><input type="number" min="0" aria-label={`Stock ${p.name}`} defaultValue={p.stock} key={p.stock}
                style={{ width: 76, padding: '6px 8px', borderColor: p.stock <= 3 ? '#e58a7a' : undefined }}
                onBlur={(e) => e.target.value !== String(p.stock) && patch(p, { stock: e.target.value })} /></td>
              <td><input type="checkbox" style={{ width: 'auto' }} checked={p.isActive} aria-label="Visible dans la boutique" onChange={(e) => patch(p, { isActive: e.target.checked })} /></td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="lnk" onClick={() => { setErr(''); setForm({ ...p, category: p.category?._id || '', images: imgs(p) }); }}>Modifier</button>
                <button className="lnk" onClick={() => setDel(p)}>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>

      {form && (
        <Modal onClose={() => setForm(null)}>
          <div className="body">
            <h3>{form._id ? 'Modifier le produit' : 'Nouveau produit'}</h3>
            <label htmlFor="pn">Nom</label><input id="pn" value={form.name} onChange={set('name')} />
            <div className="two">
              <div><label htmlFor="pc">Catégorie</label><select id="pc" value={form.category} onChange={set('category')}><option value="">Sans catégorie (affiché dans Tout)</option>{cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
              <div><label htmlFor="pp">Prix (DT)</label><input id="pp" type="number" min="0" step="0.5" value={form.price} onChange={set('price')} /></div>
            </div>
            <label htmlFor="ps">Stock (quantité disponible)</label><input id="ps" type="number" min="0" step="1" value={form.stock} onChange={set('stock')} />
            <label htmlFor="pd">Description</label><input id="pd" value={form.description} onChange={set('description')} />
            <label htmlFor="pi">Photos (jusqu'à 6, la première est la photo principale)</label>
            <input id="pi" type="file" accept="image/*" multiple disabled={busy || (form.images?.length || 0) >= 6} onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
            {busy && <small style={{ color: 'var(--mute)' }}>Envoi des photos…</small>}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
              {(form.images || []).map((u, k) => (
                <div key={u} style={{ width: 84 }}>
                  <img className="thumb" style={{ width: 84, height: 105, outline: k === 0 ? '2px solid var(--gold)' : 'none' }} src={u} alt="" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    {k === 0 ? <span style={{ color: 'var(--gold2)' }}>Principale</span> : <button type="button" className="lnk" style={{ padding: 0, fontSize: 12 }} onClick={() => cover(k)}>Principale</button>}
                    <button type="button" className="lnk" style={{ padding: 0, fontSize: 12 }} onClick={() => drop(k)}>Retirer</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="err">{err}</div>
            <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={save} disabled={busy}>Enregistrer</button>
          </div>
        </Modal>
      )}
      {del && (
        <Modal onClose={() => setDel(null)}>
          <div className="ok">
            <h3 className="serif" style={{ fontSize: 28, margin: '0 0 8px', color: 'var(--gold2)' }}>Supprimer ce produit ?</h3>
            <p style={{ color: 'var(--mute)' }}>{del.name} sera retiré de la boutique. Pour le garder sans l'afficher, décochez "Visible".</p>
            <button className="btn line" onClick={() => setDel(null)}>Annuler</button>{' '}
            <button className="btn" onClick={async () => { await api(`/api/admin/products/${del._id}`, { method: 'DELETE' }); setDel(null); load(); }}>Supprimer</button>
          </div>
        </Modal>
      )}
    </>
  );
}
