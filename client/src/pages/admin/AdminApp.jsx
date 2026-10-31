import { AuthProvider, useAuth } from '../../context/AuthContext.jsx';
import AdminLayout from './AdminLayout.jsx';
import AdminLogin from './AdminLogin.jsx';

// /admin: the login screen, or the admin once the owner has entered his emailed code.
function Gate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user?.role === 'owner' ? <AdminLayout /> : <AdminLogin />;
}

export default function AdminApp() {
  return <AuthProvider><Gate /></AuthProvider>;
}
