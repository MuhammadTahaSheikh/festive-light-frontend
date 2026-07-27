import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHead, EmptyState } from '../../components/ui/index.js';
import { api } from '../../api/index.js';

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState(null);
  const [renders, setRenders] = useState([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.campaigns().then((d) => setCampaigns(d.campaigns || [])).catch(() => setCampaigns([]));
    api.renders().then((d) => setRenders(d.renders || [])).catch(() => {});
  }
  useEffect(load, []);

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await api.createCampaign({ name, area });
      setName('');
      setArea('');
      setCreating(false);
      if (res.campaign?.id) navigate(`/campaigns/${res.campaign.id}`);
      else load();
    } finally {
      setBusy(false);
    }
  }

  const quoted = renders.reduce((sum, r) => sum + (Number(r.estimated_total) || 0), 0);

  return (
    <div>
      <PageHead title="Outreach" subtitle="Select houses on the map, load a batch, and make quotes.">
        <button className="btn" onClick={() => setCreating((c) => !c)}>+ New campaign</button>
      </PageHead>

      {creating && (
        <form className="card form-inline" style={{ marginBottom: 16 }} onSubmit={create}>
          <div>
            <label className="field" style={{ marginTop: 0 }}>Campaign name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lakewood Ranch — October" autoFocus />
          </div>
          <div>
            <label className="field" style={{ marginTop: 0 }}>Area / neighborhood</label>
            <input className="input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Lakewood Ranch, FL" />
          </div>
          <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>
        </form>
      )}

      <div className="stat-grid">
        <div className="stat-card" style={{ '--accent': 'var(--gold)' }}><div className="k">Quoted</div><div className="v">${quoted.toLocaleString()}</div><div className="s">{renders.length} renders</div></div>
        <div className="stat-card" style={{ '--accent': 'var(--blue)' }}><div className="k">Campaigns</div><div className="v">{campaigns?.length ?? '—'}</div><div className="s">active</div></div>
        <div className="stat-card" style={{ '--accent': 'var(--green)' }}><div className="k">Interested</div><div className="v">0</div><div className="s">0 marked</div></div>
        <div className="stat-card" style={{ '--accent': 'var(--red)' }}><div className="k">Closed</div><div className="v">$0</div><div className="s">0 deposits</div></div>
      </div>

      <div style={{ marginTop: 18 }}>
        {campaigns === null && <div className="card"><span className="spin" /></div>}
        {campaigns && campaigns.length === 0 && (
          <EmptyState ico={'\u25A6'} title="No campaigns yet" action={<button className="btn" onClick={() => setCreating(true)}>Create your first campaign</button>}>
            A campaign organizes a batch of homes, the renders you make, and the quotes you send.
          </EmptyState>
        )}
        {campaigns && campaigns.length > 0 && (
          <div className="card card-table">
            <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Campaign</th><th>Area</th><th>Status</th><th>Created</th></tr></thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/campaigns/${c.id}`)}>
                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                    <td className="muted">{c.area || '—'}</td>
                    <td><span className="pill green">{c.status || 'active'}</span></td>
                    <td className="muted">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
