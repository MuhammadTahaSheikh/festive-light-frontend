import { useEffect, useState } from 'react';
import { PageHead, EmptyState } from '../../components/ui/index.js';
import { api } from '../../api/index.js';
import { SITE_HOME } from '../../config/site.js';

export default function Leads() {
  const [leads, setLeads] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.leads().then((d) => setLeads(d.leads || [])).catch((e) => { setErr(e.message); setLeads([]); });
  }, []);

  return (
    <div>
      <PageHead title="Leads" subtitle="Everyone who rendered a home or requested a call." />

      {leads === null && <div className="card"><span className="spin" /></div>}

      {leads && leads.length === 0 && (
        <EmptyState
          ico={'\u{1F465}'}
          title="No leads yet"
          action={<a href={SITE_HOME} className="btn">Open the render page</a>}
        >
          When someone uploads a photo and enters their email, they'll show up here automatically.
        </EmptyState>
      )}

      {leads && leads.length > 0 && (
        <div className="card card-table">
          <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Phone</th><th>Address</th><th>Source</th><th>When</th></tr>
            </thead>
            <tbody>
              {leads.map((l, i) => (
                <tr key={i}>
                  <td>{l.name || '—'}</td>
                  <td>{l.email || '—'}</td>
                  <td>{l.phone || '—'}</td>
                  <td>{l.address || '—'}</td>
                  <td><span className="pill">{l.source || 'widget'}</span></td>
                  <td className="muted">{l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
      {err && <p className="muted" style={{ marginTop: 12 }}>Could not load leads: {err}</p>}
    </div>
  );
}
