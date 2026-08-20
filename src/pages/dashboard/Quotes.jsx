import { useEffect, useState } from 'react';
import { PageHead, EmptyState, money } from '../../components/ui/index.js';
import { api } from '../../api/index.js';
import QRCode from '../../components/ui/QRCode.jsx';
import { SITE_HOME } from '../../config/site.js';
import '../templates/templates.css';

export default function Quotes() {
  const [renders, setRenders] = useState(null);
  const [active, setActive] = useState(null);
  const [copied, setCopied] = useState(false);
  const [mailTemplates, setMailTemplates] = useState([]);
  const [mailTemplateId, setMailTemplateId] = useState('starter-plain-render');
  const [mailBusy, setMailBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [mailMsg, setMailMsg] = useState('');
  const [verifyMsg, setVerifyMsg] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [mailStatus, setMailStatus] = useState(null);

  useEffect(() => {
    api.renders().then((d) => setRenders(d.renders || [])).catch(() => setRenders([]));
    api.mailStatus().then(setMailStatus).catch(() => {});
  }, []);

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
  }, [mailTemplateId]);

  const quoteUrl = (id) => `${window.location.origin}/app/quote/${id}`;

  function copy(id) {
    navigator.clipboard?.writeText(quoteUrl(id));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function verifyAddress() {
    if (!active?.id) return;
    setVerifyMsg('');
    setMailMsg('');
    setVerifyBusy(true);
    try {
      const res = await api.verifyQuoteAddresses({ renderIds: [active.id] });
      const row = res.results?.[0];
      if (row?.ok) {
        setVerifyMsg(row.message || 'Address looks good.');
      } else {
        setVerifyMsg(row?.message || 'Address could not be verified.');
      }
    } catch (e) {
      setVerifyMsg(e.message);
    } finally {
      setVerifyBusy(false);
    }
  }

  async function sendPostcard(live = false) {
    if (!active?.id || !active?.image_url) return;
    if (!mailTemplateId) {
      setMailMsg('Choose a postcard template.');
      return;
    }
    if (live) {
      const ok = window.confirm(
        `Send a REAL 6×9 postcard via Lob to:\n${active.address}\n\nThis charges ~$1+ for print + postage. Continue?`,
      );
      if (!ok) return;
    }
    setMailMsg('');
    setMailBusy(true);
    try {
      const res = await api.sendQuoteMail({
        templateId: mailTemplateId,
        renderIds: [active.id],
        demoConfirm: !live,
      });
      const row = res.results?.[0];
      if (res.sent > 0 && (row?.preview?.previewUrl || row?.preview?.frontUrl)) {
        setPreviewUrl(row.preview.previewUrl || row.preview.frontUrl);
        if (res.demo) {
          setMailMsg('Postcard PDF ready (demo — no postage charged).');
        } else {
          setMailMsg(`Sent via Lob! ID: ${row.lobId || 'ok'}. Postcard is printing and mailing to ${active.address}.`);
        }
      } else {
        setPreviewUrl('');
        setMailMsg(row?.message || row?.error || 'Could not send postcard.');
      }
    } catch (e) {
      setMailMsg(e.message);
    } finally {
      setMailBusy(false);
    }
  }

  const canMail = active?.image_url && active?.address && active.address !== 'Uploaded photo';

  return (
    <div>
      <PageHead title="Quotes" subtitle="Every rendered home has a private customer quote page and QR code." />

      {renders === null && <div className="card"><span className="spin" /></div>}

      {renders && renders.length === 0 && (
        <EmptyState ico="$" title="No quotes yet" action={<a href={SITE_HOME} className="btn">Render a home</a>}>
          Each render creates a shareable quote page with a QR code. They'll appear here.
        </EmptyState>
      )}

      {renders && renders.length > 0 && (
        <div className={'grid-quotes' + (active ? ' has-detail' : '')}>
          <div className="card card-table">
            <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Preview</th><th>Address</th><th>Estimate</th><th>Created by</th><th></th></tr></thead>
              <tbody>
                {renders.map((r) => (
                  <tr key={r.id} style={{ cursor: 'pointer', background: active?.id === r.id ? 'rgba(244,147,33,.08)' : undefined }} onClick={() => { setActive(r); setMailMsg(''); setVerifyMsg(''); setPreviewUrl(''); }}>
                    <td>{r.image_url ? <img src={r.image_url} alt="" style={{ width: 64, height: 42, objectFit: 'cover', borderRadius: 6 }} /> : '—'}</td>
                    <td>{r.address || 'Uploaded photo'}<div className="muted" style={{ fontSize: 12 }}>{r.roofline_feet ? r.roofline_feet + ' ft' : ''}</div></td>
                    <td style={{ fontWeight: 700 }}>{r.estimated_total ? money(r.estimated_total) : '—'}</td>
                    <td className="muted">{r.created_by || '—'}</td>
                    <td><span className="pill gold">View</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {active && (
            <div className="card sticky-panel" style={{ textAlign: 'center' }}>
              {active.image_url && <img className="rimg" src={active.image_url} alt="" style={{ marginBottom: 12 }} />}
              <div style={{ fontWeight: 700 }}>{active.address || 'Uploaded photo'}</div>
              {active.estimated_total && <div className="muted" style={{ marginBottom: 12 }}>Est. {money(active.estimated_total)}</div>}
              <div style={{ display: 'grid', placeItems: 'center', margin: '10px 0' }}>
                <QRCode value={quoteUrl(active.id)} size={150} />
              </div>
              <p className="muted" style={{ fontSize: 12.5 }}>Homeowner scans this to see their private quote page.</p>
              <a className="btn block" href={quoteUrl(active.id)} target="_blank" rel="noopener" style={{ marginBottom: 8 }}>Open quote page &rarr;</a>
              <button className="btn ghost block" onClick={() => copy(active.id)}>{copied ? 'Copied \u2713' : 'Copy link'}</button>

              <div className="mail-panel" style={{ textAlign: 'left', marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                  Direct mail this address
                </div>
                {!canMail && (
                  <p className="muted" style={{ fontSize: 12, margin: '0 0 10px', lineHeight: 1.45 }}>
                    Needs a street address (widget uploads without address cannot be mailed).
                  </p>
                )}
                <label className="field" style={{ margin: '0 0 6px' }}>Postcard template</label>
                <select
                  className="input"
                  value={mailTemplateId}
                  onChange={(e) => setMailTemplateId(e.target.value)}
                  disabled={mailBusy || verifyBusy}
                >
                  {mailTemplates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.is_starter ? ' (starter)' : ''}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn ghost block sm"
                  style={{ marginTop: 10 }}
                  disabled={!canMail || verifyBusy || mailBusy}
                  onClick={verifyAddress}
                >
                  {verifyBusy ? 'Checking…' : 'Check address'}
                </button>
                <button
                  type="button"
                  className="btn block sm"
                  style={{ marginTop: 8 }}
                  disabled={!canMail || mailBusy || verifyBusy || !mailTemplateId}
                  onClick={() => sendPostcard(false)}
                >
                  {mailBusy ? 'Working…' : 'Preview postcard (demo PDF)'}
                </button>
                {mailStatus?.readyForLive && (
                  <button
                    type="button"
                    className="btn block sm"
                    style={{ marginTop: 8 }}
                    disabled={!canMail || mailBusy || verifyBusy || !mailTemplateId}
                    onClick={() => sendPostcard(true)}
                  >
                    Send postcard to this address (~$1+)
                  </button>
                )}
                {mailStatus && !mailStatus.readyForLive && mailStatus.hints?.length > 0 && (
                  <p className="muted" style={{ fontSize: 11, marginTop: 10, lineHeight: 1.45 }}>
                    Live mail: {mailStatus.hints.join(' · ')}
                  </p>
                )}
                {verifyMsg && <p className="or-status" style={{ marginTop: 8, fontSize: 12 }}>{verifyMsg}</p>}
                {mailMsg && <p className="or-status" style={{ marginTop: 8, fontSize: 12 }}>{mailMsg}</p>}
                {previewUrl && (
                  <a className="btn ghost block sm" href={previewUrl} target="_blank" rel="noopener" style={{ marginTop: 8 }}>
                    Open postcard PDF →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
