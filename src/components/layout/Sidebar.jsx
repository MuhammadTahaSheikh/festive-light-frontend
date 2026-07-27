import { NavLink } from 'react-router-dom';
import { useCredits } from '../../context/CreditsContext.jsx';
import { SITE_HOME } from '../../config/site.js';
import '../../components/billing/buy-credits.css';

const GROUPS = [
  {
    label: 'Daily',
    items: [
      { to: '/', end: true, ico: '\u25A6', name: 'Overview' },
      { to: '/campaigns', ico: '\u2709', name: 'Outreach' },
      { to: '/leads', ico: '\u{1F465}', name: 'Leads' },
      { to: '/portal', ico: '\u25A3', name: 'Portal' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { to: '/quotes', ico: '$', name: 'Quotes' },
      { to: '/jobs', ico: '\u{1F528}', name: 'Jobs' },
      { to: '/schedule', ico: '\u{1F4C5}', name: 'Schedule' },
      { to: '/templates', ico: '\u25A4', name: 'Templates' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/settings', ico: '\u2699', name: 'Settings' },
      { to: '/billing', ico: '\u25A0', name: 'Billing' },
    ],
  },
];

export default function Sidebar({ open = false, onClose }) {
  const { balance, lowBalance, lowBalanceThreshold, loading, openBuyCredits } = useCredits();

  return (
    <aside className={'sidebar' + (open ? ' open' : '')}>
      <a className="brand" href={SITE_HOME} title="Back to main site">
        <div className="logo">{'\u{1F4A1}'}</div>
        <div className="name">
          Festive Lighting Pros
          <small>Permanent · Landscape · Holiday</small>
        </div>
      </a>

      <nav style={{ overflowY: 'auto', flex: 1 }}>
        {GROUPS.map((g) => (
          <div className="nav-group" key={g.label}>
            <div className="label">{g.label}</div>
            {g.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
                onClick={() => onClose?.()}
              >
                <span className="ico">{it.ico}</span>
                <span>{it.name}</span>
                {it.soon && <span className="soon">SOON</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-credits">
        <div className="bal">
          <span>Credits</span>
          <span>{loading ? '…' : (balance ?? 0).toLocaleString()}</span>
        </div>
        {lowBalance && !loading && (
          <div className="warn">Low balance — {balance} credits left (threshold {lowBalanceThreshold})</div>
        )}
        <button type="button" className="btn sm block" onClick={openBuyCredits}>
          Buy Credits
        </button>
      </div>
    </aside>
  );
}
