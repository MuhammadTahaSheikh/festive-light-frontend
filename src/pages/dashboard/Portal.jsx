import { useEffect, useState } from 'react';
import { PageHead, EmptyState, money } from '../../components/ui/index.js';
import { api } from '../../api/index.js';
import QRCode from '../../components/ui/QRCode.jsx';
import { SITE_HOME } from '../../config/site.js';

export default function Portal() {
  const [renders, setRenders] = useState(null);
  const [selId, setSelId] = useState('');
  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.renders()
      .then((d) => {
        const list = d.renders || [];
        setRenders(list);
        if (list.length) setSelId(list[0].id);
      })
      .catch(() => setRenders([]));
  }, []);

  useEffect(() => {
    if (!selId) { setQuote(null); return; }
    setLoadingQuote(true);
    api.quote(selId)
      .then((d) => setQuote(d.quote))
      .catch(() => setQuote(null))
      .finally(() => setLoadingQuote(false));
  }, [selId]);

  const quoteUrl = (id) => `${window.location.origin}/app/quote/${id}`;

  function copy() {
    if (!selId) return;
    navigator.clipboard?.writeText(quoteUrl(selId));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const label = (r) => `${r.address || 'Uploaded photo'}${r.estimated_total ? ' — ' + money(r.estimated_total) : ''}`;

  return (
    <div>
      <PageHead title="Customer Portal" subtitle="The private quote page each homeowner sees — this is a live preview of a real render.">
        {renders && renders.length > 0 && (
          <select className="input page-head-select" value={selId} onChange={(e) => setSelId(e.target.value)}>
            {renders.map((r) => (
              <option key={r.id} value={r.id}>{label(r)}</option>
            ))}
          </select>
        )}
      </PageHead>

      {renders === null && <div className="card"><span className="spin" /></div>}

      {renders && renders.length === 0 && (
        <EmptyState ico={'\u{1F3E0}'} title="No homeowner pages yet" action={<a href={SITE_HOME} className="btn">Render a home</a>}>
          Every home you render gets its own private quote page. Render your first home and it'll appear here as a live preview.
        </EmptyState>
      )}

      {renders && renders.length > 0 && (
        <div className="grid-portal">
          {/* Live preview of the real homeowner-facing page */}
          <div className="card" style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', width: '100%' }}>
            <div className="pill gold" style={{ marginBottom: 14 }}>Live preview</div>

            {loadingQuote && <div className="rimg" style={{ display: 'grid', placeItems: 'center' }}><span className="spin" /></div>}

            {!loadingQuote && quote && (
              <>
                {quote.imageUrl
                  ? <img className="rimg" src={quote.imageUrl} alt="Homeowner's rendered home" />
                  : <div className="rimg" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>No image</div>}

                <h3 style={{ marginBottom: 4, marginTop: 14 }}>Your design quote is ready.</h3>
                {quote.address && <p className="muted" style={{ marginTop: 0 }}>{quote.address}</p>}

                <div className="stats">
                  <div className="stat">
                    <div className="k">Front quote</div>
                    <div className="v">{quote.frontPrice ? money(quote.frontPrice) : '—'}</div>
                  </div>
                  <div className="stat">
                    <div className="k">Whole-house</div>
                    <div className="v">{quote.wholePrice ? money(quote.wholePrice) : '—'}</div>
                  </div>
                </div>

                <a className="btn block" href={quoteUrl(quote.id)} target="_blank" rel="noopener" style={{ marginTop: 16 }}>
                  Open homeowner's page &rarr;
                </a>
                <p className="muted" style={{ fontSize: 11.5, marginTop: 12 }}>
                  This is exactly what the homeowner sees when they scan their QR code.
                </p>
              </>
            )}
          </div>

          {/* Share panel */}
          <div className="card sticky-panel" style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Share this page</div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>
              Homeowner scans to open their private quote.
            </p>
            <div style={{ display: 'grid', placeItems: 'center', margin: '12px 0' }}>
              {selId && <QRCode value={quoteUrl(selId)} size={160} />}
            </div>
            <button className="btn ghost block" onClick={copy}>{copied ? 'Copied \u2713' : 'Copy link'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
