import { useEffect, useState } from 'react';

/**
 * Loads Google Maps JavaScript API for the Outreach map.
 * Uses a normal <script src> (same URL that works in the address bar),
 * then importLibrary('maps') for the modern Map constructor.
 */
let loadPromise = null;
let loadedKey = '';

function loadMapsScript(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary || window.google?.maps?.Map) {
      resolve();
      return;
    }

    const existing = document.getElementById('flp-google-maps-js');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('maps_load_failed')), { once: true });
      return;
    }

    const cb = `__flpMapsReady_${Date.now()}`;
    window[cb] = () => {
      try { delete window[cb]; } catch { /* ignore */ }
      resolve();
    };

    const script = document.createElement('script');
    script.id = 'flp-google-maps-js';
    script.async = true;
    script.defer = true;
    // Same shape as a working address-bar load; callback confirms parse+init.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&callback=${cb}`;
    script.onerror = () => {
      try { delete window[cb]; } catch { /* ignore */ }
      script.remove();
      reject(new Error('maps_load_failed'));
    };
    document.head.appendChild(script);
  });
}

async function loadOnce(apiKey) {
  await loadMapsScript(apiKey);
  if (window.google?.maps?.importLibrary) {
    await window.google.maps.importLibrary('maps');
  } else if (!window.google?.maps?.Map) {
    throw new Error('maps_load_failed');
  }
  return window.google;
}

export function loadOutreachMaps(apiKey) {
  if (!apiKey) return Promise.reject(new Error('missing_api_key'));
  if (loadPromise && loadedKey === apiKey) return loadPromise;

  loadedKey = apiKey;
  loadPromise = (async () => {
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await loadOnce(apiKey);
      } catch (err) {
        lastErr = err;
        loadPromise = null;
        document.getElementById('flp-google-maps-js')?.remove();
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
    loadedKey = '';
    throw lastErr || new Error('maps_load_failed');
  })();

  return loadPromise;
}

export function useOutreachMaps(apiKey) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    loadOutreachMaps(apiKey)
      .then(() => { if (!cancelled) { setReady(true); setError(''); } })
      .catch(() => { if (!cancelled) { setReady(false); setError('maps_load_failed'); } });
    return () => { cancelled = true; };
  }, [apiKey]);

  return { ready, error };
}
