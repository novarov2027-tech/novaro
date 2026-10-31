import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const TABS = [['/admin', 'Commandes', true], ['/admin/products', 'Produits'], ['/admin/categories', 'Catégories'], ['/admin/banner', 'Bannière']];

export default function AdminLayout() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const style = ({ isActive }) => ({ color: isActive ? 'var(--gold2)' : undefined, borderColor: isActive ? 'var(--gold)' : undefined, textDecoration: 'none' });
  return (
    <div className="adm">
      <div className="atop">
        <div className="brand"><img className="blend" src="/mono.jpg" alt="" /><span>NOVARO</span></div>
        <div className="actions">
          <Link className="btn sm" to="/">Vue boutique</Link>
          <button className="ghost" onClick={async () => { await logout(); nav('/'); }}>Déconnexion</button>
        </div>
      </div>
      <div className="tabs" role="tablist" style={{ marginBottom: 18 }}>
        {TABS.map(([to, label, end]) => <NavLink key={to} end={!!end} to={to} className="tab" style={style}>{label}</NavLink>)}
      </div>
      <Outlet />
    </div>
  );
}
