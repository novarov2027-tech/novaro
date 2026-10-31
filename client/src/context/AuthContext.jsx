import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/auth/me').then((d) => setUser(d.user)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const post = (path, body) => api(path, { method: 'POST', body });
  const signIn = async (path, body) => { const d = await post(path, body); setUser(d.user); return d.user; };

  const value = {
    user,
    loading,
    // step 1 of the login: the server says whether this username uses a password or an emailed code (owner)
    start: (username) => post('/api/auth/start', { username }),
    login: (username, password) => signIn('/api/auth/login', { username, password }),
    verify: (username, code) => signIn('/api/auth/owner/verify', { username, code }),
    register: (username, password) => signIn('/api/auth/register', { username, password }),
    refresh: () => api('/api/auth/me').then((d) => setUser(d.user)).catch(() => {}),
    updateProfile: async (data) => { const d = await api('/api/auth/profile', { method: 'PATCH', body: data }); setUser(d.user); return d.user; },
    logout: async () => { await post('/api/auth/logout'); setUser(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
