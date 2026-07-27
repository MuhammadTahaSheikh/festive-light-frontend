import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHead } from '../../components/ui/index.js';
import { api } from '../../api/client.js';
import PostcardCanvas from './PostcardCanvas.jsx';
import { ELEMENT_TYPES, newElement, BLANK_TEMPLATE_FRONT, BLANK_TEMPLATE_BACK } from './templateUtils.js';
import './templates.css';

export default function TemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const fileInputRef = useRef(null);
  const pendingImageId = useRef(null);

  const [name, setName] = useState('Untitled template');
  const [category, setCategory] = useState('Uncategorized');
  const [front, setFront] = useState(() => ({ ...BLANK_TEMPLATE_FRONT, elements: [...BLANK_TEMPLATE_FRONT.elements] }));
  const [back, setBack] = useState(() => ({ ...BLANK_TEMPLATE_BACK, elements: [] }));
  const [side, setSide] = useState('front');
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [savedId, setSavedId] = useState(isNew ? null : id);

  const currentSide = side === 'front' ? front : back;
  const setCurrentSide = side === 'front' ? setFront : setBack;

  const load = useCallback(async () => {
    if (isNew) return;
    try {
      const d = await api.template(id);
      const t = d.template;
      setName(t.name);
      setCategory(t.category || 'Uncategorized');
      setFront(t.front || { background: '#0b0b0d', elements: [] });
      setBack(t.back || { background: '#141416', elements: [] });
      setSavedId(t.id);
    } catch (e) {
      setErr(e.message);
    }
  }, [id, isNew]);

  useEffect(() => { load(); }, [load]);

  const selected = (currentSide.elements || []).find((e) => e.id === selectedId);

  function updateElement(elementId, patch) {
    if (!elementId) return;
    setCurrentSide((s) => ({
      ...s,
      elements: s.elements.map((e) => (e.id === elementId ? { ...e, ...patch } : e)),
    }));
  }

  function updateSelected(patch) {
    updateElement(selectedId, patch);
  }

  function addElement(type) {
    const el = newElement(type);
    setCurrentSide((s) => ({ ...s, elements: [...(s.elements || []), el] }));
    setSelectedId(el.id);
    if (type === 'image' || type === 'logo') {
      pendingImageId.current = el.id;
      setTimeout(() => fileInputRef.current?.click(), 0);
    }
  }

  function removeSelected() {
    if (!selectedId) return;
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

  async function save() {
    setBusy(true);
    setErr('');
    try {
      const res = await api.saveTemplate({
        id: savedId || undefined,
        name,
        category,
        format: '6x9',
        front,
        back,
      });
      setSavedId(res.template.id);
      if (isNew) navigate(`/templates/${res.template.id}`, { replace: true });
    } catch (e) {
      setErr(e.message);
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
    const tid = savedId || id;
    if (!tid || tid === 'new') {
      await save();
      return;
    }
    try {
      const renders = await api.renders();
      const renderId = renders.renders?.[0]?.id;
      const res = await api.previewTemplate(tid, { renderId });
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
        subtitle="Drag elements on the canvas · click image slots to upload"
      >
        <button type="button" className="btn ghost sm" onClick={() => navigate('/templates')}>← Templates</button>
        <button type="button" className="btn ghost sm" onClick={previewPdf}>Preview PDF</button>
        {savedId && !isNew && (
          <button type="button" className="btn ghost sm danger" disabled={busy} onClick={deleteTemplate}>Delete</button>
        )}
        <button type="button" className="btn sm" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
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
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="field">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {['Eye-Catching', 'Holiday', 'Luxury', 'Patriotic', 'Uncategorized'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
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
                <label>X</label>
                <input type="number" step="0.1" value={selected.x ?? 0} onChange={(e) => updateSelected({ x: parseFloat(e.target.value) || 0 })} />
                <label>Y</label>
                <input type="number" step="0.1" value={selected.y ?? 0} onChange={(e) => updateSelected({ y: parseFloat(e.target.value) || 0 })} />
                <label>Width</label>
                <input type="number" step="0.1" value={selected.w ?? 1} onChange={(e) => updateSelected({ w: parseFloat(e.target.value) || 1 })} />
                <label>Height</label>
                <input type="number" step="0.1" value={selected.h ?? 1} onChange={(e) => updateSelected({ h: parseFloat(e.target.value) || 1 })} />
              </details>
              <label>Background ({side})</label>
              <input
                value={currentSide.background || '#0b0b0d'}
                onChange={(e) => setCurrentSide({ ...currentSide, background: e.target.value })}
              />
              <button type="button" className="btn ghost sm block" style={{ marginTop: 12 }} onClick={removeSelected}>Remove element</button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
