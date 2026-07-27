import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/index.js';

const AuthContext = createContext(null);
const STORE_KEY = 'flp_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supabaseAuth, setSupabaseAuth] = useState(false);

  useEffect(() => {
    // Restore any saved session immediately.
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setUser(JSON.parse(raw).user || null);
    } catch {}
    // Detect whether real Supabase auth is available on the server.
    api.config()
      .then((c) => setSupabaseAuth(c.authMode === 'supabase'))
      .catch(() => setSupabaseAuth(false))
      .finally(() => setLoading(false));
  }, []);

  function persist(session) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(session)); } catch {}
    setUser(session.user);
  }

  async function signIn(email, password) {
    if (supabaseAuth) {
      const res = await api.login({ email, password });
      persist({ user: res.user, token: res.token });
      return;
    }
    persist({ user: { email, name: email.split('@')[0], demo: true } });
  }

  async function signUp(email, password, name) {
    if (supabaseAuth) {
      const res = await api.signup({ email, password, name });
      persist({ user: res.user, token: res.token });
      return;
    }
    persist({ user: { email, name: name || email.split('@')[0], demo: true } });
  }

  async function signOut() {
    try { localStorage.removeItem(STORE_KEY); } catch {}
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, isDemo: !supabaseAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
