const PX_PER_IN = 100;

export const POSTCARD_SIZES = {
  '4x6': { id: '4x6', label: '4×6', w: 6, h: 4 },
  '6x9': { id: '6x9', label: '6×9', w: 9, h: 6 },
  '6x11': { id: '6x11', label: '6×11', w: 11, h: 6 },
};

export const DEFAULT_POSTCARD_FORMAT = '6x9';

export function postcardSize(format = DEFAULT_POSTCARD_FORMAT) {
  return POSTCARD_SIZES[format] || POSTCARD_SIZES[DEFAULT_POSTCARD_FORMAT];
}

export const POSTCARD_W_IN = POSTCARD_SIZES['6x9'].w;
export const POSTCARD_H_IN = POSTCARD_SIZES['6x9'].h;
export const CANVAS_W = POSTCARD_W_IN * PX_PER_IN;
export const CANVAS_H = POSTCARD_H_IN * PX_PER_IN;
export { PX_PER_IN };

export function canvasPixels(format) {
  const { w, h } = postcardSize(format);
  return { w: w * PX_PER_IN, h: h * PX_PER_IN };
}

export function clampElementsToSize(side, format) {
  const { w: maxW, h: maxH } = postcardSize(format);
  return {
    ...side,
    elements: (side?.elements || []).map((el) => {
      const w = Math.max(0.3, Math.min(el.w || 1, maxW));
      const h = Math.max(0.3, Math.min(el.h || 1, maxH));
      return {
        ...el,
        w,
        h,
        x: Math.max(0, Math.min(el.x || 0, maxW - w)),
        y: Math.max(0, Math.min(el.y || 0, maxH - h)),
      };
    }),
  };
}

const POPPINS_CSS = {
  'Poppins-Regular': { fontWeight: 400, fontStyle: 'normal' },
  'Poppins-Medium': { fontWeight: 500, fontStyle: 'normal' },
  'Poppins-SemiBold': { fontWeight: 600, fontStyle: 'normal' },
  Poppins: { fontWeight: 700, fontStyle: 'normal' },
  'Poppins-Bold': { fontWeight: 700, fontStyle: 'normal' },
  'Poppins-ExtraBold': { fontWeight: 800, fontStyle: 'normal' },
  'Poppins-BoldItalic': { fontWeight: 700, fontStyle: 'italic' },
  'Poppins-BlackItalic': { fontWeight: 900, fontStyle: 'italic' },
};

export function fontCss(el) {
  if (el.fontFamily === 'Pacifico') {
    return { fontFamily: '"Pacifico", cursive', fontWeight: 400, fontStyle: 'normal' };
  }
  const pop = POPPINS_CSS[el.fontFamily];
  if (pop) return { fontFamily: '"Poppins", sans-serif', ...pop };
  return { fontWeight: el.bold ? 700 : 400, fontStyle: 'normal' };
}

export function elementStyle(el) {
  const style = {
    left: (el.x || 0) * PX_PER_IN,
    top: (el.y || 0) * PX_PER_IN,
    width: (el.w || 1) * PX_PER_IN,
    height: (el.h || 1) * PX_PER_IN,
    color: el.color || '#fff',
    fontSize: el.fontSize || 14,
    ...fontCss(el),
    textAlign: el.align || 'left',
  };
  if (el.strokeColor) {
    style.WebkitTextStroke = `${(el.strokeWidth || 1) * 0.6}px ${el.strokeColor}`;
  }
  return style;
}

export function newElement(type, format = DEFAULT_POSTCARD_FORMAT) {
  const { w: cardW, h: cardH } = postcardSize(format);
  const id = `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const base = { id, type, x: 0.5, y: 0.5, w: 2, h: 0.5, z: 1 };
  switch (type) {
    case 'render':
      return { ...base, x: 0.25, y: 0.25, w: Math.max(0.5, cardW - 0.5), h: Math.max(0.5, cardH - 0.5) };
    case 'qr':
      return { ...base, x: Math.max(0.3, cardW / 2 - 1.1), y: Math.max(0.3, cardH / 2 - 0.2), w: 2.2, h: 2.2 };
    case 'image':
      return { ...base, x: 0.5, y: 0.5, w: Math.min(3, cardW - 0.6), h: Math.min(2, cardH - 0.6), src: '' };
    case 'logo':
      return { ...base, x: 0.35, y: 0.35, w: 2, h: 1, src: '' };
    case 'rect':
      return { ...base, x: 0.5, y: 0.5, w: Math.min(3, cardW - 0.6), h: Math.min(2, cardH - 0.6), fill: '#333333' };
    case 'price':
      return { ...base, text: '{{price}}', fontSize: 28, color: '#f49321', bold: true, w: Math.min(4, cardW - 0.6), h: 0.8 };
    case 'address':
      return { ...base, type: 'address', fontSize: 10, color: '#9a948a', w: Math.min(5, cardW - 0.6), h: 0.6 };
    default:
      return { ...base, type: 'text', text: 'New text', fontSize: 16, color: '#ffffff', w: Math.min(4, cardW - 0.6), h: 0.6 };
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

/** Blank starting layout — pick 4×6, 6×9, or 6×11 in the editor. */
export const BLANK_TEMPLATE_FRONT = {
  background: '#0b0b0d',
  elements: [],
};

export const BLANK_TEMPLATE_BACK = {
  background: '#0b0b0d',
  elements: [],
};
