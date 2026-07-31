export const OUTREACH_SCHEMES = [
  { scheme: 'warm-white', label: 'Warm white', sw: ['#fff3d6'] },
  { scheme: 'bright-dim-1-3', label: '1 bright 3 dim', sw: ['#fff3d6', '#8a7355'] },
  { scheme: 'cool-white', label: 'Cool white', sw: ['#e8f4ff'] },
  { scheme: 'july-4th', label: 'July 4th', sw: ['#e21d1d', '#ffffff', '#1d6fe2'] },
  { scheme: 'st-patricks', label: "St. Patrick's", sw: ['#1ea832', '#f2c14e'] },
  { scheme: 'christmas', label: 'Christmas', sw: ['#e21d1d', '#1ea832'] },
  { scheme: 'halloween', label: 'Halloween', sw: ['#e67e22', '#7b2cbf'] },
  { scheme: 'custom', label: 'Custom', sw: [] },
];

export const DECOR_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'christmas', label: 'Christmas wreath & garland' },
];

function Swatches({ colors }) {
  if (!colors.length) return null;
  return (
    <span className="or-sw">
      {colors.map((c) => (
        <i key={c} style={{ background: c }} />
      ))}
    </span>
  );
}

export default function RenderOptionsPanel({
  lightStyle = 'classic',
  onLightStyle,
  scheme,
  onScheme,
  customColors,
  onCustomColors,
  brightDimColor = { hex: '#fff3d6', name: '' },
  onBrightDimColor,
  landscape,
  onLandscape,
  decor,
  onDecor,
  pricePerFoot,
  onPricePerFoot,
  disabled,
}) {
  function updateCustomColor(i, field, value) {
    onCustomColors((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  }

  function removeCustomColor(i) {
    onCustomColors((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  function addCustomColor() {
    onCustomColors((prev) => (prev.length < 6 ? [...prev, { hex: '#ffaa33', name: '' }] : prev));
  }

  function updateBrightDimColor(field, value) {
    if (typeof onBrightDimColor === 'function') {
      onBrightDimColor((prev) => ({ ...prev, [field]: value }));
    }
  }

  return (
    <div className="or-options">
      <div className="or-options-title">Light style</div>
      <div className="or-style-toggle" role="tablist" aria-label="Light style">
        <button
          type="button"
          role="tab"
          aria-selected={lightStyle === 'classic'}
          className={'or-style-opt' + (lightStyle === 'classic' ? ' on' : '')}
          onClick={() => onLightStyle?.('classic')}
          disabled={disabled}
        >
          <span className="or-style-thumb">
            <img src="/style-previews/classic.png?v=2" alt="" />
          </span>
          <span className="or-style-text">
            <span className="or-style-label">Classic LEDs</span>
            <span className="or-style-sub">Permanent pin lights</span>
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={lightStyle === 'neon'}
          className={'or-style-opt' + (lightStyle === 'neon' ? ' on' : '')}
          onClick={() => onLightStyle?.('neon')}
          disabled={disabled}
        >
          <span className="or-style-thumb">
            <img src="/style-previews/neon.png?v=2" alt="" />
          </span>
          <span className="or-style-text">
            <span className="or-style-label">Neon</span>
            <span className="or-style-sub">Continuous eave glow</span>
          </span>
        </button>
      </div>

      <div className="or-options-title">Light color</div>
      <div className="or-chips">
        {OUTREACH_SCHEMES.map((c) => (
          <button
            key={c.scheme}
            type="button"
            className={'or-chip' + (scheme === c.scheme ? ' on' : '')}
            onClick={() => onScheme(c.scheme)}
            disabled={disabled}
          >
            {c.label}
            <Swatches colors={c.sw} />
          </button>
        ))}
      </div>

      {scheme === 'bright-dim-1-3' && (
        <div className="or-custom-colors">
          <div className="or-custom-colors-hint">
            Use the color square for LED color (name is optional). 1 bright cone, then 3 faint dots.
          </div>
          <div className="or-custom-color">
            <input
              type="color"
              value={brightDimColor.hex}
              onChange={(e) => updateBrightDimColor('hex', e.target.value)}
              disabled={disabled}
              title="LED color"
            />
            <input
              type="text"
              className="input or-custom-name"
              placeholder="optional name"
              value={brightDimColor.name}
              onChange={(e) => updateBrightDimColor('name', e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {scheme === 'custom' && (
        <div className="or-custom-colors">
          {customColors.map((c, i) => (
            <div key={i} className="or-custom-color">
              <input
                type="color"
                value={c.hex}
                onChange={(e) => updateCustomColor(i, 'hex', e.target.value)}
                disabled={disabled}
              />
              <input
                type="text"
                className="input or-custom-name"
                placeholder="optional name"
                value={c.name}
                onChange={(e) => updateCustomColor(i, 'name', e.target.value)}
                disabled={disabled}
              />
              {customColors.length > 1 && (
                <button
                  type="button"
                  className="or-custom-del"
                  onClick={() => removeCustomColor(i)}
                  disabled={disabled}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="btn ghost or-custom-add"
            onClick={addCustomColor}
            disabled={disabled || customColors.length >= 6}
          >
            + Add a color
          </button>
        </div>
      )}

      <label className="or-check">
        <input
          type="checkbox"
          checked={landscape}
          onChange={(e) => onLandscape(e.target.checked)}
          disabled={disabled}
        />
        Include landscape lighting
      </label>

      <label className="or-field">Holiday decorations</label>
      <select
        className="input"
        value={decor}
        onChange={(e) => onDecor(e.target.value)}
        disabled={disabled}
      >
        {DECOR_OPTIONS.map((d) => (
          <option key={d.value} value={d.value}>{d.label}</option>
        ))}
      </select>

      <label className="or-field">Price per linear foot ($)</label>
      <div className="or-rate">
        <span className="or-pre">$</span>
        <input
          className="input"
          type="number"
          min="1"
          step="0.25"
          placeholder="e.g. 40"
          value={pricePerFoot}
          onChange={(e) => onPricePerFoot(e.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
