import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/index.js';
import { money } from '../../components/ui/index.js';
import AddressAutocomplete from '../../components/ui/AddressAutocomplete.jsx';
import './image-render.css';

const RENDER_COUNT_KEY = 'flp_free_renders';

const FACTS = [
  'Permanent lighting works every night of the year — not just December.',
  'One app changes your whole roofline: warm white, team colors, or full holiday.',
  'The lights tuck into a discreet track, so they disappear in daylight.',
  'Homeowners who see a render book 3× more design consultations.',
  'Reading your roofline…',
  'Placing the lights along every eave and peak…',
  'Balancing the evening glow…',
];

const SERVICES = [
  {
    id: 'permanent',
    label: 'Permanent',
    desc: 'Year-round roofline LEDs',
    sw: ['#fff3d6'],
  },
  {
    id: 'holiday',
    label: 'Holiday',
    desc: 'Festive multicolor roofline',
    sw: ['#e21d1d', '#1ea832', '#f2c14e', '#ffffff'],
  },
  {
    id: 'christmas',
    label: 'Christmas',
    desc: 'Full Christmas display',
    sw: ['#e21d1d', '#1ea832'],
  },
];

const COLOR_CHIPS = [
  { scheme: 'warm-white', label: 'Warm white', sw: ['#fff3d6'] },
  { scheme: 'bright-dim-1-3', label: '1 bright 3 dim', sw: ['#fff3d6', '#8a7355'] },
  { scheme: 'cool-white', label: 'Bright white', sw: ['#e8f4ff'] },
  { scheme: 'july-4th', label: '4th of July', sw: ['#e21d1d', '#ffffff', '#1d6fe2'] },
  { scheme: 'christmas', label: 'Red & Green', sw: ['#e21d1d', '#1ea832'] },
  { scheme: 'custom', label: 'Custom', sw: [] },
];

const PROMPT_STARTERS = [
  'Soft warm white lights along every eave and peak',
  'Red and green Christmas roofline with a wreath on the door',
  'Team colors — red and blue alternating on the roofline',
  'Cool white modern look plus soft landscape uplights on the trees',
];

function Swatches({ colors }) {
  if (!colors.length) return null;
  return (
    <span className="sw">
      {colors.map((c) => (
        <i key={c} style={{ background: c }} />
      ))}
    </span>
  );
}

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

function getRenderCount() {
  try { return Number(localStorage.getItem(RENDER_COUNT_KEY) || 0); }
  catch { return 0; }
}

function incrementRenderCount() {
  try { localStorage.setItem(RENDER_COUNT_KEY, String(getRenderCount() + 1)); }
  catch { /* ignore */ }
}

function validEmail(v) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
}

function isNearBlackHex(hex) {
  const m = String(hex || '').trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.08;
}

function serviceDefaults(service) {
  if (service === 'holiday') {
    return { scheme: 'holiday', decor: 'none', decorColor: 'multicolor', landscape: true };
  }
  if (service === 'christmas') {
    return { scheme: 'christmas', decor: 'christmas', decorColor: 'multicolor', landscape: true };
  }
  return { scheme: 'warm-white', decor: 'none', decorColor: 'warm-white', landscape: true };
}

export default function ImageRenderForm() {
  const fileRef = useRef(null);
  const factTimer = useRef(null);

  const [step, setStep] = useState('form');
  const [lightStyle, setLightStyle] = useState('classic'); // 'classic' | 'neon' — classic = existing look
  const [mode, setMode] = useState('quick'); // 'quick' | 'describe' — quick is the existing path
  const [userPrompt, setUserPrompt] = useState('');
  const [maxFreeRenders, setMaxFreeRenders] = useState(3);
  const [renderCount, setRenderCount] = useState(getRenderCount);
  const [mapsEnabled, setMapsEnabled] = useState(false);

  const [preview, setPreview] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [service, setService] = useState('permanent');
  const [address, setAddress] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [rate, setRate] = useState('40');
  const [scheme, setScheme] = useState('warm-white');
  const [customColors, setCustomColors] = useState([
    { hex: '#e21d1d', name: '' },
    { hex: '#ffffff', name: '' },
    { hex: '#1d6fe2', name: '' },
  ]);
  const [brightDimColor, setBrightDimColor] = useState({ hex: '#fff3d6', name: '' });
  const [landscape, setLandscape] = useState(true);
  const [decor, setDecor] = useState('none');
  const [decorColor, setDecorColor] = useState('warm-white');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [err, setErr] = useState('');
  const [fact, setFact] = useState(FACTS[0]);
  const [progress, setProgress] = useState('Reading your photo…');
  const [result, setResult] = useState(null);
  const submittingRef = useRef(false);

  const limitReached = renderCount >= maxFreeRenders;

  useEffect(() => {
    const base = String(import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
    fetch(`${base}/api/config`)
      .then((r) => r.json())
      .then((d) => {
        if (d.maxFreeRenders) setMaxFreeRenders(d.maxFreeRenders);
        if (d.maps) setMapsEnabled(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (limitReached) {
      setErr(`You have used your ${maxFreeRenders} free renders. Start a real campaign to render the whole street.`);
    }
  }, [limitReached, maxFreeRenders]);

  useEffect(() => () => {
    if (factTimer.current) clearInterval(factTimer.current);
  }, []);

  function selectService(id) {
    setService(id);
    const d = serviceDefaults(id);
    setScheme(d.scheme);
    setDecor(d.decor);
    setDecorColor(d.decorColor);
    setLandscape(d.landscape);
  }

  async function onPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await downscale(file, 1280);
    if (!data) { setErr('Could not read that image. Try a different photo.'); return; }
    setImageBase64(data);
    setPreview(data);
    setErr('');
  }

  function startFacts() {
    let i = 0;
    let p = 0;
    const progressSteps = [
      'Reading your photo…',
      'Tracing the roofline…',
      'Placing the lights…',
      'Setting the evening glow…',
      'Almost there…',
    ];
    setFact(FACTS[0]);
    setProgress(progressSteps[0]);
    factTimer.current = setInterval(() => {
      i = (i + 1) % FACTS.length;
      setFact(FACTS[i]);
      p = Math.min(p + 1, progressSteps.length - 1);
      setProgress(progressSteps[p]);
    }, 2600);
  }

  function stopFacts() {
    if (factTimer.current) {
      clearInterval(factTimer.current);
      factTimer.current = null;
    }
  }

  async function submit(previewOnly = false) {
    // Guard against double-clicks / concurrent submits firing two full renders
    // (double Gemini calls, double lead POST). Uses a ref so back-to-back
    // clicks in the same tick are blocked before React re-renders.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setErr('');
    const rateNum = parseFloat(rate) || 0;
    const promptText = userPrompt.trim();
    const isDescribe = mode === 'describe';

    if (!previewOnly && limitReached) {
      submittingRef.current = false;
      setErr(`You have used your ${maxFreeRenders} free renders. Start a real campaign to render the whole street.`);
      return;
    }
    const addr = address.trim();
    if (!imageBase64 && !(mapsEnabled && addr)) {
      submittingRef.current = false;
      return setErr(mapsEnabled
        ? 'Upload a photo of your home or enter your address.'
        : 'Upload a photo of your home first.');
    }
    if (!previewOnly && isDescribe && !promptText) {
      submittingRef.current = false;
      return setErr('Describe how you want the lights to look.');
    }
    if (!previewOnly && (!email || !validEmail(email))) {
      submittingRef.current = false;
      return setErr('Enter a valid email so we can send your render.');
    }

    if (!previewOnly) {
      api.lead({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        source: isDescribe ? 'image_render_prompt' : 'image_render',
      }).catch(() => {});
    }

    setStep('rendering');
    if (previewOnly) {
      setProgress('Fetching Street View…');
      setFact('Loading the house photo — no lighting yet.');
    } else {
      startFacts();
    }

    try {
      const payload = {
        previewOnly,
        imageBase64: imageBase64 || undefined,
        address: addr,
        placeId: placeId || undefined,
        email: email.trim() || undefined,
        pricePerFoot: rateNum,
        // Only send neon when selected so classic path stays identical to today.
        ...(lightStyle === 'neon' ? { lightStyle: 'neon' } : {}),
      };

      if (isDescribe && !previewOnly) {
        payload.userPrompt = promptText.slice(0, 800);
        payload.scheme = 'warm-white';
        payload.landscape = false;
        payload.decor = 'none';
        payload.decorColor = 'warm-white';
        payload.serviceType = 'permanent';
        payload.customColors = [];
      } else {
        payload.scheme = scheme;
        payload.customColors = scheme === 'bright-dim-1-3' ? [brightDimColor] : customColors;
        payload.landscape = landscape;
        payload.decor = decor;
        payload.decorColor = decorColor;
        payload.serviceType = service;
      }

      const data = await api.render(payload);

      stopFacts();
      if (!data.ok) throw new Error('render_failed');

      if (!previewOnly) {
        incrementRenderCount();
        setRenderCount(getRenderCount());
      }
      setResult(data);
      setStep('result');
    } catch (e) {
      stopFacts();
      const code = e.code || e.message || '';
      const msg = code === 'bad_image' || code === 'no_photo'
        ? 'That photo didn\'t come through. Try uploading a different one.'
        : code === 'no_house_found'
          ? 'No house found at this location. The view may show mostly street or empty area — try a different address or upload a photo of your home.'
          : code === 'address_not_found' || code === 'no_streetview'
            ? 'We couldn\'t find a street view for that address. Try a different address or upload a photo.'
            : code === 'server_not_configured'
              ? 'The render service isn\'t configured yet. Please add your API keys.'
              : 'We couldn\'t render that one. Please try another photo or address.';
      setErr(msg);
      setStep('form');
    } finally {
      submittingRef.current = false;
    }
  }

  function updateBrightDimColor(field, value) {
    setBrightDimColor((prev) => ({ ...prev, [field]: value }));
  }

  function updateCustomColor(i, field, value) {
    setCustomColors((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  }

  function removeCustomColor(i) {
    setCustomColors((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  function addCustomColor() {
    setCustomColors((prev) => (prev.length < 6 ? [...prev, { hex: '#ffaa33', name: '' }] : prev));
  }

  return (
    <div className="ir">
      <h3>See your home lit up — free</h3>
      <p className="sub">
        {mode === 'describe'
          ? 'Upload a photo (or enter an address), describe the look you want, and watch the lighting change — your house stays the same.'
          : mapsEnabled
            ? 'Type your address or upload a photo, pick your service, and watch it light up — your house stays the same, only the lighting changes.'
            : 'Upload a photo, pick your service, and watch it light up — your house stays the same, only the lighting changes.'}
      </p>

      <div className="style-toggle" role="tablist" aria-label="Light style">
        <button
          type="button"
          role="tab"
          aria-selected={lightStyle === 'classic'}
          className={'style-opt' + (lightStyle === 'classic' ? ' on' : '')}
          onClick={() => { setLightStyle('classic'); setErr(''); }}
        >
          <span className="style-opt-thumb">
            <img src="/style-previews/classic.png?v=2" alt="" />
          </span>
          <span className="style-opt-text">
            <span className="style-opt-label">Classic LEDs</span>
            <span className="style-opt-sub">Permanent pin lights</span>
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={lightStyle === 'neon'}
          className={'style-opt' + (lightStyle === 'neon' ? ' on' : '')}
          onClick={() => { setLightStyle('neon'); setErr(''); }}
        >
          <span className="style-opt-thumb">
            <img src="/style-previews/neon.png?v=2" alt="" />
          </span>
          <span className="style-opt-text">
            <span className="style-opt-label">Neon</span>
            <span className="style-opt-sub">Continuous eave glow</span>
          </span>
        </button>
      </div>

      <div className="mode-toggle" role="tablist" aria-label="Render mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'quick'}
          className={'mode-btn' + (mode === 'quick' ? ' on' : '')}
          onClick={() => { setMode('quick'); setErr(''); }}
        >
          Quick pick
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'describe'}
          className={'mode-btn' + (mode === 'describe' ? ' on' : '')}
          onClick={() => { setMode('describe'); setErr(''); }}
        >
          Describe look
        </button>
      </div>

      <div className={'st' + (step === 'form' ? ' on' : '')}>
        <label>
          Photo of your home{' '}
          {mapsEnabled && (
            <span style={{ color: '#8a857b', fontWeight: 500 }}>(optional if you enter an address)</span>
          )}
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPick}
          style={{ display: 'none' }}
        />
        <div
          className={'photo-zone' + (preview ? ' has-preview' : '')}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
        >
          {preview ? (
            <img src={preview} alt="Your home" className="photo-preview" />
          ) : (
            <div className="photo-placeholder">
              <span className="photo-icon">📷</span>
              <span>Tap to upload a front-of-house photo</span>
              <span className="photo-hint">Daytime, whole roofline visible works best</span>
            </div>
          )}
        </div>

        {mode === 'describe' ? (
          <>
            <label>Describe the lighting look</label>
            <textarea
              className="prompt-box"
              rows={4}
              maxLength={800}
              placeholder="Describe anything — lights, snow, carpet, mood…"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
            />
            <div className="prompt-meta">
              <span>{userPrompt.length}/800</span>
            </div>
            <div className="prompt-starters">
              {PROMPT_STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="starter"
                  onClick={() => setUserPrompt(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <label>Your service</label>
            <div className="chips">
              {SERVICES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={'chip service-chip' + (service === s.id ? ' on' : '')}
                  onClick={() => selectService(s.id)}
                >
                  <span className="service-label">{s.label}</span>
                  <span className="service-desc">{s.desc}</span>
                  <Swatches colors={s.sw} />
                </button>
              ))}
            </div>

            {service === 'permanent' && (
              <>
                <label>Light color</label>
                <div className="chips">
                  {COLOR_CHIPS.map((c) => (
                    <button
                      key={c.scheme}
                      type="button"
                      className={'chip' + (scheme === c.scheme ? ' on' : '')}
                      onClick={() => setScheme(c.scheme)}
                    >
                      {c.label}
                      <Swatches colors={c.sw} />
                    </button>
                  ))}
                </div>

                {scheme === 'bright-dim-1-3' && (
                  <div>
                    <p className="field-hint" style={{ margin: '0 0 8px', fontSize: 13, opacity: 0.75 }}>
                      Use the color square to pick the LED color (not just the name). Pattern: 1 bright cone, then 3 faint dots.
                    </p>
                    <div className="ccs">
                      <div className="cc">
                        <input
                          type="color"
                          value={brightDimColor.hex}
                          onChange={(e) => updateBrightDimColor('hex', e.target.value)}
                          title="LED color"
                        />
                        <input
                          type="text"
                          className="cn"
                          placeholder="optional name"
                          value={brightDimColor.name}
                          onChange={(e) => updateBrightDimColor('name', e.target.value)}
                        />
                      </div>
                    </div>
                    {isNearBlackHex(brightDimColor.hex) && (
                      <p className="field-hint" style={{ margin: '8px 0 0', fontSize: 12, opacity: 0.75 }}>
                        Near-black can&apos;t glow like warm white — render will use a deep cool charcoal look, not amber.
                      </p>
                    )}
                  </div>
                )}

                {scheme === 'custom' && (
                  <div>
                    <div className="ccs">
                      {customColors.map((c, i) => (
                        <div key={i} className="cc">
                          <input
                            type="color"
                            value={c.hex}
                            onChange={(e) => updateCustomColor(i, 'hex', e.target.value)}
                          />
                          <input
                            type="text"
                            className="cn"
                            placeholder="optional name"
                            value={c.name}
                            onChange={(e) => updateCustomColor(i, 'name', e.target.value)}
                          />
                          {customColors.length > 1 && (
                            <button type="button" className="del" onClick={() => removeCustomColor(i)}>×</button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button type="button" className="btn ghost" style={{ marginTop: 8, padding: '9px 14px', fontSize: 13 }} onClick={addCustomColor}>
                      + Add a color
                    </button>
                  </div>
                )}

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto', margin: 0 }}
                    checked={landscape}
                    onChange={(e) => setLandscape(e.target.checked)}
                  />
                  Add landscape lighting
                </label>
              </>
            )}

            {service === 'holiday' && (
              <p className="service-note">
                Festive multicolor roofline lights with optional garland at the entry. Your house structure stays exactly the same.
              </p>
            )}

            {service === 'christmas' && (
              <>
                <p className="service-note">
                  Red &amp; green roofline, wreath, garland, and shrub wraps — added to your existing home only.
                </p>
                <label>Decoration lights</label>
                <div className="chips">
                  <button
                    type="button"
                    className={'chip' + (decorColor === 'warm-white' ? ' on' : '')}
                    onClick={() => setDecorColor('warm-white')}
                  >
                    Warm white
                    <Swatches colors={['#fff3d6']} />
                  </button>
                  <button
                    type="button"
                    className={'chip' + (decorColor === 'multicolor' ? ' on' : '')}
                    onClick={() => setDecorColor('multicolor')}
                  >
                    Multicolor
                    <Swatches colors={['#e21d1d', '#1ea832', '#1d6fe2', '#f2c14e']} />
                  </button>
                </div>
              </>
            )}
          </>
        )}

        <label>
          Your price per linear foot{' '}
          <span style={{ color: '#8a857b', fontWeight: 500 }}>(optional)</span>
        </label>
        <div className="rate">
          <span className="pre">$</span>
          <input
            type="number"
            min="1"
            step="0.25"
            inputMode="decimal"
            style={{ paddingLeft: 24 }}
            placeholder="e.g. 40"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>

        <label>
          Property address{' '}
          <span style={{ color: '#8a857b', fontWeight: 500 }}>
            {mapsEnabled ? '(or upload a photo above)' : '(optional)'}
          </span>
        </label>
        <AddressAutocomplete
          value={address}
          placeholder="Start typing your street address"
          onChange={setAddress}
          onSelect={({ placeId: pid }) => setPlaceId(pid || '')}
        />

        <div className="row2">
          <div>
            <label>Your name</label>
            <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label>Email</label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <label>
          Mobile <span style={{ color: '#8a857b', fontWeight: 500 }}>(optional)</span>
        </label>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {err && <div className="err">{err}</div>}

        <button className="btn" type="button" onClick={() => submit(false)} disabled={limitReached}>
          {mode === 'describe' ? 'Light it up from my prompt →' : 'Render my home free'}
        </button>
        {mapsEnabled && (
          <button
            className="btn ghost"
            type="button"
            style={{ marginTop: 10 }}
            onClick={() => submit(true)}
          >
            Check address only (no lights)
          </button>
        )}
        <p className="note">
          {maxFreeRenders} free renders. Same house, same yard — only lights and decor are added.
        </p>
      </div>

      <div className={'st' + (step === 'rendering' ? ' on' : '')}>
        <div className="ctr">
          <div className="fact">{fact}</div>
          <span className="spin" />
          <h3 style={{ fontSize: 21 }}>Lighting up your home…</h3>
          <p className="sub">{progress}</p>
        </div>
      </div>

      <div className={'st' + (step === 'result' ? ' on' : '')}>
        {result && (
          <>
            <img className="rimg" src={result.imageUrl} alt={result.preview ? 'Street View of your home' : 'Your home with lighting'} />
            <div className="stats">
              {result.stats?.frontFeet && (
                <div className="stat">
                  <div className="k">Front footage</div>
                  <div className="v">{Math.round(result.stats.frontFeet)} ft</div>
                </div>
              )}
              {result.stats?.frontPrice && rate && (
                <div className="stat">
                  <div className="k">Front quote</div>
                  <div className="v">{money(result.stats.frontPrice)}</div>
                </div>
              )}
              {result.stats?.wholeFeet && (
                <div className="stat">
                  <div className="k">Whole-house footage</div>
                  <div className="v">{Math.round(result.stats.wholeFeet)} ft</div>
                </div>
              )}
              {result.stats?.wholePrice && rate && (
                <div className="stat">
                  <div className="k">Whole-house quote</div>
                  <div className="v">{money(result.stats.wholePrice)}</div>
                </div>
              )}
            </div>
            {result.preview && (
              <p className="note" style={{ marginTop: 10, textAlign: 'center' }}>
                {result.address
                  ? `Street View for ${result.address}${result.streetView?.verifiedAddress ? ` (camera aimed at lot verified as ${result.streetView.verifiedAddress.split(',')[0]})` : ''}. Footage estimated from the building footprint — enter your $/ft above to see quotes.`
                  : 'Footage estimated from the building footprint. No lighting on this preview.'}
              </p>
            )}
            {!result.preview && result.quoteId && (
              <a
                className="btn ghost"
                href={`/quote/${result.quoteId}`}
                target="_blank"
                rel="noopener"
                style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 10 }}
              >
                See the customer&apos;s quote page →
              </a>
            )}
            {!result.preview && (
            <button
              className="btn ghost"
              type="button"
              style={{ marginTop: 10 }}
              onClick={() => { setStep('form'); setResult(null); }}
            >
              Try another photo
            </button>
            )}
            {result.preview && (
            <button
              className="btn ghost"
              type="button"
              style={{ marginTop: 10 }}
              onClick={() => { setStep('form'); setResult(null); }}
            >
              Try again
            </button>
            )}
            {!result.preview && (
            <p className="note">
              Final pricing confirmed at your free on-site measurement.
            </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
