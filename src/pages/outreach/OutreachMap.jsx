import { useEffect, useRef, useState } from 'react';
import { useOutreachMaps } from './useOutreachMaps.js';
import OutreachMapLeaflet from './OutreachMapLeaflet.jsx';

const SHAPE_STYLE = {
  fillColor: '#f5c842',
  fillOpacity: 0.15,
  strokeColor: '#f5c842',
  strokeWeight: 2,
  clickable: false,
};

function boundsToPolygon(bounds) {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  return [
    { lat: ne.lat(), lng: sw.lng() },
    { lat: ne.lat(), lng: ne.lng() },
    { lat: sw.lat(), lng: ne.lng() },
    { lat: sw.lat(), lng: sw.lng() },
  ];
}

function latLngToPoint(latLng) {
  return { lat: latLng.lat(), lng: latLng.lng() };
}

export default function OutreachMap({
  apiKey,
  center,
  locationPin,
  selection,
  onSelection,
  onMapReady,
  searching = false,
}) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const overlaysRef = useRef([]);
  const locationMarkerRef = useRef(null);
  const locationPinRef = useRef(locationPin);
  const listenersRef = useRef([]);
  const drawStateRef = useRef({ mode: null, start: null, path: [], preview: null, lastLatLng: null, finishing: false });
  const { ready, error: mapsError } = useOutreachMaps(apiKey);

  const [drawMode, setDrawMode] = useState(null);
  const [polyPoints, setPolyPoints] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  locationPinRef.current = locationPin;

  function clearLocationMarker() {
    if (locationMarkerRef.current) {
      locationMarkerRef.current.setMap(null);
      locationMarkerRef.current = null;
    }
  }

  function placeLocationMarker(pin) {
    if (!mapObj.current || !pin?.lat || !pin?.lng) return;
    const google = window.google;
    clearLocationMarker();
    locationMarkerRef.current = new google.maps.Marker({
      map: mapObj.current,
      position: { lat: pin.lat, lng: pin.lng },
      title: pin.label || 'Searched location',
      zIndex: 1000,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 11,
        fillColor: '#ea4335',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
    });
  }

  const onSelectionRef = useRef(onSelection);
  const onMapReadyRef = useRef(onMapReady);
  onSelectionRef.current = onSelection;
  onMapReadyRef.current = onMapReady;

  function clearOverlays() {
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];
  }

  function clearDrawListeners() {
    listenersRef.current.forEach((l) => l.remove());
    listenersRef.current = [];
  }

  function restoreMapInteraction(map) {
    map?.setOptions({
      draggable: true,
      draggableCursor: null,
      draggingCursor: null,
      disableDoubleClickZoom: false,
    });
  }

  function emitSelection(polygon, type) {
    clearDrawListeners();
    drawStateRef.current = { mode: null, start: null, path: [], preview: null, lastLatLng: null, finishing: false };
    setDrawMode(null);
    setPolyPoints(0);
    restoreMapInteraction(mapObj.current);
    onSelectionRef.current?.({ polygon, type });
  }

  function setupRectangleDrawing(map) {
    const google = window.google;
    const state = drawStateRef.current;
    state.mode = 'rectangle';
    state.lastLatLng = null;
    // Disable pan so click-and-drag draws the box instead of moving the map.
    map.setOptions({
      draggable: false,
      draggableCursor: 'crosshair',
      draggingCursor: 'crosshair',
      disableDoubleClickZoom: true,
    });

    function finishRectangle(endLatLng) {
      if (state.finishing || !state.start || !endLatLng) return;
      const bounds = new google.maps.LatLngBounds(state.start, endLatLng);
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const latSpan = Math.abs(ne.lat() - sw.lat());
      const lngSpan = Math.abs(ne.lng() - sw.lng());
      if (latSpan < 0.00003 && lngSpan < 0.00003) {
        if (state.preview) state.preview.setMap(null);
        state.start = null;
        state.preview = null;
        return;
      }
      state.finishing = true;
      clearOverlays();
      if (state.preview) state.preview.setMap(null);
      const rect = new google.maps.Rectangle({ map, bounds, ...SHAPE_STYLE });
      overlaysRef.current = [rect];
      state.start = null;
      state.preview = null;
      emitSelection(boundsToPolygon(bounds), 'rectangle');
    }

    const down = map.addListener('mousedown', (e) => {
      if (state.finishing) return;
      clearOverlays();
      state.start = e.latLng;
      state.lastLatLng = e.latLng;
      if (state.preview) state.preview.setMap(null);
      state.preview = new google.maps.Rectangle({
        map,
        bounds: new google.maps.LatLngBounds(state.start, state.start),
        ...SHAPE_STYLE,
      });
    });

    const move = map.addListener('mousemove', (e) => {
      if (!state.start || !state.preview || state.finishing) return;
      state.lastLatLng = e.latLng;
      state.preview.setBounds(new google.maps.LatLngBounds(state.start, e.latLng));
    });

    const up = map.addListener('mouseup', (e) => {
      e.domEvent?.preventDefault?.();
      e.domEvent?.stopPropagation?.();
      finishRectangle(e.latLng);
    });

    listenersRef.current = [down, move, up];
  }

  function setupPolygonDrawing(map) {
    const google = window.google;
    const state = drawStateRef.current;
    state.mode = 'polygon';
    state.path = [];
    map.setOptions({
      draggable: false,
      draggableCursor: 'crosshair',
      draggingCursor: 'crosshair',
      disableDoubleClickZoom: true,
    });

    const click = map.addListener('click', (e) => {
      state.path.push(e.latLng);
      setPolyPoints(state.path.length);
      if (state.preview) state.preview.setMap(null);
      state.preview = new google.maps.Polygon({
        map,
        paths: state.path,
        ...SHAPE_STYLE,
      });
    });

    listenersRef.current = [click];
  }

  function finishPolygon() {
    const state = drawStateRef.current;
    if (state.path.length < 3) return;
    const map = mapObj.current;
    const google = window.google;
    clearOverlays();
    if (state.preview) state.preview.setMap(null);
    const polygon = state.path.map(latLngToPoint);
    const poly = new google.maps.Polygon({ map, paths: state.path, ...SHAPE_STYLE });
    overlaysRef.current = [poly];
    emitSelection(polygon, 'polygon');
  }

  function cancelDrawing() {
    clearDrawListeners();
    const state = drawStateRef.current;
    if (state.preview) state.preview.setMap(null);
    drawStateRef.current = { mode: null, start: null, path: [], preview: null, lastLatLng: null, finishing: false };
    setDrawMode(null);
    setPolyPoints(0);
    restoreMapInteraction(mapObj.current);
  }

  function startDrawMode(mode) {
    if (!mapObj.current) return;
    cancelDrawing();
    clearOverlays();
    setDrawMode(mode);
    drawStateRef.current.mode = mode;
    if (mode === 'rectangle') setupRectangleDrawing(mapObj.current);
    if (mode === 'polygon') setupPolygonDrawing(mapObj.current);
  }

  useEffect(() => {
    if (!ready || !mapRef.current || mapObj.current) return;
    let cancelled = false;

    (async () => {
      const google = window.google;
      await google.maps.importLibrary('maps');
      if (cancelled || !mapRef.current) return;

      mapObj.current = new google.maps.Map(mapRef.current, {
        center: center || { lat: 40.7128, lng: -74.006 },
        zoom: 17,
        mapTypeId: 'hybrid',
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      });
      onMapReadyRef.current?.(mapObj.current);
      setMapReady(true);
      placeLocationMarker(locationPinRef.current);
    })();

    return () => {
      cancelled = true;
      clearDrawListeners();
      clearLocationMarker();
      mapObj.current = null;
      setMapReady(false);
    };
  }, [ready]);

  useEffect(() => {
    if (mapObj.current && center) {
      mapObj.current.panTo(center);
      if (center.zoom) mapObj.current.setZoom(center.zoom);
    }
  }, [center]);

  useEffect(() => {
    if (!mapReady) return;
    if (!locationPin?.lat || !locationPin?.lng) {
      clearLocationMarker();
      return;
    }
    placeLocationMarker(locationPin);
  }, [locationPin, mapReady]);

  useEffect(() => {
    if (!selection?.polygon?.length || !mapObj.current || !ready) return;
    const google = window.google;
    clearOverlays();
    const poly = new google.maps.Polygon({
      paths: selection.polygon,
      ...SHAPE_STYLE,
      map: mapObj.current,
    });
    overlaysRef.current = [poly];
    const bounds = new google.maps.LatLngBounds();
    selection.polygon.forEach((p) => bounds.extend(p));
    mapObj.current.fitBounds(bounds);
  }, [selection, ready]);

  if (!apiKey || mapsError) {
    return (
      <OutreachMapLeaflet
        center={center}
        locationPin={locationPin}
        selection={selection}
        onSelection={onSelection}
        onMapReady={onMapReady}
        searching={searching}
      />
    );
  }

  if (!ready) {
    return (
      <div className="or-map or-map-empty">
        <><span className="spin" /> Loading map…</>
      </div>
    );
  }

  return (
    <div className="or-map-host">
      <div className="or-draw-toolbar">
        <button
          type="button"
          className={'or-draw-btn' + (drawMode === 'rectangle' ? ' on' : '')}
          onClick={() => startDrawMode('rectangle')}
        >
          ▭ Rectangle
        </button>
        <button
          type="button"
          className={'or-draw-btn' + (drawMode === 'polygon' ? ' on' : '')}
          onClick={() => startDrawMode('polygon')}
        >
          ⬠ Lasso
        </button>
        {drawMode === 'polygon' && polyPoints >= 3 && (
          <button type="button" className="or-draw-btn done" onClick={finishPolygon}>
            Finish shape
          </button>
        )}
        {drawMode && (
          <button type="button" className="or-draw-btn cancel" onClick={cancelDrawing}>
            Cancel
          </button>
        )}
      </div>
      {drawMode === 'rectangle' && (
        <div className="or-draw-hint">Click one corner, drag to the opposite corner, then release.</div>
      )}
      {drawMode === 'polygon' && (
        <div className="or-draw-hint">Click around the area, then press <strong>Finish shape</strong> (min 3 clicks).</div>
      )}
      {searching && (
        <div className="or-draw-hint"><span className="spin" /> Searching for houses in this area…</div>
      )}
      <div className="or-map" ref={mapRef} />
    </div>
  );
}
