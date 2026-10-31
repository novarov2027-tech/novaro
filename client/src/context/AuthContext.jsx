import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

// Used by the admin only (there are no customer accounts).
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/auth/me').then((d) => setUser(d.user)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const value = {
    user,
    loading,
    // step 1: the server emails a 6-digit code to the owner (same answer for any username)
    start: (username) => api('/api/auth/start', { method: 'POST', body: { username } }),
    // step 2: username + code
    verify: async (username, code) => {
      const d = await api('/api/auth/owner/verify', { method: 'POST', body: { username, code } });
      setUser(d.user);
      return d.user;
    },
    logout: async () => { await api('/api/auth/logout', { method: 'POST' }); setUser(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
