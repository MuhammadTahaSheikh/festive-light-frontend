import { useEffect, useState } from 'react';
import QR from 'qrcode';

export default function QRCode({ value, size = 140 }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    if (!value) return;
    QR.toDataURL(value, { margin: 1, width: size, color: { dark: '#0b0b0d', light: '#ffffff' } })
      .then(setSrc)
      .catch(() => setSrc(''));
  }, [value, size]);
  if (!src) return null;
  return <img src={src} alt="QR code" width={size} height={size} style={{ borderRadius: 8, background: '#fff', padding: 6 }} />;
}
