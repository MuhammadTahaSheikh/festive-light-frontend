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

function sideExtent(side) {
  let maxX = 0;
  let maxY = 0;
  for (const el of side?.elements || []) {
    maxX = Math.max(maxX, (Number(el.x) || 0) + (Number(el.w) || 0));
    maxY = Math.max(maxY, (Number(el.y) || 0) + (Number(el.h) || 0));
  }
  return { maxX, maxY };
}

/** Which trim the elements actually occupy, when the saved label is a larger card. */
export function inferContentFormat(side, declared = DEFAULT_POSTCARD_FORMAT) {
  const spec = postcardSize(declared);
  const { maxX, maxY } = sideExtent(side);
  if ((side?.elements || []).length && maxX >= spec.w - 0.45 && maxY >= spec.h - 0.45) return spec.id;
  if (maxX <= 6.45 && maxY <= 4.4) return '4x6';
  if (maxX <= 9.45 && maxY <= 6.4) return '6x9';
  return spec.id;
}

function scaleSideUniform(side, from, to) {
  if (!side) return side;
  const sx = to.w / from.w;
  const sy = to.h / from.h;
  const s = Math.min(sx, sy);
  const ox = (to.w - from.w * s) / 2;
  const oy = (to.h - from.h * s) / 2;
  return {
    ...side,
    elements: (side.elements || []).map((el) => ({
      ...el,
      x: ((el.x || 0) * s) + ox,
      y: ((el.y || 0) * s) + oy,
      w: (el.w || 0) * s,
      h: (el.h || 0) * s,
      fontSize: el.fontSize ? el.fontSize * s : el.fontSize,
      strokeWidth: el.strokeWidth ? el.strokeWidth * s : el.strokeWidth,
    })),
  };
}

function scaleSideToFill(side, from, to) {
  if (!side) return side;
  const sx = to.w / from.w;
  const sy = to.h / from.h;
  return {
    ...side,
    elements: (side.elements || []).map((el) => ({
      ...el,
      x: (el.x || 0) * sx,
      y: (el.y || 0) * sy,
      w: (el.w || 0) * sx,
      h: (el.h || 0) * sy,
      fontSize: el.fontSize ? el.fontSize * sy : el.fontSize,
      strokeWidth: el.strokeWidth ? el.strokeWidth * sy : el.strokeWidth,
    })),
  };
}

function expandSixByNineToSixByEleven(side) {
  if (!side) return side;
  const fromW = 9;
  const toW = 11;
  const extra = toW - fromW;
  const edge = 0.12;
  return {
    ...side,
    elements: (side.elements || []).map((el) => {
      const x = el.x || 0;
      const w = el.w || 0;
      const spansWidth = x <= edge && x + w >= fromW - edge;
      const wideBand = w >= fromW * 0.82;
      if (spansWidth) {
        const next = { ...el, x: 0, w: toW };
        if (el.type === 'image' && el.fit !== 'contain') next.fit = 'fill';
        return next;
      }
      if (wideBand) return { ...el, w: w + extra };
      if (x + w / 2 >= fromW / 2) return { ...el, x: Math.round((x + extra) * 1000) / 1000 };
      return { ...el };
    }),
  };
}

/** Scale a side from one Lob trim onto another so the artwork fills the card. */
export function resizeSideToFormat(side, fromFormat, toFormat) {
  const from = postcardSize(fromFormat);
  const to = postcardSize(toFormat);
  if (!side || from.id === to.id) return side;
  if (from.id === '6x9' && to.id === '6x11') return expandSixByNineToSixByEleven(side);
  if (from.id === '4x6' && to.id === '6x11') return scaleSideToFill(side, from, to);
  return scaleSideUniform(side, from, to);
}

/** Grow a layout that is still drawn at a smaller trim than the card it is labeled with. */
export function fitSideToDeclared(side, declared) {
  return resizeSideToFormat(side, inferContentFormat(side, declared), declared);
}

const POSTCARD_FORMAT_IDS = ['4x6', '6x9', '6x11'];

function cloneSide(side, fallbackBackground) {
  const src = side || { background: fallbackBackground, elements: [] };
  const { __sizeLayouts, ...rest } = src;
  return JSON.parse(JSON.stringify(rest));
}

/** Per-size copies saved on the template, or tucked into the front for older storage. */
export function readStoredLayouts(template) {
  const raw = template?.layouts && Object.keys(template.layouts).length
    ? template.layouts
    : template?.front?.__sizeLayouts;
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  for (const id of POSTCARD_FORMAT_IDS) {
    const item = raw[id];
    if (!item?.front || !item?.back) continue;
    out[id] = {
      front: cloneSide(item.front, '#0b0b0d'),
      back: cloneSide(item.back, '#141416'),
    };
  }
  return Object.keys(out).length ? out : null;
}

/**
 * One layout per card size. Missing sizes are seeded once from the saved size,
 * then edited on their own.
 */
export function layoutsFromTemplate(template) {
  const declared = POSTCARD_SIZES[template?.format] ? template.format : DEFAULT_POSTCARD_FORMAT;
  const stored = readStoredLayouts(template) || {};
  if (!stored[declared]) {
    stored[declared] = {
      front: fitSideToDeclared(cloneSide(template?.front, '#0b0b0d'), declared),
      back: fitSideToDeclared(cloneSide(template?.back, '#141416'), declared),
    };
  }
  const base = stored[declared];
  for (const id of POSTCARD_FORMAT_IDS) {
    if (stored[id]) continue;
    stored[id] = {
      front: resizeSideToFormat(cloneSide(base.front, '#0b0b0d'), declared, id),
      back: resizeSideToFormat(cloneSide(base.back, '#141416'), declared, id),
    };
  }
  return { format: declared, layouts: stored };
}

export const FONT_FAMILIES = [
  { id: '', label: 'Default' },
  { id: 'Poppins-Regular', label: 'Poppins Regular' },
  { id: 'Poppins-Medium', label: 'Poppins Medium' },
  { id: 'Poppins-SemiBold', label: 'Poppins SemiBold' },
  { id: 'Poppins-Bold', label: 'Poppins Bold' },
  { id: 'Poppins-ExtraBold', label: 'Poppins ExtraBold' },
  { id: 'Poppins-BoldItalic', label: 'Poppins Bold Italic' },
  { id: 'Poppins-BlackItalic', label: 'Poppins Black Italic' },
  { id: 'Pacifico', label: 'Pacifico' },
];

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
