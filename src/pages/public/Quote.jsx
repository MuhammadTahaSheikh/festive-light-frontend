import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/index.js';
import { money } from '../../components/ui/index.js';
import BrandLogo from '../../components/ui/BrandLogo.jsx';
import './quote.css';

const DEFAULT_SEASONS = [
  { id: 'warm-white', label: 'Every night', sub: 'Warm white' },
  { id: 'christmas', label: 'Christmas', sub: 'Red & green' },
  { id: 'july-4th', label: 'July 4th', sub: 'Red, white & blue' },
  { id: 'halloween', label: 'Halloween', sub: 'Orange & purple' },
];

export default function Quote() {
  const { id } = useParams();
  const [quote, setQuote] = useState(null);
  const [activeSeason, setActiveSeason] = useState('');
  const [displayImage, setDisplayImage] = useState('');
  const [seasonBusy, setSeasonBusy] = useState('');
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [sent, setSent] = useState(false);

  useEffect(() => {
    api.quote(id)
      .then((d) => {
        const q = d.quote;
        const primary = q?.seasonSwitch?.primary || q?.scheme || 'warm-white';
        // Merge server gallery with browser cache so View-again never re-bills Gemini.
        let localGallery = {};
        try {
          localGallery = JSON.parse(localStorage.getItem(`flp_season_${id}`) || '{}') || {};
        } catch { /* ignore */ }
        const gallery = { ...(localGallery || {}), ...(q?.seasonSwitch?.gallery || {}) };
        if (q?.imageUrl && primary) gallery[primary] = gallery[primary] || q.imageUrl;
        setQuote({
          ...q,
          seasonSwitch: { ...q.seasonSwitch, gallery },
        });
        setActiveSeason(primary);
        setDisplayImage(gallery[primary] || q?.imageUrl || '');
      })
      .catch((e) => setErr(e.message));
  }, [id]);

  function rememberSeason(seasonId, imageUrl) {
    if (!id || !seasonId || !imageUrl) return;
    try {
      const key = `flp_season_${id}`;
      const prev = JSON.parse(localStorage.getItem(key) || '{}') || {};
      prev[seasonId] = imageUrl;
      localStorage.setItem(key, JSON.stringify(prev));
    } catch { /* ignore */ }
  }

  async function pickSeason(seasonId) {
    if (!quote || seasonBusy || seasonId === activeSeason) return;
    setErr('');
    const primary = quote.seasonSwitch?.primary || quote.scheme || 'warm-white';
    const cached = quote.seasonSwitch?.gallery?.[seasonId]
      || (seasonId === primary ? quote.imageUrl : null);
    if (cached) {
      setActiveSeason(seasonId);
      setDisplayImage(cached);
      rememberSeason(seasonId, cached);
      return;
    }
    setSeasonBusy(seasonId);
    try {
      const res = await api.quoteSeason(id, seasonId);
      setActiveSeason(seasonId);
      setDisplayImage(res.imageUrl);
      rememberSeason(seasonId, res.imageUrl);
      setQuote((q) => ({
        ...q,
        seasonSwitch: {
          ...q.seasonSwitch,
          ...res.seasonSwitch,
          gallery: {
            ...(q.seasonSwitch?.gallery || {}),
            ...(res.seasonSwitch?.gallery || {}),
            [seasonId]: res.imageUrl,
          },
        },
      }));
    } catch (e) {
      const msg = e.message || '';
      setErr(
        e.status === 404
          ? 'Season preview API not found — restart the server (npm start), then hard refresh.'
          : msg.includes('season_source')
            ? 'Could not generate this season — no source photo for this quote.'
            : (e.message || 'Could not load that season preview.'),
      );
    } finally {
      setSeasonBusy('');
    }
  }

  async function requestCall(e) {
    e.preventDefault();
    try {
      await api.lead({
        ...form,
        address: quote?.address || '',
        source: 'quote_page',
        notes: `Quote ${id}${activeSeason ? ` · season:${activeSeason}` : ''}`,
      });
      setSent(true);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  if (err && !quote) {
    return (
      <div className="center-page">
        <div className="card">Sorry — this quote could not be found.</div>
      </div>
    );
  }
  if (!quote) {
    return (
      <div className="center-page">
        <span className="spin" />
      </div>
    );
  }

  const seasons = quote.seasonSwitch?.seasons?.length ? quote.seasonSwitch.seasons : DEFAULT_SEASONS;

  return (
    <div className="quote-page">
      <div className="widget quote-card">
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div className="brand brand--stacked" style={{ justifyContent: 'center', padding: 0 }}>
            <BrandLogo variant="wordmarkLight" className="logo logo--wordmark" />
            <span className="brand-tagline" style={{ textAlign: 'center' }}>Your design quote</span>
          </div>
        </div>

        <div className="quote-hero">
          <img
            className="rimg quote-hero-img"
            src={displayImage || quote.imageUrl}
            alt="Your home with permanent lighting"
          />
          {seasonBusy && <div className="quote-hero-loading">Loading season…</div>}
        </div>

        {seasons.length > 0 && (
          <div className="quote-season-switch">
            <div className="quote-season-label">See your home in every season</div>
            <p className="quote-season-sub muted">
              One permanent install — tap a holiday to preview your lights year-round.
            </p>
            <div className="quote-season-chips">
              {seasons.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={'quote-season-chip' + (activeSeason === s.id ? ' on' : '')}
                  disabled={Boolean(seasonBusy)}
                  onClick={() => pickSeason(s.id)}
                >
                  <strong>{s.label}</strong>
                  <span>{s.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <h3 style={{ marginTop: 16, marginBottom: 4 }}>Your design quote is ready.</h3>
        {quote.address && <p className="sub" style={{ marginBottom: 12 }}>{quote.address}</p>}

        {quote.frontPrice && (
          <div className="quote-price-hero">
            <div className="quote-price-main">{money(quote.frontPrice)}</div>
            <div className="quote-price-sub muted">
              {quote.frontFeet ? `${quote.frontFeet} ft front roofline` : 'Front roofline install'}
              {quote.pricePerFoot ? ` · $${quote.pricePerFoot}/ft` : ''}
            </div>
          </div>
        )}

        <div className="stats">
          {quote.frontFeet && (
            <div className="stat">
              <div className="k">Front footage</div>
              <div className="v">{quote.frontFeet} ft</div>
            </div>
          )}
          {quote.frontPrice && (
            <div className="stat">
              <div className="k">Front quote</div>
              <div className="v">{money(quote.frontPrice)}</div>
            </div>
          )}
          {quote.wholeFeet && (
            <div className="stat">
              <div className="k">Whole-house footage</div>
              <div className="v">{quote.wholeFeet} ft</div>
            </div>
          )}
          {quote.wholePrice && (
            <div className="stat">
              <div className="k">Whole-house quote</div>
              <div className="v">{money(quote.wholePrice)}</div>
            </div>
          )}
        </div>

        {err && quote && (
          <p className="quote-err">{err}</p>
        )}

        {sent ? (
          <div className="banner" style={{ marginTop: 18, textAlign: 'center' }}>
            Thanks! We&apos;ll reach out shortly to schedule your free consultation.
          </div>
        ) : (
          <form onSubmit={requestCall} style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Request a call</div>
            <input
              className="input"
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ marginBottom: 8 }}
              required
            />
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={{ marginBottom: 8 }}
              required
            />
            <input
              className="input"
              type="tel"
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <button className="btn block" style={{ marginTop: 12 }} type="submit">
              Request my free consultation
            </button>
          </form>
        )}
        <p className="muted" style={{ textAlign: 'center', fontSize: 11.5, marginTop: 12 }}>
          Estimate only — final pricing confirmed at your free on-site measurement.
        </p>
      </div>
    </div>
  );
}
