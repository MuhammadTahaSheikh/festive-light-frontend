import { useEffect, useRef, useState } from 'react';
import {
  CANVAS_W, CANVAS_H, PX_PER_IN, POSTCARD_W_IN, POSTCARD_H_IN, elementStyle,
} from './templateUtils.js';

function clampPosition(el, x, y) {
  const w = el.w || 1;
  const h = el.h || 1;
  return {
    x: Math.max(0, Math.min(POSTCARD_W_IN - w, x)),
    y: Math.max(0, Math.min(POSTCARD_H_IN - h, y)),
  };
}

function clampSize(el, w, h) {
  const x = el.x || 0;
  const y = el.y || 0;
  return {
    w: Math.max(0.3, Math.min(POSTCARD_W_IN - x, w)),
    h: Math.max(0.3, Math.min(POSTCARD_H_IN - y, h)),
  };
}

function ElementView({
  el, selected, scale, onSelect, onUpdate, onRequestImageUpload,
}) {
  const dragRef = useRef(null);
  const style = elementStyle(el);
  const cls = 'tpl-el' + (selected ? ' selected' : '');

  function startDrag(e, mode = 'move') {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect?.();

    const startX = e.clientX;
    const startY = e.clientY;
    const origX = el.x || 0;
    const origY = el.y || 0;
    const origW = el.w || 1;
    const origH = el.h || 1;
    let moved = false;

    function onMove(ev) {
      const dx = (ev.clientX - startX) / scale / PX_PER_IN;
      const dy = (ev.clientY - startY) / scale / PX_PER_IN;
      if (Math.abs(dx) > 0.02 || Math.abs(dy) > 0.02) moved = true;

      if (mode === 'move') {
        onUpdate?.(clampPosition(el, origX + dx, origY + dy));
      } else {
        onUpdate?.(clampSize(el, origW + dx, origH + dy));
      }
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      dragRef.current = null;
      if (!moved && (el.type === 'image' || el.type === 'logo') && !el.src) {
        onRequestImageUpload?.(el.id);
      }
    }

    dragRef.current = mode;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function handleClick(e) {
    e.stopPropagation();
    onSelect?.();
    if ((el.type === 'image' || el.type === 'logo') && !el.src) {
      onRequestImageUpload?.(el.id);
    }
  }

  const commonProps = {
    style,
    onMouseDown: (e) => {
      if ((el.type === 'image' || el.type === 'logo') && !el.src) return;
      startDrag(e, 'move');
    },
    onClick: handleClick,
    role: 'presentation',
  };

  let body;
  if (el.type === 'render') {
    body = (
      <div className={cls + ' render-slot'} {...commonProps}>
        <span className="tpl-slot-label">[Render]</span>
        <span className="tpl-slot-hint">Drag to move</span>
      </div>
    );
  } else if (el.type === 'qr') {
    body = (
      <div className={cls + ' qr-slot'} {...commonProps}>
        QR
      </div>
    );
  } else if (el.type === 'image' || el.type === 'logo') {
    body = (
      <div className={cls + ' image-slot' + (!el.src ? ' empty' : '')} {...commonProps}>
        {el.src ? (
          <img src={el.src} alt="" draggable={false} />
        ) : (
          <>
            <span className="tpl-slot-icon">{el.type === 'logo' ? '◆' : '🖼'}</span>
            <span className="tpl-slot-label">Click to add {el.type === 'logo' ? 'logo' : 'image'}</span>
          </>
        )}
      </div>
    );
  } else if (el.type === 'rect') {
    body = (
      <div className={cls} style={{ ...style, background: el.fill || '#333' }} {...commonProps} />
    );
  } else {
    const previewText = (el.text || (el.type === 'price' ? '$4,500' : ''))
      .replace(/\{\{price\}\}/g, '$4,500')
      .replace(/\{\{owner_first\}\}/g, 'Alex')
      .replace(/\{\{owner\}\}/g, 'Alex Rivera')
      .replace(/\{\{name\}\}/g, 'Alex Rivera')
      .replace(/\{\{address\}\}/g, '123 Sample St, Austin, TX')
      .replace(/\{\{feet\}\}/g, '95');
    const label = el.type === 'address' ? '123 Sample St, Austin, TX' : previewText;
    body = (
      <div
        className={cls + ' text-slot'}
        style={{ ...style, display: 'flex', alignItems: 'flex-start', padding: 4 }}
        {...commonProps}
      >
        <span style={{ width: '100%', textAlign: style.textAlign, whiteSpace: 'pre-line', lineHeight: 1.25 }}>{label}</span>
      </div>
    );
  }

  return (
    <>
      {body}
      {selected && (
        <div
          className="tpl-resize-handle"
          style={{
            left: (el.x || 0) * PX_PER_IN + (el.w || 1) * PX_PER_IN - 6,
            top: (el.y || 0) * PX_PER_IN + (el.h || 1) * PX_PER_IN - 6,
          }}
          onMouseDown={(e) => startDrag(e, 'resize')}
          role="presentation"
        />
      )}
    </>
  );
}

export default function PostcardCanvas({
  side, selectedId, onSelect, onUpdateElement, onRequestImageUpload,
}) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const bg = side?.background || '#0b0b0d';
  const elements = side?.elements || [];

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    function fit() {
      const w = el.clientWidth - 24;
      setScale(Math.min(1, w / CANVAS_W));
    }
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function handleCanvasClick() {
    onSelect?.(null);
  }

  return (
    <div className="tpl-canvas-wrap" ref={wrapRef}>
      <div className="tpl-canvas-scaler" style={{ width: CANVAS_W * scale, height: CANVAS_H * scale }}>
        <div
          className="tpl-canvas"
          style={{
            background: bg,
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
          }}
          onClick={handleCanvasClick}
          role="presentation"
        >
          {elements.length === 0 && (
            <div className="tpl-canvas-empty">
              Click an element on the left, then drag it here
            </div>
          )}
          {elements.map((el) => (
            <ElementView
              key={el.id}
              el={el}
              selected={el.id === selectedId}
              scale={scale}
              onSelect={() => onSelect?.(el.id)}
              onUpdate={(patch) => onUpdateElement?.(el.id, patch)}
              onRequestImageUpload={onRequestImageUpload}
            />
          ))}
        </div>
      </div>
      <p className="tpl-canvas-tip muted">Drag to move · corner handle to resize · click image to upload</p>
    </div>
  );
}

export function PostcardThumb({ side, sampleRenderUrl, tag = 'FRONT' }) {
  const bg = side?.background || '#0b0b0d';
  const elements = side?.elements || [];

  function thumbLabel(el) {
    const text = (el.text || (el.type === 'price' ? '$4,500' : ''))
      .replace(/\{\{price\}\}/g, '$4,500')
      .replace(/\{\{owner_first\}\}/g, 'Alex')
      .replace(/\{\{owner\}\}/g, 'Alex Rivera')
      .replace(/\{\{name\}\}/g, 'Alex Rivera');
    if (el.type === 'address') return '123 Main St…';
    return text;
  }

  function renderThumbEl(el) {
    const left = ((el.x || 0) / POSTCARD_W_IN) * 100;
    const top = ((el.y || 0) / POSTCARD_H_IN) * 100;
    const width = ((el.w || 1) / POSTCARD_W_IN) * 100;
    const height = ((el.h || 1) / POSTCARD_H_IN) * 100;
    const box = {
      position: 'absolute',
      left: `${left}%`,
      top: `${top}%`,
      width: `${width}%`,
      height: `${height}%`,
      overflow: 'hidden',
      boxSizing: 'border-box',
    };

    if (el.type === 'render') {
      // Dynamic home photo — filled per recipient at mail time.
      // Skip in thumbs when a static upload already covers this slot (same as PDF).
      const covered = (side?.elements || []).some((other) => {
        if ((other.type !== 'image' && other.type !== 'logo') || !other.src) return false;
        const ax1 = el.x || 0; const ay1 = el.y || 0;
        const ax2 = ax1 + (el.w || 0); const ay2 = ay1 + (el.h || 0);
        const bx1 = other.x || 0; const by1 = other.y || 0;
        const bx2 = bx1 + (other.w || 0); const by2 = by1 + (other.h || 0);
        const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
        const iy = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
        const area = Math.max(0, el.w || 0) * Math.max(0, el.h || 0);
        return area > 0 && (ix * iy) / area >= 0.45;
      });
      if (covered) return null;
      return (
        <div key={el.id} className="tpl-thumb-render" style={box}>
          {sampleRenderUrl
            ? <img src={sampleRenderUrl} alt="" />
            : (
              <span className="tpl-thumb-render-ph">
                <span aria-hidden="true">🏠</span>
                <span className="tpl-thumb-render-label">Home photo</span>
              </span>
            )}
        </div>
      );
    }
    if (el.type === 'image' || el.type === 'logo') {
      return (
        <div key={el.id} className="tpl-thumb-image" style={box}>
          {el.src ? <img src={el.src} alt="" /> : <span>{el.type === 'logo' ? '◆' : '🖼'}</span>}
        </div>
      );
    }
    if (el.type === 'qr') {
      return <div key={el.id} className="tpl-thumb-qr" style={box} />;
    }
    if (el.type === 'rect') {
      return <div key={el.id} style={{ ...box, background: el.fill || '#333' }} />;
    }
    return (
      <div
        key={el.id}
        className="tpl-thumb-text"
        style={{
          ...box,
          color: el.color || '#fff',
          fontSize: Math.max(5, (el.fontSize || 12) * 0.38),
          fontWeight: el.bold ? 700 : 400,
          textAlign: el.align || 'left',
          display: 'flex',
          alignItems: 'center',
          padding: '1px 2px',
          lineHeight: 1.1,
        }}
      >
        {thumbLabel(el)}
      </div>
    );
  }

  return (
    <div className="tpl-thumb" style={{ background: bg }}>
      <div className="tpl-thumb-inner">
        {elements.map(renderThumbEl)}
        {elements.length === 0 && (
          <div className="tpl-thumb-empty">Empty · click Edit to design</div>
        )}
      </div>
      <span className="tag">{tag}</span>
    </div>
  );
}

/** Hover to flip front ↔ back (Light Launch style). */
export function TemplateFlipCard({ template, sampleRenderUrl }) {
  return (
    <div className="tpl-flip" title="Hover to see back">
      <div className="tpl-flip-inner">
        <div className="tpl-flip-face tpl-flip-front">
          <PostcardThumb side={template.front} sampleRenderUrl={sampleRenderUrl} tag="FRONT" />
        </div>
        <div className="tpl-flip-face tpl-flip-back">
          <PostcardThumb
            side={template.back || { background: '#141416', elements: [] }}
            sampleRenderUrl={sampleRenderUrl}
            tag="BACK"
          />
        </div>
      </div>
      <span className="tpl-flip-hint muted">Hover to flip</span>
    </div>
  );
}
