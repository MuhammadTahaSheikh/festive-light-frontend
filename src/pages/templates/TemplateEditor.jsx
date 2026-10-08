import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHead } from '../../components/ui/index.js';
import { api, setAccountEmail } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import PostcardCanvas from './PostcardCanvas.jsx';
import { ELEMENT_TYPES, newElement, BLANK_TEMPLATE_FRONT, BLANK_TEMPLATE_BACK, POSTCARD_SIZES, DEFAULT_POSTCARD_FORMAT, resizeSideToFormat, layoutsFromTemplate, FONT_FAMILIES } from './templateUtils.js';
import { layoutAnchoredElements, drawnImageBox } from './anchorLayout.js';
import './templates.css';

function finiteInches(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed || trimmed === '-' || trimmed === '.' || trimmed === '-.') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function applyGeom(sideState, elementId, patch) {
  if (!sideState || !elementId || !patch) return sideState;
  const elements = (sideState.elements || []).map((el) => (el.id === elementId ? { ...el, ...patch } : el));
  return { ...sideState, elements: layoutAnchoredElements(elements) };
}

function readGeomPatch(root) {
  if (!root) return null;
  const patch = {};
  root.querySelectorAll('input[data-geom]').forEach((input) => {
    const n = finiteInches(input.value);
    if (n != null) patch[input.dataset.geom] = n;
  });
  return Object.keys(patch).length ? patch : null;
}

export default function TemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = id === 'new';
  const fileInputRef = useRef(null);
  const pendingImageId = useRef(null);
  const dirtyRef = useRef(false);
  const geomCapture = useRef(null);
  const loadGen = useRef(0);

  const [name, setName] = useState('Untitled template');
  const [category, setCategory] = useState('Uncategorized');
  const [front, setFront] = useState(() => ({ ...BLANK_TEMPLATE_FRONT, elements: [...BLANK_TEMPLATE_FRONT.elements] }));
  const [back, setBack] = useState(() => ({ ...BLANK_TEMPLATE_BACK, elements: [] }));
  const [side, setSide] = useState('front');
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [savedId, setSavedId] = useState(isNew ? null : id);
  const [format, setFormat] = useState(DEFAULT_POSTCARD_FORMAT);
  const [layouts, setLayouts] = useState({});
  const [notice, setNotice] = useState('');
  const [geomDraft, setGeomDraft] = useState(null);

  const currentSide = side === 'front' ? front : back;
  const setCurrentSide = side === 'front' ? setFront : setBack;
  const draftRef = useRef(null);
  draftRef.current = { front, back, side, selectedId, name, category, format, savedId, layouts };

  const load = useCallback(async () => {
    if (isNew) return;
    const gen = ++loadGen.current;
    if (user?.email) setAccountEmail(user.email);
    try {
      const d = await api.template(id);
      if (gen !== loadGen.current || dirtyRef.current) return;
      const t = d.template;
      setName(t.name);
      setCategory(t.category || 'Uncategorized');
      const pack = layoutsFromTemplate(t);
      setLayouts(pack.layouts);
      setFront(pack.layouts[pack.format].front);
      setBack(pack.layouts[pack.format].back);
      setFormat(pack.format);
      setSavedId(t.id);
    } catch (e) {
      if (gen !== loadGen.current || dirtyRef.current) return;
      setErr(e.message);
    }
  }, [id, isNew, user?.email]);

  useEffect(() => { load(); }, [load]);

  const selected = (currentSide.elements || []).find((e) => e.id === selectedId);

  function markDirty() {
    dirtyRef.current = true;
    setNotice((current) => (current ? '' : current));
  }

  function updateElement(elementId, patch) {
    if (!elementId) return;
    markDirty();
    setCurrentSide((s) => {
      let elements = (s.elements || []).map((e) => {
        if (e.id !== elementId) return e;
        const next = { ...e, ...patch };
        if (Object.prototype.hasOwnProperty.call(patch, 'fontFamily') && !patch.fontFamily) {
          delete next.fontFamily;
        }
        return next;
      });
      const edited = elements.find((e) => e.id === elementId);
      if (edited?.follow && patch.fontSize != null) {
        const parent = elements.find((e) => e.id === edited.follow);
        if (parent) {
          const box = drawnImageBox(parent);
          const textH = (Number(edited.fh) || 0.2) * box.h;
          if (textH > 0) {
            elements = elements.map((e) => (
              e.id === elementId ? { ...e, fontScale: patch.fontSize / textH } : e
            ));
          }
        }
      }
      return { ...s, elements: layoutAnchoredElements(elements) };
    });
  }

  function updateSelected(patch) {
    updateElement(selectedId, patch);
  }

  function addElement(type) {
    markDirty();
    const el = newElement(type, format);
    setCurrentSide((s) => ({ ...s, elements: [...(s.elements || []), el] }));
    setSelectedId(el.id);
    if (type === 'image' || type === 'logo') {
      pendingImageId.current = el.id;
      setTimeout(() => fileInputRef.current?.click(), 0);
    }
  }

  function removeSelected() {
    if (!selectedId) return;
    markDirty();
    setCurrentSide((s) => ({ ...s, elements: s.elements.filter((e) => e.id !== selectedId) }));
    setSelectedId(null);
  }

  function requestImageUpload(elementId) {
    pendingImageId.current = elementId;
    setSelectedId(elementId);
    fileInputRef.current?.click();
  }

  function onImageFile(e) {
    const file = e.target.files?.[0];
    const targetId = pendingImageId.current || selectedId;
    e.target.value = '';
    if (!file || !targetId) return;
    if (!file.type.startsWith('image/')) {
      setErr('Please choose an image file (PNG, JPG, etc.).');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErr('Image must be under 4 MB.');
      return;
    }
    setErr('');
    const reader = new FileReader();
    reader.onload = () => updateElement(targetId, { src: reader.result });
    reader.onerror = () => setErr('Could not read image file.');
    reader.readAsDataURL(file);
  }

  const isTextLike = selected && ['text', 'price'].includes(selected.type);
  const isAddress = selected && selected.type === 'address';
  const isImageLike = selected && ['image', 'logo'].includes(selected.type);
  const isRect = selected && selected.type === 'rect';
  const showFontControls = selected && ['text', 'price', 'address'].includes(selected.type);

  function captureGeom() {
    geomCapture.current = readGeomPatch(document.querySelector('.tpl-props'));
  }

  async function save() {
    const draft = draftRef.current;
    const patch = geomCapture.current || readGeomPatch(document.querySelector('.tpl-props'));
    geomCapture.current = null;
    let nextFront = draft.front;
    let nextBack = draft.back;
    if (patch && draft.selectedId) {
      if (draft.side === 'front') nextFront = applyGeom(nextFront, draft.selectedId, patch);
      else nextBack = applyGeom(nextBack, draft.selectedId, patch);
    }
    loadGen.current += 1;
    setBusy(true);
    setErr('');
    setNotice('');
    try {
      if (user?.email) setAccountEmail(user.email);
      const sizeLayouts = {
        ...(draft.layouts || {}),
        [draft.format]: { front: nextFront, back: nextBack },
      };
      const res = await api.saveTemplate({
        id: draft.savedId || undefined,
        name: draft.name,
        category: draft.category,
        format: draft.format,
        front: nextFront,
        back: nextBack,
        layouts: sizeLayouts,
      });
      const t = res.template;
      dirtyRef.current = false;
      const pack = layoutsFromTemplate({
        ...t,
        layouts: t.layouts && Object.keys(t.layouts).length ? t.layouts : sizeLayouts,
        format: t.format || draft.format,
      });
      setSavedId(t.id);
      setName(t.name || draft.name);
      setLayouts(pack.layouts);
      setFormat(pack.format);
      setFront(pack.layouts[pack.format].front);
      setBack(pack.layouts[pack.format].back);
      setGeomDraft(null);
      setNotice('Saved');
      if (isNew) navigate(`/templates/${t.id}`, { replace: true });
      return true;
    } catch (e) {
      setErr(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function deleteTemplate() {
    if (!savedId || isNew) return;
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.deleteTemplate(savedId);
      navigate('/templates');
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  async function previewPdf() {
    if (dirtyRef.current || !savedId || id === 'new') {
      const ok = await save();
      if (!ok) return;
    }
    const draft = draftRef.current;
    const tid = draft.savedId;
    if (!tid) return;
    try {
      const renders = await api.renders();
      const renderId = renders.renders?.[0]?.id;
      const res = await api.previewTemplate(tid, { renderId, format: draft.format });
      const url = res.preview?.previewUrl || res.preview?.frontUrl;
      if (url) window.open(url, '_blank');
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="tpl-page tpl-editor-page">
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onImageFile} />

      <PageHead
        title={name}
        subtitle={`Drag elements on the canvas · click image slots to upload · ${POSTCARD_SIZES[format]?.label || format}`}
      >
        <button type="button" className="btn ghost sm" onClick={() => navigate('/templates')}>← Templates</button>
        <button type="button" className="btn ghost sm" onClick={previewPdf}>Preview PDF</button>
        {savedId && !isNew && (
          <button type="button" className="btn ghost sm danger" disabled={busy} onClick={deleteTemplate}>Delete</button>
        )}
        <button type="button" className="btn sm" disabled={busy} onMouseDown={captureGeom} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        {notice && <span className="muted" style={{ fontSize: 13, alignSelf: 'center' }}>{notice}</span>}
      </PageHead>

      {err && <div className="card" style={{ marginBottom: 12, color: 'var(--red)' }}>{err}</div>}

      {isNew && (
        <div className="card tpl-hint" style={{ marginBottom: 12, padding: '12px 14px', borderColor: 'rgba(76,141,255,.35)', background: 'rgba(76,141,255,.08)' }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--muted-2)' }}>
            Add elements from the left, drag them where you want, and click any image box to upload your artwork.
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 12, padding: 12 }}>
        <div className="grid-2">
          <div>
            <label className="field">Template name</label>
            <input className="input" value={name} onChange={(e) => { markDirty(); setName(e.target.value); }} />
          </div>
          <div>
            <label className="field">Category</label>
            <select className="input" value={category} onChange={(e) => { markDirty(); setCategory(e.target.value); }}>
              {['Eye-Catching', 'Holiday', 'Luxury', 'Patriotic', 'Uncategorized'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="field">Card size (Lob)</label>
          <select
            className="input"
            value={format}
            onChange={(e) => {
              const next = e.target.value;
              const draft = draftRef.current;
              if (!next || next === draft.format) return;
              markDirty();
              const sizeLayouts = {
                ...(draft.layouts || {}),
                [draft.format]: { front: draft.front, back: draft.back },
              };
              if (!sizeLayouts[next]) {
                sizeLayouts[next] = {
                  front: resizeSideToFormat(draft.front, draft.format, next),
                  back: resizeSideToFormat(draft.back, draft.format, next),
                };
              }
              setLayouts(sizeLayouts);
              setFront(sizeLayouts[next].front);
              setBack(sizeLayouts[next].back);
              setFormat(next);
              setSelectedId(null);
              setGeomDraft(null);
            }}
          >
            {Object.values(POSTCARD_SIZES).map((s) => (
              <option key={s.id} value={s.id}>{s.label} postcard</option>
            ))}
          </select>
          <p className="muted" style={{ fontSize: 12, margin: '6px 0 0', lineHeight: 1.45 }}>
            Each card size keeps its own layout. A font or size change on 6×11 stays on 6×11.
          </p>
        </div>
      </div>

      <div className="tpl-tabs">
        <button type="button" className={side === 'front' ? 'active' : ''} onClick={() => setSide('front')}>FRONT</button>
        <button type="button" className={side === 'back' ? 'active' : ''} onClick={() => setSide('back')}>BACK</button>
      </div>

      <div className="tpl-editor">
        <aside className="tpl-side card">
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', marginBottom: 4 }}>ADD ELEMENTS</div>
          {ELEMENT_TYPES.map((t) => (
            <button key={t.type} type="button" onClick={() => addElement(t.type)}>
              {t.icon} {t.label}
            </button>
          ))}
          <p className="muted" style={{ fontSize: 11, lineHeight: 1.4, margin: '8px 0 0' }}>
            Image/Logo opens your file picker. Drag any element to reposition; use the gold corner to resize.
          </p>
        </aside>

        <PostcardCanvas
          side={currentSide}
          format={format}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onUpdateElement={updateElement}
          onRequestImageUpload={requestImageUpload}
        />

        <aside className="tpl-props card">
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)' }}>PROPERTIES</div>
          {!selected && <p className="muted" style={{ fontSize: 13 }}>Click an element to select it, or drag on the canvas.</p>}
          {selected && (
            <>
              <label>Type</label>
              <input value={selected.type} disabled />
              {isImageLike && (
                <>
                  <button type="button" className="btn sm block" style={{ marginTop: 8 }} onClick={() => requestImageUpload(selected.id)}>
                    {selected.src ? 'Change image' : 'Upload image'}
                  </button>
                  {selected.src && (
                    <button type="button" className="btn ghost sm block" style={{ marginTop: 6 }} onClick={() => updateSelected({ src: '' })}>
                      Remove image
                    </button>
                  )}
                </>
              )}
              {(isTextLike) && (
                <>
                  <label>Text</label>
                  <textarea rows={2} value={selected.text || ''} onChange={(e) => updateSelected({ text: e.target.value })} />
                </>
              )}
              {isRect && (
                <>
                  <label>Fill color</label>
                  <input value={selected.fill || '#333333'} onChange={(e) => updateSelected({ fill: e.target.value })} />
                </>
              )}
              {showFontControls && (
                <>
                  <label>Font</label>
                  <select
                    value={FONT_FAMILIES.some((font) => font.id === selected.fontFamily) ? selected.fontFamily : ''}
                    onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                  >
                    {FONT_FAMILIES.map((font) => (
                      <option key={font.id || 'default'} value={font.id}>{font.label}</option>
                    ))}
                  </select>
                  <label>Font size</label>
                  <input type="number" value={selected.fontSize || 14} onChange={(e) => updateSelected({ fontSize: parseInt(e.target.value, 10) || 14 })} />
                  <label>Color</label>
                  <input value={selected.color || '#ffffff'} onChange={(e) => updateSelected({ color: e.target.value })} />
                  {!isAddress && (
                    <>
                      <label>Align</label>
                      <select value={selected.align || 'left'} onChange={(e) => updateSelected({ align: e.target.value })}>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </>
                  )}
                </>
              )}
              <details style={{ marginTop: 12 }}>
                <summary className="muted" style={{ fontSize: 12, cursor: 'pointer' }}>Fine-tune position (inches)</summary>
                {['x', 'y', 'w', 'h'].map((field) => {
                  const label = { x: 'X', y: 'Y', w: 'Width', h: 'Height' }[field];
                  const fallback = field === 'w' || field === 'h' ? 1 : 0;
                  const editing = geomDraft?.id === selected.id && geomDraft.field === field;
                  return (
                    <div key={field}>
                      <label>{label}</label>
                      <input
                        type="number"
                        step="any"
                        data-geom={field}
                        value={editing ? geomDraft.value : (selected[field] ?? fallback)}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setGeomDraft({ id: selected.id, field, value: raw });
                          const n = finiteInches(raw);
                          if (n != null) updateSelected({ [field]: n });
                        }}
                        onBlur={() => setGeomDraft(null)}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return;
                          e.preventDefault();
                          captureGeom();
                          e.currentTarget.blur();
                          save();
                        }}
                      />
                    </div>
                  );
                })}
              </details>
              <label>Background ({side})</label>
              <input
                value={currentSide.background || '#0b0b0d'}
                onChange={(e) => {
                  const background = e.target.value;
                  markDirty();
                  setCurrentSide((s) => ({ ...s, background }));
                }}
              />
              <button type="button" className="btn ghost sm block" style={{ marginTop: 12 }} onClick={removeSelected}>Remove element</button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
