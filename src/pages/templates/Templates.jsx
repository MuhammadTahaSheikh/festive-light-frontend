import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHead } from '../../components/ui/index.js';
import { api } from '../../api/client.js';
import { TemplateFlipCard } from './PostcardCanvas.jsx';
import { CATEGORIES } from './templateUtils.js';
import './templates.css';

export default function Templates() {
  const navigate = useNavigate();
  const [starters, setStarters] = useState([]);
  const [custom, setCustom] = useState([]);
  const [filter, setFilter] = useState('All');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  function load() {
    api.templates()
      .then((d) => {
        setStarters(d.starters || []);
        setCustom(d.custom || []);
      })
      .catch((e) => setErr(e.message));
  }

  useEffect(() => { load(); }, []);

  function matchFilter(t) {
    return filter === 'All' || t.category === filter;
  }

  async function customizeStarter(starterId) {
    setBusy(starterId);
    try {
      const res = await api.cloneTemplate({ starterId });
      navigate(`/templates/${res.template.id}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  }

  async function deleteTemplate(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusy(id);
    setErr('');
    try {
      await api.deleteTemplate(id);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="tpl-page">
      <PageHead
        title="Postcard templates"
        subtitle="Design 6×9 layouts for direct mail. Hover a card to preview the back."
      >
        <Link to="/templates/new" className="btn sm">+ New template</Link>
      </PageHead>

      <p className="muted" style={{ fontSize: 14, marginTop: -8, marginBottom: 16, lineHeight: 1.5 }}>
        Design from scratch, customize a starter, or upload artwork. Hover any card to flip and see the back side.
      </p>

      {err && <div className="card" style={{ marginBottom: 12, color: 'var(--red)' }}>{err}</div>}

      <div className="tpl-filters">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" className={filter === c ? 'active' : ''} onClick={() => setFilter(c)}>
            {c}
          </button>
        ))}
      </div>

      {custom.length > 0 && (
        <section className="tpl-section">
          <h3>Your templates</h3>
          <div className="tpl-grid">
            {custom.filter(matchFilter).map((t) => (
              <div className="tpl-card" key={t.id}>
                <TemplateFlipCard template={t} />
                <div className="tpl-meta">
                  <div className="name">{t.name}</div>
                  <div className="cat">{t.category}</div>
                </div>
                <div className="tpl-actions">
                  <Link to={`/templates/${t.id}`} className="btn sm">Edit</Link>
                  <button
                    type="button"
                    className="btn sm danger"
                    disabled={busy === t.id}
                    onClick={() => deleteTemplate(t.id, t.name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {custom.length === 0 && (
        <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
          No custom templates yet. Click &quot;+ New template&quot; or customize a starter below.
        </p>
      )}

      <section className="tpl-section">
        <h3>Starter templates</h3>
        <div className="tpl-grid">
          {starters.filter(matchFilter).map((t) => (
            <div className="tpl-card" key={t.id}>
              <TemplateFlipCard template={t} />
              <div className="tpl-meta">
                <div className="name">{t.name}</div>
                <div className="cat">{t.category}</div>
              </div>
              <div className="tpl-actions">
                <button type="button" className="btn sm" disabled={busy === t.id} onClick={() => customizeStarter(t.id)}>
                  {busy === t.id ? '…' : 'Customize'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
