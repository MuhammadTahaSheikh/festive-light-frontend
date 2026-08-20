import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHead, StatCard, money } from '../../components/ui/index.js';
import { api } from '../../api/index.js';
import { SITE_HOME } from '../../config/site.js';

function MiniChart({ points }) {
  const w = 640;
  const h = 180;
  const max = Math.max(1, ...points);
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - (p / max) * (h - 20) - 10}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 180 }} preserveAspectRatio="none">
      <path d={path} fill="none" stroke="var(--gold)" strokeWidth="2.5" />
      <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill="rgba(244,147,33,0.08)" stroke="none" />
    </svg>
  );
}

export default function Overview() {
  const [leads, setLeads] = useState([]);
  const [renders, setRenders] = useState([]);

  useEffect(() => {
    api.leads().then((d) => setLeads(d.leads || [])).catch(() => {});
    api.renders().then((d) => setRenders(d.renders || [])).catch(() => {});
  }, []);

  const quoted = renders.reduce((sum, r) => sum + (Number(r.estimated_total) || 0), 0);

  return (
    <div>
      <PageHead title="Overview" subtitle="Your leads, renders, and quotes at a glance.">
        <Link to="/campaigns" className="btn">+ New campaign</Link>
      </PageHead>

      <div className="stat-grid">
        <StatCard k="Leads" v={leads.length} s="captured" accent="var(--blue)" />
        <StatCard k="Renders" v={renders.length} s="homes lit up" accent="var(--gold)" />
        <StatCard k="Quoted" v={money(quoted)} s="estimated value" accent="var(--green)" />
        <StatCard k="Closed" v="$0" s="0 deposits" accent="var(--red)" />
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 700 }}>Performance overview</div>
          <div style={{ flex: 1 }} />
          <span className="pill">Last 90 days</span>
        </div>
        <MiniChart points={[1, 2, 1, 3, 2, 4, 3, 5, Math.max(1, leads.length)]} />
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Recent leads</div>
        {leads.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No leads yet. Share your <a href={SITE_HOME} style={{ color: 'var(--gold)' }}>render page</a> to start collecting them.</p>
        ) : (
          <div className="table-scroll">
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Address</th><th>Source</th></tr></thead>
            <tbody>
              {leads.slice(0, 5).map((l, i) => (
                <tr key={i}>
                  <td>{l.name || '—'}</td>
                  <td>{l.email || '—'}</td>
                  <td>{l.address || '—'}</td>
                  <td><span className="pill">{l.source || 'widget'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
