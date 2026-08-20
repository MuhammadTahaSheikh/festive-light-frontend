import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/index.js';
import { money } from '../../components/ui/index.js';
import BrandLogo from '../../components/ui/BrandLogo.jsx';

const SCHEMES = [
  { id: 'warm-white', label: 'Warm white' },
  { id: 'july-4th', label: '4th of July' },
  { id: 'christmas', label: 'Christmas' },
];

// Downscale a picked image to a data URL to keep uploads small.
function downscale(file, maxDim) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const cw = Math.round(img.width * scale);
      const ch = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
      URL.revokeObjectURL(url);
      try { resolve(canvas.toDataURL('image/jpeg', 0.85)); } catch { resolve(null); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

export default function TryRender() {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [rate, setRate] = useState('40');
  const [scheme, setScheme] = useState('warm-white');
  const [step, setStep] = useState('form'); // form | loading | result | error
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  async function onPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await downscale(file, 1024);
    if (!data) { setErr('Could not read that image.'); return; }
    setImageBase64(data);
    setPreview(data);
    setErr('');
  }

  async function go() {
    if (!imageBase64) return setErr('Upload a photo of the home first.');
    if (!(Number(rate) > 0)) return setErr('Enter your price per foot.');
    setErr('');
    setStep('loading');
    try {
      const data = await api.render({ imageBase64, pricePerFoot: Number(rate), scheme });
      setResult(data);
      setStep('result');
    } catch (e2) {
      setErr(e2.message || 'Render failed.');
      setStep('error');
    }
  }

  return (
    <div style={{ padding: '30px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <Link to="/" className="brand brand--stacked" style={{ display: 'inline-flex', padding: 0, width: 'auto' }}>
          <BrandLogo variant="wordmarkLight" className="logo logo--wordmark" />
        </Link>
      </div>
      <div className="widget">
        {step === 'form' && (
          <>
            <h3>See your home lit up — free</h3>
            <p className="sub">Upload a photo, pick your colors, and watch it light up. Instant design + estimate.</p>

            <label className="field">Photo of the home</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
            <div
              className="card"
              style={{ textAlign: 'center', cursor: 'pointer', borderStyle: 'dashed' }}
              onClick={() => fileRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="preview" style={{ maxWidth: '100%', borderRadius: 10 }} />
              ) : (
                <div className="muted" style={{ padding: '18px 0' }}>Tap to upload a photo</div>
              )}
            </div>

            <label className="field">Your price per linear foot</label>
            <input className="input" type="number" min="1" value={rate} onChange={(e) => setRate(e.target.value)} />

            <label className="field">Light color</label>
            <div className="chips">
              {SCHEMES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={'chip' + (scheme === s.id ? ' on' : '')}
                  onClick={() => setScheme(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {err && <div className="err-box">{err}</div>}
            <button className="btn block" style={{ marginTop: 16 }} onClick={go}>Render my home free</button>
            <p className="muted" style={{ textAlign: 'center', fontSize: 11.5, marginTop: 8 }}>
              Free. No card. Instant estimate.
            </p>
          </>
        )}

        {step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <span className="spin" />
            <h3 style={{ marginTop: 16 }}>Lighting up your home…</h3>
            <p className="sub">Adding permanent lights and measuring the roofline.</p>
          </div>
        )}

        {step === 'result' && result && (
          <>
            <img className="rimg" src={result.imageUrl} alt="Your home lit up" />
            <div className="stats">
              {result.stats?.frontFeet && (
                <div className="stat"><div className="k">Front footage</div><div className="v">{Math.round(result.stats.frontFeet)} ft</div></div>
              )}
              {result.stats?.frontPrice && (
                <div className="stat"><div className="k">Front quote</div><div className="v">{money(result.stats.frontPrice)}</div></div>
              )}
              {result.stats?.wholeFeet && (
                <div className="stat"><div className="k">Whole-house footage</div><div className="v">{Math.round(result.stats.wholeFeet)} ft</div></div>
              )}
              {result.stats?.wholePrice && (
                <div className="stat"><div className="k">Whole-house quote</div><div className="v">{money(result.stats.wholePrice)}</div></div>
              )}
            </div>
            <a className="btn block" style={{ marginTop: 16 }} href="tel:+19412397919">Book my free consultation &rarr;</a>
            {result.quoteId && (
              <a className="btn ghost block" style={{ marginTop: 10 }} href={`/quote/${result.quoteId}`} target="_blank" rel="noopener">
                View my quote page &rarr;
              </a>
            )}
            <button className="btn ghost block" style={{ marginTop: 10 }} onClick={() => { setStep('form'); setResult(null); }}>
              Try another photo
            </button>
          </>
        )}

        {step === 'error' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <h3>Hmm.</h3>
            <p className="sub">{err}</p>
            <button className="btn ghost" onClick={() => setStep('form')}>Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}
