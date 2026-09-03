import { useEffect, useState } from 'react';

/**
 * Loads Google Maps JavaScript API for the Outreach map only.
 * Uses importLibrary() — required when loading=async (google.maps.Map is not
 * available synchronously on script onload).
 */
let loadPromise = null;

function injectBootstrap(apiKey) {
  if (window.google?.maps?.importLibrary) return;
  const inline = document.createElement('script');
  inline.text = `(g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=\`https://maps.\${c}apis.com/maps/api/js?\`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({key:${JSON.stringify(apiKey)},v:"weekly"});`;
  document.head.appendChild(inline);
}

export function loadOutreachMaps(apiKey) {
  if (!apiKey) return Promise.reject(new Error('missing_api_key'));
  if (!loadPromise) {
    loadPromise = (async () => {
      injectBootstrap(apiKey);
      let tries = 0;
      while (!window.google?.maps?.importLibrary && tries < 200) {
        await new Promise((r) => setTimeout(r, 25));
        tries++;
      }
      if (!window.google?.maps?.importLibrary) {
        throw new Error('maps_load_failed');
      }
      await window.google.maps.importLibrary('maps');
      return window.google;
    })();
  }
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
