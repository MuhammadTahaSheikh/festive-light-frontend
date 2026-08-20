const PX_PER_IN = 100;
export const POSTCARD_W_IN = 9;
export const POSTCARD_H_IN = 6;
export const CANVAS_W = POSTCARD_W_IN * PX_PER_IN;
export const CANVAS_H = POSTCARD_H_IN * PX_PER_IN;
export { PX_PER_IN };

export function elementStyle(el) {
  return {
    left: (el.x || 0) * PX_PER_IN,
    top: (el.y || 0) * PX_PER_IN,
    width: (el.w || 1) * PX_PER_IN,
    height: (el.h || 1) * PX_PER_IN,
    color: el.color || '#fff',
    fontSize: el.fontSize || 14,
    fontWeight: el.bold ? 700 : 400,
    textAlign: el.align || 'left',
  };
}

export function newElement(type) {
  const id = `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const base = { id, type, x: 0.5, y: 0.5, w: 2, h: 0.5, z: 1 };
  switch (type) {
    case 'render':
      return { ...base, x: 0.25, y: 0.25, w: 8.5, h: 5.5 };
    case 'qr':
      return { ...base, x: 3.4, y: 3.4, w: 2.2, h: 2.2 };
    case 'image':
      return { ...base, x: 0.5, y: 0.5, w: 3, h: 2, src: '' };
    case 'logo':
      return { ...base, x: 0.35, y: 0.35, w: 2, h: 1, src: '' };
    case 'rect':
      return { ...base, x: 0.5, y: 0.5, w: 3, h: 2, fill: '#333333' };
    case 'price':
      return { ...base, text: '{{price}}', fontSize: 28, color: '#f49321', bold: true, w: 4, h: 0.8 };
    case 'address':
      return { ...base, type: 'address', fontSize: 10, color: '#9a948a', w: 5, h: 0.6 };
    default:
      return { ...base, type: 'text', text: 'New text', fontSize: 16, color: '#ffffff', w: 4, h: 0.6 };
  }
}

export const ELEMENT_TYPES = [
  { type: 'render', label: 'Render', icon: '🏠' },
  { type: 'qr', label: 'QR Code', icon: '▣' },
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'image', label: 'Image', icon: '🖼' },
  { type: 'logo', label: 'Logo', icon: '◆' },
  { type: 'price', label: 'Price', icon: '$' },
  { type: 'address', label: 'Address', icon: '📍' },
  { type: 'rect', label: 'Rectangle', icon: '▭' },
];

export const CATEGORIES = ['All', 'Eye-Catching', 'Holiday', 'Luxury', 'Patriotic', 'Uncategorized'];

/** True when the template includes a dynamic per-home render slot (not a static image). */
export function templateHasRenderSlot(template) {
  const els = [...(template?.front?.elements || []), ...(template?.back?.elements || [])];
  return els.some((el) => el.type === 'render');
}

/** Blank 6×9 starting layout — empty canvas; add elements from the sidebar. */
export const BLANK_TEMPLATE_FRONT = {
  background: '#0b0b0d',
  elements: [],
};

export const BLANK_TEMPLATE_BACK = {
  background: '#0b0b0d',
  elements: [],
};
