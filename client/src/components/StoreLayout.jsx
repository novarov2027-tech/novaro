import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import CartDrawer from './CartDrawer.jsx';
import Social from './Social.jsx';

export default function StoreLayout() {
  const { user, logout } = useAuth();
  const { count, setOpen } = useCart();
  const nav = useNavigate();
  const isOwner = user?.role === 'owner';
  return (
    <>
      <header>
        <div className="wrap bar">
          <Link to="/" className="brand" aria-label="Novaro, accueil">
            <img className="blend" src="/mono.jpg" alt="" />
            <span>NOVARO</span>
          </Link>
          <nav className="nav">
            <Link className="btn sm" to="/#shop">Explorer</Link>
            {isOwner && <Link className="btn line sm" to="/admin">Vue admin</Link>}
            {user && !isOwner && <><Link className="ghost" to="/account">Mon compte</Link><Link className="ghost" to="/orders">Mes commandes</Link></>}
            {user ? (
              <button className="ghost" onClick={async () => { await logout(); nav('/'); }}>Déconnexion</button>
            ) : (
              <Link className="ghost" to="/login">Se connecter</Link>
            )}
            {!isOwner && <button className="ghost" onClick={() => setOpen(true)}>Panier<span className="count">{count}</span></button>}
          </nav>
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
    </>
  );
}
