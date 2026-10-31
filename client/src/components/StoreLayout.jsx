import { Link, Outlet } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { tnd } from '../api.js';
import CartDrawer from './CartDrawer.jsx';
import Social from './Social.jsx';

export default function StoreLayout() {
  const { count, total, open, setOpen } = useCart();
  return (
    <>
      <header>
        <div className="wrap bar">
          <Link to="/" className="brand" aria-label="Novaro, accueil">
            <img className="blend" src="/mono.jpg" alt="" />
            <span>NOVARO</span>
          </Link>
          <button className="ghost" onClick={() => setOpen(true)}>Panier<span className="count">{count}</span></button>
        </div>
      </header>
      <Outlet />
      <footer>
        <div className="wrap">
          <img className="blend" src="/logo.jpg" alt="Novaro" />
          <p className="serif" style={{ fontSize: 20, color: 'var(--ivory)' }}>Une fragrance, une émotion</p>
          <Social />
          <p>Monastir, Tunisie</p>
          <p>Paiement à la livraison</p>
        </div>
      </footer>
      <CartDrawer />
      {count > 0 && !open && (
        <button className="cartbar" onClick={() => setOpen(true)}>Voir le panier ({count}) · {tnd(total)}</button>
      )}
    </>
  );
}
