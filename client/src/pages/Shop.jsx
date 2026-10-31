import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, tnd } from '../api.js';
import ProductModal, { Stock, Visual } from '../components/ProductModal.jsx';
import Hero from '../components/Hero.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// lower-case + strip accents so "cedre" finds "Cèdre"
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const SORTS = {
  default: 'Trier par',
  name: 'Nom (A à Z)',
  'price-asc': 'Prix croissant',
  'price-desc': 'Prix décroissant',
};

export default function Shop() {
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('default');
  const [shown, setShown] = useState(8);
  const [sel, setSel] = useState(null);
  const [err, setErr] = useState('');
  const loc = useLocation();
  const { add, inCart, setOpen } = useCart();
  const isOwner = useAuth().user?.role === 'owner'; // the owner only previews the shop
  const buy = (p) => { add(p, 1); setOpen(true); }; // adds one to the cart and opens it, ready for "Commander"
  // the "Explorer" button in the header links to /#shop
  useEffect(() => {
    if (loc.hash !== '#shop') return;
    const t = setTimeout(() => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }), 150);
    return () => clearTimeout(t);
  }, [loc]);

  useEffect(() => {
    Promise.all([api('/api/categories'), api('/api/products')])
      .then(([c, p]) => { setCats(c); setProducts(p); })
      .catch((e) => setErr(e.message));
  }, []);

  const list = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    const out = products.filter(
      (p) =>
        (cat === 'all' || p.category?.slug === cat) &&
        words.every((w) => norm(`${p.name} ${p.description} ${p.category?.name || ''}`).includes(w))
    );
    if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    if (sort === 'price-asc') out.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, 'fr'));
    if (sort === 'price-desc') out.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name, 'fr'));
    return out;
  }, [products, cat, q, sort]);

  return (
    <>
      <Hero />
      <div className="lead">
        <p>Diffuseurs, bougies et parfums d'intérieur, pensés pour la maison et la voiture.</p>
        <button className="btn" onClick={() => document.getElementById('shop').scrollIntoView()}>Voir la collection</button>
      </div>
      <main className="wrap" id="shop">
        <h2>La collection</h2>
        <p className="sub">Parcourez librement. Un compte est nécessaire uniquement pour commander.</p>
        {err && <p className="err">{err}</p>}
        <div className="pills" role="group" aria-label="Catégories">
          <button className="pill" aria-pressed={cat === 'all'} onClick={() => { setCat('all'); setShown(8); }}>Tout<small>{products.length}</small></button>
          {cats.map((c) => (
            <button key={c._id} className="pill" aria-pressed={cat === c.slug} onClick={() => { setCat(c.slug); setShown(8); }}>
              {c.name}<small>{c.count}</small>
            </button>
          ))}
        </div>

        <div className="tl" style={{ marginBottom: 22 }}>
          <input
            type="search"
            aria-label="Rechercher un produit"
            placeholder="Rechercher un produit"
            style={{ flex: '1 1 260px', maxWidth: 420 }}
            value={q}
            onChange={(e) => { setQ(e.target.value); setShown(8); }}
          />
          <select aria-label="Trier les produits" value={sort} onChange={(e) => { setSort(e.target.value); setShown(8); }}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {(q || sort !== 'default') && (
          <p className="sub" style={{ margin: '-8px 0 18px' }}>
            {list.length} produit{list.length > 1 ? 's' : ''}
            {q && <> pour « {q} »</>}
            {q && <button className="lnk" onClick={() => setQ('')}>Effacer</button>}
          </p>
        )}

        <div className="grid">
          {list.slice(0, shown).map((p) => (
            <article className="card" key={p._id}>
              <button className="vis" onClick={() => setSel(p)} aria-label={`Voir ${p.name}`}><Visual p={p} /></button>
              <div className="info">
                <h3>{p.name}</h3>
                <span className="price">{tnd(p.price)}</span>
                <Stock p={p} />
                <div className="row">
                  <button className="btn line sm" onClick={() => setSel(p)}>Détails</button>
                  {!isOwner && (
                    <button className="btn sm" onClick={() => buy(p)} disabled={p.stock < 1 || inCart(p._id) >= p.stock}>
                      {p.stock < 1 ? 'Épuisé' : inCart(p._id) >= p.stock ? 'Dans le panier' : 'Acheter'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
        {!list.length && !err && <p className="empty">Aucun produit trouvé. Essayez un autre mot ou une autre catégorie.</p>}
        {list.length > shown && <div className="more"><button className="btn line" onClick={() => setShown(shown + 8)}>Voir plus ({list.length - shown})</button></div>}
      </main>
      {sel && <ProductModal p={sel} onClose={() => setSel(null)} />}
    </>
  );
}
