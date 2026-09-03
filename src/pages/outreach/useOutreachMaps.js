import { useEffect, useState } from 'react';

/**
 * Loads Google Maps JavaScript API for the Outreach map.
 * Uses a stable script URL so the browser can cache across reloads
 * (unique callback query params force a new network fetch every time
 * and amplify flaky TLS / ERR_CONNECTION_CLOSED on some networks).
 */
let loadPromise = null;
let loadedKey = '';

const CALLBACK = '__flpMapsReady';
const SCRIPT_ID = 'flp-google-maps-js';

function loadMapsScript(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary || window.google?.maps?.Map) {
      resolve();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      const onReady = () => {
        if (window.google?.maps?.importLibrary || window.google?.maps?.Map) resolve();
        else reject(new Error('maps_load_failed'));
      };
      if (window.google?.maps) {
        onReady();
        return;
      }
      existing.addEventListener('load', onReady, { once: true });
      existing.addEventListener('error', () => reject(new Error('maps_load_failed')), { once: true });
      return;
    }

    const prev = window[CALLBACK];
    window[CALLBACK] = () => {
      window[CALLBACK] = prev;
      resolve();
    };

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    // Stable URL (no Date.now) → browser disk cache can satisfy later loads.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&callback=${CALLBACK}`;
    script.onerror = () => {
      window[CALLBACK] = prev;
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
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await loadOnce(apiKey);
      } catch (err) {
        lastErr = err;
        loadPromise = null;
        document.getElementById(SCRIPT_ID)?.remove();
        // Longer backoff — helps when TLS to Google is intermittent.
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
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
