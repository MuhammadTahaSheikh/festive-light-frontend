const LOGOS = {
  badge: 'brand/flp-logo-badge.png',
  wordmark: 'brand/flp-logo-wordmark.png',
  wordmarkLight: 'brand/flp-logo-wordmark.png',
};

/** @param {'badge' | 'wordmark' | 'wordmarkLight'} variant */
export default function BrandLogo({ variant = 'badge', className = '', alt = 'Festive Lighting Pros' }) {
  const key = variant === 'light' ? 'wordmarkLight' : variant;
  const src = `${import.meta.env.BASE_URL}${LOGOS[key] || LOGOS.badge}`;
  return <img src={src} alt={alt} className={className} decoding="async" />;
}
