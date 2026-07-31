import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHead, money } from '../../components/ui/index.js';
import AddressAutocomplete from '../../components/ui/AddressAutocomplete.jsx';
import { api } from '../../api/index.js';
import { ApiError } from '../../api/client.js';
import { useCredits } from '../../context/CreditsContext.jsx';
import OutreachMap from '../outreach/OutreachMap.jsx';
import RenderOptionsPanel from '../outreach/RenderOptionsPanel.jsx';
import '../outreach/outreach.css';
import '../templates/templates.css';
import { templateHasRenderSlot } from '../templates/templateUtils.js';
import { blockWaveStats } from '../../utils/blockWave.js';
import CampaignTour, { useCampaignTour } from '../../components/onboarding/CampaignTour.jsx';

const NEIGHBOR_COUNTS = [250, 500, 1000];
const RENDER_CONCURRENCY = 2;

function isPreviewMailable(h) {
  if (!h.render_id || h.mail_status === 'sent') return false;
  return h.status === 'rendered' || h.status === 'quote_sent';
}

function isLiveMailable(h) {
  return Boolean(h.render_id && h.status === 'rendered' && !h.mail_status);
}

function parseCsv(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(',')[0]?.trim())
    .filter(Boolean);
}

async function runPool(items, concurrency, fn) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      try {
        results[i] = await fn(items[i], i);
      } catch (e) {
        results[i] = { error: e };
        if (e instanceof ApiError && e.code === 'insufficient_credits') throw e;
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

export default function CampaignDetail() {
  const { id } = useParams();
  const { balance, creditsPerRender, openBuyCredits, refresh: refreshCredits } = useCredits();
  const fileRef = useRef(null);
  const mapRef = useRef(null);
  const tourPickHomesRef = useRef(null);
  const tourRenderOptionsRef = useRef(null);
  const tourMakeQuotesRef = useRef(null);

  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [mapsApiKey, setMapsApiKey] = useState('');
  const [searchAddr, setSearchAddr] = useState('');
  const [mapCenter, setMapCenter] = useState(null);
  const [searchedLocation, setSearchedLocation] = useState(null);

  const [selection, setSelection] = useState(null);
  const [discovered, setDiscovered] = useState([]);
  const [areaBusy, setAreaBusy] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [areaMsg, setAreaMsg] = useState('');

  const [lightStyle, setLightStyle] = useState('classic'); // 'classic' | 'neon'
  const [scheme, setScheme] = useState('warm-white');
  const [customColors, setCustomColors] = useState([
    { hex: '#e21d1d', name: '' },
    { hex: '#ffffff', name: '' },
    { hex: '#1d6fe2', name: '' },
  ]);
  const [brightDimColor, setBrightDimColor] = useState({ hex: '#fff3d6', name: '' });
  const [landscape, setLandscape] = useState(true);
  const [decor, setDecor] = useState('none');
  const [pricePerFoot, setPricePerFoot] = useState('40');

  const [neighborCount, setNeighborCount] = useState(250);
  const [neighborAddr, setNeighborAddr] = useState('');
  const [neighborBusy, setNeighborBusy] = useState(false);

  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0, label: '' });
  const [showPricing, setShowPricing] = useState(false);

  const [mailTemplates, setMailTemplates] = useState([]);
  const [mailTemplateId, setMailTemplateId] = useState('starter-plain-render');
  const [mailBusy, setMailBusy] = useState(false);
  const [resetMailBusy, setResetMailBusy] = useState(false);
  const [mailMsg, setMailMsg] = useState('');
  const [mailPreviewLinks, setMailPreviewLinks] = useState([]);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyResults, setVerifyResults] = useState(null);
  const [mailStatus, setMailStatus] = useState(null);
  const [enrichBusy, setEnrichBusy] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState('');

  const tour = useCampaignTour(Boolean(data));

  const load = useCallback(() => {
    api.campaign(id).then((d) => {
      setData(d);
      if (d.campaign?.default_scheme) setScheme(d.campaign.default_scheme);
      if (d.campaign?.default_price_per_foot) setPricePerFoot(String(d.campaign.default_price_per_foot));
      if (d.campaign?.selection_geojson) {
        setSelection({ polygon: d.campaign.selection_geojson.polygon, type: d.campaign.selection_geojson.type });
      }
    }).catch((e) => setErr(e.message));
  }, [id]);

  useEffect(load, [load]);

  useEffect(() => {
    api.templates()
      .then((d) => {
        const all = [...(d.starters || []), ...(d.custom || [])];
        setMailTemplates(all);
        if (all.length && !all.some((t) => t.id === mailTemplateId)) {
          setMailTemplateId(all[0].id);
        }
      })
      .catch(() => {});
    api.mailStatus().then(setMailStatus).catch(() => {});
  }, []);

  useEffect(() => {
    async function loadMapsKey() {
      try {
        const d = await api.mapsJsConfig();
        if (d.mapsApiKey) { setMapsApiKey(d.mapsApiKey); return; }
      } catch { /* try fallback */ }
      try {
        const d = await api.config();
        if (d.mapsApiKey) setMapsApiKey(d.mapsApiKey);
        else if (!d.maps) setErr('Google Maps is not configured. Add GOOGLE_MAPS_API_KEY to your .env file and restart the server.');
      } catch {
        setErr('Could not load map configuration. Restart the server and refresh.');
      }
    }
    loadMapsKey();
  }, []);

  async function geocodeSearch() {
    if (!searchAddr.trim() || searchBusy) return;
    setSearchBusy(true);
    try {
      const data = await api.autocomplete(searchAddr);
      const first = data.suggestions?.[0];
      const q = first?.full || searchAddr;
      const res = await api.discoverNeighbors({ address: q, count: 1 });
      if (res.lat != null) {
        setMapCenter({ lat: res.lat, lng: res.lng, zoom: 18 });
        setSearchedLocation({ lat: res.lat, lng: res.lng, label: q });
      }
    } catch {
      setErr('Could not find that address on the map.');
    } finally {
      setSearchBusy(false);
    }
  }

  async function onAreaSelected(sel) {
    setSelection(sel);
    setAreaMsg('');
    setDiscovered([]);
    setErr('');
    if (!sel?.polygon?.length) return;

    setAreaBusy(true);
    try {
      const res = await api.discoverArea({ polygon: sel.polygon, limit: 1000 });
      setDiscovered(res.houses || []);
      setAreaMsg(
        res.returned > 0
          ? `Area selected — ${res.returned} houses found. Click "Load ${res.returned} houses into campaign", then "Make Quotes".`
          : 'No houses found in this area. Try a larger rectangle around the neighborhood.',
      );
      // Optional — don't block discovery if Supabase schema isn't migrated yet.
      api.updateCampaign(id, { selection_geojson: sel }).catch(() => {});
    } catch (e) {
      setErr(e.message || 'Could not find houses in this area. Try drawing a larger box.');
    } finally {
      setAreaBusy(false);
    }
  }

  async function loadHousesToCampaign(houses) {
    if (!houses.length) return;
    setAreaBusy(true);
    try {
      const res = await api.bulkAddHomes(id, { homes: houses });
      setAreaMsg(`Added ${res.added?.length || 0} homes${res.skipped ? ` (${res.skipped} duplicates skipped)` : ''}.`);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setAreaBusy(false);
    }
  }

  async function findNeighbors() {
    const addr = neighborAddr.trim() || searchAddr.trim();
    if (!addr) return setErr('Enter an address to find neighbors.');
    setNeighborBusy(true);
    setErr('');
    try {
      const res = await api.discoverNeighbors({ address: addr, count: neighborCount });
      setDiscovered(res.houses || []);
      if (res.lat != null) {
        setMapCenter({ lat: res.lat, lng: res.lng, zoom: 16 });
        setSearchedLocation({ lat: res.lat, lng: res.lng, label: addr });
      }
      setAreaMsg(`Found ${res.returned} neighbors near ${addr}.`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setNeighborBusy(false);
    }
  }

  async function onCsvFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = parseCsv(text);
    const homes = lines.map((address) => ({ address }));
    await loadHousesToCampaign(homes);
    e.target.value = '';
  }

  async function savePricing() {
    const rate = parseFloat(pricePerFoot) || null;
    try {
      await api.updateCampaign(id, {
        default_scheme: scheme,
        default_price_per_foot: rate,
      });
      setShowPricing(false);
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function makeQuotes() {
    setErr('');
    if (!data?.homes?.length) return setErr('Load houses into the campaign first.');
    const prospects = data.homes.filter((h) => h.status === 'prospect' || !h.render_id);
    if (!prospects.length) return setErr('All homes are already rendered.');

    const rate = parseFloat(pricePerFoot);
    if (!rate || rate <= 0) {
      setErr('Set a price per linear foot before making quotes (e.g. $40). Open Adjust pricing.');
      setShowPricing(true);
      return;
    }

    const needed = prospects.length * creditsPerRender;
    if ((balance ?? 0) < needed) {
      setErr(`Need ${needed} credits (${prospects.length} homes × ${creditsPerRender}) but you only have ${balance ?? 0}. Buy credits to continue.`);
      openBuyCredits();
      return;
    }

    setBatchBusy(true);
    setBatchProgress({ done: 0, total: prospects.length, label: 'Starting…' });
    let done = 0;

    try {
      await runPool(prospects, RENDER_CONCURRENCY, async (home) => {
        setBatchProgress({ done, total: prospects.length, label: home.address });
        const body = {
          address: home.address,
          lat: home.lat,
          lng: home.lng,
          pricePerFoot: rate,
          scheme,
          customColors: scheme === 'bright-dim-1-3'
            ? [brightDimColor]
            : scheme === 'custom'
              ? customColors
              : [],
          landscape,
          decor,
          decorColor: decor === 'christmas' ? 'multicolor' : 'warm-white',
          serviceType: decor === 'christmas' ? 'christmas' : 'permanent',
          campaignHomeId: home.id,
          // Only send neon when selected so classic path stays identical to today.
          ...(lightStyle === 'neon' ? { lightStyle: 'neon' } : {}),
        };
        await api.render(body);
        done++;
        setBatchProgress({ done, total: prospects.length, label: home.address });
      });
      setBatchProgress({ done: prospects.length, total: prospects.length, label: 'Done' });
      load();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'insufficient_credits') {
        setErr(e.message || 'Insufficient credits. Buy more to finish batch.');
        openBuyCredits();
      } else {
        setErr(e.message || 'Batch render failed.');
      }
      load();
    } finally {
      setBatchBusy(false);
      refreshCredits();
    }
  }

  async function enrichOwners() {
    setErr('');
    setEnrichMsg('');
    const missing = data?.homes?.filter((h) => !String(h.owner_name || '').trim()) || [];
    if (!missing.length) {
      setEnrichMsg('All homes already have owner names.');
      return;
    }
    setEnrichBusy(true);
    try {
      const res = await api.enrichCampaignOwners(id, { onlyMissing: true });
      setEnrichMsg(
        `Found owners for ${res.matched} of ${res.total} address(es)`
        + (res.skipped ? ` · ${res.skipped} no match` : '')
        + '.',
      );
      load();
    } catch (e) {
      setErr(e.message || 'Owner lookup failed. Add ATTOM_API_KEY to .env (free trial at api.developer.attomdata.com).');
    } finally {
      setEnrichBusy(false);
    }
  }

  async function verifyAddresses() {
    setVerifyResults(null);
    setMailMsg('');
    setErr('');
    const rendered = data?.homes?.filter(isPreviewMailable) || [];
    if (!rendered.length) {
      setErr('No rendered homes to verify. Make quotes first, or reset mail status to test again.');
      return;
    }
    setVerifyBusy(true);
    try {
      const res = await api.verifyCampaignAddresses(id, { unmailedOnly: true });
      setVerifyResults(res);
      setMailMsg(
        res.lobVerify
          ? `${res.mailable} of ${res.total} addresses passed USPS verification${res.blocked ? ` · ${res.blocked} blocked` : ''}.`
          : `${res.mailable} of ${res.total} addresses look valid (format check — enable live Lob for USPS verification).`,
      );
    } catch (e) {
      setErr(e.message);
    } finally {
      setVerifyBusy(false);
    }
  }

  async function sendMail(live = false) {
    setMailMsg('');
    setMailPreviewLinks([]);
    setErr('');
    const rendered = data?.homes?.filter(live ? isLiveMailable : isPreviewMailable) || [];
    if (!rendered.length) {
      setErr(live
        ? 'No unmailed rendered homes. Reset mail status if you already previewed.'
        : 'No rendered homes to preview. Make quotes first.');
      return;
    }
    if (!mailTemplateId) {
      setErr('Choose a postcard template.');
      return;
    }
    if (live) {
      const ok = window.confirm(
        `Send ${rendered.length} REAL postcard(s) via Lob?\n\n~$${rendered.length}–$${(rendered.length * 1.5).toFixed(0)} estimated for print + postage.`,
      );
      if (!ok) return;
    }
    setMailBusy(true);
    try {
      const res = await api.sendCampaignMail(id, {
        templateId: mailTemplateId,
        demoConfirm: !live,
      });
      const skipped = res.skippedAddress || 0;
      setMailMsg(
        `${live ? 'Mailed' : 'Sent'} ${res.sent} postcard(s)${res.demo ? ' (demo PDFs)' : ' via Lob'}`
        + (skipped ? ` · ${skipped} skipped (bad address)` : '')
        + (res.demo ? '' : ` · ~$${res.cost?.estimate?.toFixed(2) || '?'} charged.`),
      );
      if (res.demo && Array.isArray(res.results)) {
        setMailPreviewLinks(
          res.results
            .filter((r) => r.ok && (r.preview?.previewUrl || r.preview?.frontUrl))
            .map((r) => ({
              address: r.address?.split(',')[0] || r.address || 'Postcard',
              url: r.preview.previewUrl || r.preview.frontUrl,
            })),
        );
      }
      setVerifyResults(null);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setMailBusy(false);
    }
  }

  async function resetMailStatus() {
    setErr('');
    setMailMsg('');
    setMailPreviewLinks([]);
    setResetMailBusy(true);
    try {
      const toReset = data?.homes?.filter((h) => h.mail_status || h.status === 'quote_sent') || [];
      if (!toReset.length) {
        setMailMsg('Nothing to reset.');
        return;
      }
      let reset = 0;
      try {
        const res = await api.resetCampaignMail(id);
        reset = res.reset || 0;
      } catch (e) {
        if (e.status !== 404) throw e;
        await Promise.all(toReset.map(async (h) => {
          const patch = { status: h.render_id ? 'rendered' : h.status };
          try {
            await api.updateHome(h.id, {
              ...patch,
              mail_status: null,
              lob_postcard_id: null,
              mail_template_id: null,
              mailed_at: null,
            });
          } catch {
            await api.updateHome(h.id, patch);
          }
        }));
        reset = toReset.length;
      }
      setMailMsg(reset
        ? `Reset ${reset} home(s) — status back to rendered, ready to preview again.`
        : 'Nothing to reset.');
      setVerifyResults(null);
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setResetMailBusy(false);
    }
  }

  if (err && !data) return <div className="card">Could not load campaign: {err}</div>;
  if (!data) return <div className="card"><span className="spin" /></div>;

  const { campaign, homes, stats } = data;
  const readyCount = homes.filter((h) => h.status === 'prospect' || h.render_id).length;
  const prospectCount = homes.filter((h) => h.status === 'prospect' && !h.render_id).length;
  const mailableCount = homes.filter(isPreviewMailable).length;
  const liveMailableCount = homes.filter(isLiveMailable).length;
  const mailedCount = homes.filter((h) => h.mail_status || h.status === 'quote_sent').length;
  const ownerMissingCount = homes.filter((h) => !String(h.owner_name || '').trim()).length;
  const ownerFoundCount = homes.filter((h) => String(h.owner_name || '').trim()).length;
  const blockWave = blockWaveStats(homes);
  const pricingRate = parseFloat(pricePerFoot) || 0;
  const sampleFeet = 100;
  const sampleQuote = pricingRate ? Math.round((sampleFeet * pricingRate) / 10) * 10 : null;
  const pct = batchProgress.total ? Math.round((batchProgress.done / batchProgress.total) * 100) : 0;
  const selectedMailTemplate = mailTemplates.find((t) => t.id === mailTemplateId);
  const mailTemplateMissingRender = selectedMailTemplate && !templateHasRenderSlot(selectedMailTemplate);

  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <Link to="/campaigns" className="muted" style={{ fontSize: 13 }}>&larr; All campaigns</Link>
      </div>

      <PageHead
        title="SELECT HOUSES"
        subtitle={
          campaign.name
          + (campaign.area ? ` · ${campaign.area}` : '')
          + (campaign.created_by ? ` · by ${campaign.created_by}` : '')
        }
      >
        <span className="pill gold">{prospectCount || homes.length} ready to quote</span>
        <button type="button" className="btn ghost sm" onClick={() => setShowPricing(true)}>
          Adjust pricing
        </button>
      </PageHead>

      {err && <div className="card" style={{ marginBottom: 12, color: 'var(--red)' }}>{err}</div>}

      {blockWave.wave && (
        <div
          className="card"
          style={{
            marginBottom: 12,
            borderColor: 'rgba(244,147,33,.35)',
            background: 'linear-gradient(135deg, rgba(244,147,33,.08), rgba(244,147,33,.02))',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>
            Block wave opportunity
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            <strong>{blockWave.wave.rendered} of {blockWave.wave.total}</strong> homes on{' '}
            <strong>{blockWave.wave.label}</strong> already have quotes.
            {blockWave.wave.mailed > 0 && ` ${blockWave.wave.mailed} mailed.`}
            {' '}Mail the rest — neighbors respond when their block is lighting up.
          </p>
        </div>
      )}

      <div className="or-workspace">
        <aside className="or-side">
          <div ref={tourRenderOptionsRef}>
            <RenderOptionsPanel
              lightStyle={lightStyle}
              onLightStyle={setLightStyle}
              scheme={scheme}
              onScheme={setScheme}
              customColors={customColors}
              onCustomColors={setCustomColors}
              brightDimColor={brightDimColor}
              onBrightDimColor={setBrightDimColor}
              landscape={landscape}
              onLandscape={setLandscape}
              decor={decor}
              onDecor={setDecor}
              pricePerFoot={pricePerFoot}
              onPricePerFoot={setPricePerFoot}
              disabled={batchBusy}
            />
          </div>
          <div ref={tourMakeQuotesRef}>
          <button
            type="button"
            className="btn block"
            disabled={batchBusy || !homes.length}
            onClick={makeQuotes}
          >
            {batchBusy ? 'Making quotes…' : 'Make Quotes'}
          </button>
          {prospectCount > 0 && (
            <p className="muted" style={{ fontSize: 12, margin: '8px 0 0', lineHeight: 1.4 }}>
              Uses {prospectCount * creditsPerRender} credits ({prospectCount} × {creditsPerRender}).
              Balance: {(balance ?? 0).toLocaleString()}.
              {pricingRate > 0 && (
                <> · ~{sampleFeet} ft × ${pricingRate}/ft ≈ {money(sampleQuote)} per home.</>
              )}
            </p>
          )}
          {prospectCount > 0 && !pricingRate && (
            <p className="or-status" style={{ marginTop: 8, fontSize: 11.5, color: 'var(--gold)', lineHeight: 1.45 }}>
              Set price per foot before Make Quotes — postcards and QR pages need a dollar amount.
            </p>
          )}
          {discovered.length > 0 && (
            <button
              type="button"
              className="btn ghost block"
              disabled={areaBusy}
              onClick={() => loadHousesToCampaign(discovered)}
            >
              Load {discovered.length} houses into campaign
            </button>
          )}

          <div className="mail-panel">
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
              Direct mail (6×9)
            </div>
            <button
              type="button"
              className="btn ghost block sm"
              disabled={enrichBusy || !homes.length || !ownerMissingCount}
              onClick={enrichOwners}
              style={{ marginBottom: 10 }}
            >
              {enrichBusy
                ? 'Looking up owners…'
                : ownerMissingCount
                  ? `Find owner names (${ownerMissingCount})`
                  : 'Owner names ready'}
            </button>
            {(enrichMsg || ownerFoundCount > 0) && (
              <p className="or-status" style={{ marginTop: 0, marginBottom: 10, fontSize: 12 }}>
                {enrichMsg || `${ownerFoundCount} owner name(s) ready for {{owner}} / {{owner_first}} on postcards.`}
              </p>
            )}
            <label className="field" style={{ margin: '0 0 6px' }}>Postcard template</label>
            <select
              className="input"
              value={mailTemplateId}
              onChange={(e) => setMailTemplateId(e.target.value)}
              disabled={mailBusy}
            >
              {mailTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.is_starter ? ' (starter)' : ''}</option>
              ))}
            </select>
            {mailTemplateMissingRender && (
              <p className="or-status" style={{ marginTop: 6, fontSize: 11.5, color: 'var(--red)', lineHeight: 1.45 }}>
                This template uses a static image, not a house render slot — every postcard will look the same.
                Edit the template and use the <strong>Render</strong> element (🏠), not Image upload.
              </p>
            )}
            <p className="mail-cost">
              {mailableCount > 0
                ? `Mail ${mailableCount} rendered home(s) · ~$${(mailableCount * 1).toFixed(2)}–$${(mailableCount * 1.5).toFixed(2)} (print + postage)`
                : 'Make quotes first — then mail personalized postcards.'}
            </p>
            <button
              type="button"
              className="btn ghost block sm"
              disabled={verifyBusy || mailBusy || !mailableCount}
              onClick={verifyAddresses}
            >
              {verifyBusy ? 'Checking…' : 'Check addresses (USPS)'}
            </button>
            <button
              type="button"
              className="btn ghost block"
              disabled={mailBusy || verifyBusy || !mailableCount}
              onClick={() => sendMail(false)}
              style={{ marginTop: 8 }}
            >
              {mailBusy ? 'Sending…' : `Preview ${mailableCount || ''} PDFs`.trim()}
            </button>
            {mailedCount > 0 && (
              <button
                type="button"
                className="btn ghost block sm"
                style={{ marginTop: 8, borderColor: 'var(--gold)', color: 'var(--gold)' }}
                disabled={resetMailBusy || mailBusy || verifyBusy}
                onClick={resetMailStatus}
              >
                {resetMailBusy ? 'Resetting…' : `Reset ${mailedCount} home(s) to rendered`}
              </button>
            )}
            {mailStatus?.readyForLive && (
              <button
                type="button"
                className="btn block sm"
                style={{ marginTop: 8 }}
                disabled={mailBusy || verifyBusy || !liveMailableCount}
                onClick={() => sendMail(true)}
              >
                Send live via Lob
              </button>
            )}
            {verifyResults?.results?.some((r) => !r.ok) && (
              <div className="mail-verify-warn" style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.45, color: 'var(--red)' }}>
                {verifyResults.results.filter((r) => !r.ok).slice(0, 4).map((r) => (
                  <div key={r.homeId} style={{ marginBottom: 4 }}>
                    ✕ {r.address?.split(',')[0] || r.address} — {r.message}
                  </div>
                ))}
                {verifyResults.blocked > 4 && (
                  <div className="muted">+ {verifyResults.blocked - 4} more blocked</div>
                )}
              </div>
            )}
            {verifyResults?.results?.every((r) => r.ok) && verifyResults.total > 0 && (
              <p className="or-status" style={{ marginTop: 8, fontSize: 12 }}>
                ✓ All {verifyResults.total} addresses ready to mail
              </p>
            )}
            <Link to="/templates" className="muted" style={{ display: 'block', fontSize: 11, marginTop: 8 }}>
              Edit templates →
            </Link>
            {mailMsg && <p className="or-status" style={{ marginTop: 8, fontSize: 12 }}>{mailMsg}</p>}
            {mailPreviewLinks.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mailPreviewLinks.map((link) => (
                  <a
                    key={link.url}
                    className="btn ghost block sm"
                    href={link.url}
                    target="_blank"
                    rel="noopener"
                  >
                    {link.address} — Open PDF →
                  </a>
                ))}
              </div>
            )}
          </div>
          </div>
        </aside>

        <div className="or-main" ref={tourPickHomesRef}>
          <div className="or-head">
            <h2>SELECT HOUSES</h2>
            <p className="sub">
              Search an address or draw a rectangle / lasso around the houses you want.
            </p>
            <div className="or-search-row">
              <div className="acw" style={{ flex: 1 }}>
                <AddressAutocomplete
                  value={searchAddr}
                  placeholder="Search address or neighborhood…"
                  onChange={setSearchAddr}
                  onSelect={({ full }) => setSearchAddr(full || '')}
                />
              </div>
              <button
                type="button"
                className={'btn sm or-go-btn' + (searchBusy ? ' loading' : '')}
                onClick={geocodeSearch}
                disabled={searchBusy}
                aria-busy={searchBusy}
              >
                {searchBusy ? <span className="or-go-spin" aria-hidden /> : 'Go'}
              </button>
            </div>
            {areaMsg && <p className="or-status" style={{ marginTop: 10 }}>✓ {areaMsg}</p>}
            {areaBusy && <p className="muted" style={{ marginTop: 8 }}><span className="spin" /> Finding houses…</p>}
          </div>

          <div className="or-map-wrap">
            {discovered.length > 0 && (
              <div className="or-map-badge">#1 — {discovered.length} houses</div>
            )}
            <OutreachMap
              apiKey={mapsApiKey}
              center={mapCenter}
              locationPin={searchedLocation}
              selection={selection}
              onSelection={onAreaSelected}
              onMapReady={(m) => { mapRef.current = m; }}
              searching={areaBusy}
            />
          </div>

          <div className="or-tools">
            <div className="or-tool-card">
              <h4>Find Neighbors</h4>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>Render the closest neighbors to a seed address.</p>
              <div style={{ marginTop: 10 }}>
                <AddressAutocomplete
                  value={neighborAddr}
                  placeholder="Seed address (optional)"
                  onChange={setNeighborAddr}
                  onSelect={({ full }) => setNeighborAddr(full || '')}
                />
              </div>
              <div className="or-neighbor-row">
                <div className="or-count-btns">
                  {NEIGHBOR_COUNTS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={neighborCount === n ? 'on' : ''}
                      onClick={() => setNeighborCount(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn sm"
                  disabled={neighborBusy}
                  onClick={findNeighbors}
                >
                  {neighborBusy ? 'Searching…' : 'Find neighbors →'}
                </button>
              </div>
            </div>

            <div className="or-tool-card">
              <h4>Import addresses</h4>
              <p className="muted" style={{ fontSize: 13, margin: '0 0 10px' }}>
                Upload a CSV with one address per line (first column used).
              </p>
              <input ref={fileRef} type="file" accept=".csv,.txt" hidden onChange={onCsvFile} />
              <button type="button" className="btn ghost sm" onClick={() => fileRef.current?.click()}>
                Upload a CSV
              </button>
              <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                {homes.length} homes in campaign · {stats.rendered} rendered · {money(stats.closedValue)} closed
              </p>
            </div>
          </div>

          {homes.length > 0 && (
            <div className="card card-table">
              <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr><th>Address</th><th>Owner</th><th>Est. quote</th><th>Status</th><th>Mail</th></tr>
                </thead>
                <tbody>
                  {homes.slice(0, 50).map((h) => (
                    <tr key={h.id}>
                      <td>{h.address}</td>
                      <td>{h.owner_name || <span className="muted">—</span>}</td>
                      <td>{h.estimated_total ? money(h.estimated_total) : '—'}</td>
                      <td><span className={'pill ' + (h.status === 'rendered' ? 'gold' : 'blue')}>{h.status}</span></td>
                      <td className="muted" style={{ fontSize: 12 }}>{h.mail_status || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {homes.length > 50 && (
                <p className="muted" style={{ padding: 12, margin: 0, fontSize: 13 }}>
                  Showing 50 of {homes.length} homes.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="or-footer">
        <div className="or-progress">
          <div>
            <strong>{readyCount} houses ready</strong>
            {batchBusy && (
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Rendering {batchProgress.done}/{batchProgress.total} — {batchProgress.label}
              </div>
            )}
          </div>
          {batchProgress.total > 0 && (
            <div className="or-progress-bar">
              <i style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </div>

      {showPricing && (
        <div className="or-modal-backdrop" onClick={() => setShowPricing(false)}>
          <div className="or-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Adjust pricing tiers</h3>
            <label className="field">Default price per linear foot ($)</label>
            <input
              className="input"
              type="number"
              min="1"
              step="0.25"
              value={pricePerFoot}
              onChange={(e) => setPricePerFoot(e.target.value)}
            />
            <label className="field">Default light color</label>
            <select className="input" value={scheme} onChange={(e) => setScheme(e.target.value)}>
              <option value="warm-white">Warm white</option>
              <option value="bright-dim-1-3">1 bright 3 dim</option>
              <option value="cool-white">Cool white</option>
              <option value="july-4th">July 4th</option>
              <option value="st-patricks">St. Patrick&apos;s</option>
              <option value="christmas">Christmas</option>
              <option value="halloween">Halloween</option>
            </select>
            <div className="flex-actions" style={{ marginTop: 16 }}>
              <button type="button" className="btn" onClick={savePricing}>Save</button>
              <button type="button" className="btn ghost" onClick={() => setShowPricing(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <CampaignTour
        open={tour.open}
        step={tour.step}
        onNext={tour.next}
        onSkip={tour.dismiss}
        onFinish={tour.finish}
        targetRefs={{
          'pick-homes': tourPickHomesRef,
          'render-options': tourRenderOptionsRef,
          'make-quotes': tourMakeQuotesRef,
        }}
      />
    </div>
  );
}
