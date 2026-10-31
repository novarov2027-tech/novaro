import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import Modal from '../../components/Modal.jsx';

export default function Categories() {
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [del, setDel] = useState(null);
  const [err, setErr] = useState('');

  const load = () => Promise.all([api('/api/categories'), api('/api/admin/products')]).then(([c, p]) => { setCats(c); setProducts(p); });
  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  const count = (c) => products.filter((p) => p.category?._id === c._id).length;
  const loose = products.filter((p) => !p.category).length;

  const add = async (e) => {
    e.preventDefault(); setErr('');
    try { await api('/api/admin/categories', { method: 'POST', body: { name } }); setName(''); await load(); }
    catch (x) { setErr(x.message); }
  };
  const remove = async () => {
    try { await api(`/api/admin/categories/${del._id}`, { method: 'DELETE' }); setDel(null); await load(); }
    catch (x) { setErr(x.message); setDel(null); }
  };

  return (
    <>
      <p className="sub" style={{ marginBottom: 14 }}>
        Si vous supprimez une catégorie, ses produits ne sont pas effacés : ils restent dans la boutique sous « Tout ».
      </p>
      <form className="tl" onSubmit={add} style={{ justifyContent: 'flex-start' }}>
        <input aria-label="Nom de la nouvelle catégorie" placeholder="Nouvelle catégorie" style={{ width: 280 }} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn sm">Ajouter</button>
      </form>
      {err && <p className="err">{err}</p>}
      <div className="tw"><table>
        <thead><tr><th>Catégorie</th><th>Produits</th><th /></tr></thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c._id}>
              <td>{c.name}</td><td>{count(c)}</td>
              <td><button className="lnk" onClick={() => setDel(c)}>Supprimer</button></td>
            </tr>
          ))}
          <tr><td style={{ color: 'var(--mute)' }}>Sans catégorie (visibles dans Tout)</td><td>{loose}</td><td /></tr>
        </tbody>
      </table></div>

      {del && (
        <Modal onClose={() => setDel(null)}>
          <div className="ok">
            <h3 className="serif" style={{ fontSize: 28, margin: '0 0 8px', color: 'var(--gold2)' }}>Supprimer « {del.name} » ?</h3>
            <p style={{ color: 'var(--mute)' }}>
              {count(del) > 0
                ? `Les ${count(del)} produit${count(del) > 1 ? 's' : ''} de cette catégorie resteront dans la boutique sous « Tout ».`
                : 'Cette catégorie ne contient aucun produit.'}
            </p>
            <button className="btn line" onClick={() => setDel(null)}>Annuler</button>{' '}
            <button className="btn" onClick={remove}>Supprimer</button>
          </div>
        </Modal>
      )}
    </>
  );
}
