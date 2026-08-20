import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import BuyCreditsModal from '../billing/BuyCreditsModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AppLayout() {
  const { user, signOut, isDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const initials = (user?.name || user?.email || 'U').slice(0, 2).toUpperCase();

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [navOpen]);

  return (
    <div className="shell">
      <button
        type="button"
        className={`sidebar-backdrop${navOpen ? ' open' : ''}`}
        aria-label="Close menu"
        onClick={() => setNavOpen(false)}
      />
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="menu-btn"
            aria-label="Open menu"
            onClick={() => setNavOpen(true)}
          >
            ☰
          </button>
          <div className="search">Search clients, quotes, jobs…</div>
          <div className="spacer" />
          {isDemo && <span className="pill gold">Demo mode</span>}
          <div style={{ position: 'relative' }}>
            <div className="avatar" onClick={() => setMenu((m) => !m)}>{initials}</div>
            {menu && (
              <div className="card" style={{ position: 'absolute', right: 0, top: 44, width: 200, padding: 10, zIndex: 30 }}>
                <div style={{ fontSize: 13, fontWeight: 700, padding: '6px 8px' }}>{user?.email}</div>
                <button
                  className="btn ghost block sm"
                  onClick={async () => { await signOut(); navigate('/login'); setMenu(false); }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
      <BuyCreditsModal />
    </div>
  );
}
