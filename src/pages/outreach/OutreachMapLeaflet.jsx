import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const SHAPE_STYLE = {
  color: '#f5c842',
  weight: 2,
  fillColor: '#f5c842',
  fillOpacity: 0.15,
};

const PIN_ICON = L.divIcon({
  className: 'or-leaflet-pin',
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/**
 * OSM / Leaflet outreach map — used when Google Maps JS cannot load
 * (common on Windows networks with broken IPv6 to maps.googleapis.com).
 */
export default function OutreachMapLeaflet({
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
  const drawStateRef = useRef({ mode: null, start: null, path: [], preview: null, moveHandler: null, upHandler: null });
  const onSelectionRef = useRef(onSelection);
  const onMapReadyRef = useRef(onMapReady);
  const [drawMode, setDrawMode] = useState(null);
  const [polyPoints, setPolyPoints] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  onSelectionRef.current = onSelection;
  onMapReadyRef.current = onMapReady;

  function clearOverlays() {
    overlaysRef.current.forEach((o) => o.remove());
    overlaysRef.current = [];
  }

  function clearLocationMarker() {
    if (locationMarkerRef.current) {
      locationMarkerRef.current.remove();
      locationMarkerRef.current = null;
    }
  }

  function placeLocationMarker(pin) {
    if (!mapObj.current || pin?.lat == null || pin?.lng == null) return;
    clearLocationMarker();
    locationMarkerRef.current = L.marker([pin.lat, pin.lng], {
      icon: PIN_ICON,
      title: pin.label || 'Searched location',
      zIndexOffset: 1000,
    }).addTo(mapObj.current);
  }

  function emitSelection(polygon, type) {
    drawStateRef.current = { mode: null, start: null, path: [], preview: null, moveHandler: null, upHandler: null };
    setDrawMode(null);
    setPolyPoints(0);
    mapObj.current?.dragging.enable();
    onSelectionRef.current?.({ polygon, type });
  }

  function cancelDrawing() {
    const state = drawStateRef.current;
    if (state.preview) state.preview.remove();
    if (state.moveHandler) mapObj.current?.off('mousemove', state.moveHandler);
    if (state.upHandler) mapObj.current?.off('mouseup', state.upHandler);
    mapObj.current?.off('click');
    mapObj.current?.off('mousedown');
    drawStateRef.current = { mode: null, start: null, path: [], preview: null, moveHandler: null, upHandler: null };
    setDrawMode(null);
    setPolyPoints(0);
    mapObj.current?.dragging.enable();
  }

  function setupRectangleDrawing(map) {
    map.dragging.disable();
    const state = drawStateRef.current;
    state.mode = 'rectangle';

    const onDown = (e) => {
      if (state.mode !== 'rectangle') return;
      clearOverlays();
      state.start = e.latlng;
      if (state.preview) state.preview.remove();
      state.preview = L.rectangle(L.latLngBounds(state.start, state.start), SHAPE_STYLE).addTo(map);
    };

    const onMove = (e) => {
      if (!state.start || !state.preview || state.mode !== 'rectangle') return;
      state.preview.setBounds(L.latLngBounds(state.start, e.latlng));
    };

    const onUp = (e) => {
      if (!state.start || state.mode !== 'rectangle') return;
      const bounds = L.latLngBounds(state.start, e.latlng);
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      if (Math.abs(ne.lat - sw.lat) < 0.00003 && Math.abs(ne.lng - sw.lng) < 0.00003) {
        if (state.preview) state.preview.remove();
        state.start = null;
        state.preview = null;
        return;
      }
      clearOverlays();
      if (state.preview) state.preview.remove();
      const rect = L.rectangle(bounds, SHAPE_STYLE).addTo(map);
      overlaysRef.current = [rect];
      const polygon = [
        { lat: ne.lat, lng: sw.lng },
        { lat: ne.lat, lng: ne.lng },
        { lat: sw.lat, lng: ne.lng },
        { lat: sw.lat, lng: sw.lng },
        { lat: ne.lat, lng: sw.lng },
      ];
      map.off('mousedown', onDown);
      map.off('mousemove', onMove);
      map.off('mouseup', onUp);
      emitSelection(polygon, 'rectangle');
    };

    state.moveHandler = onMove;
    state.upHandler = onUp;
    map.on('mousedown', onDown);
    map.on('mousemove', onMove);
    map.on('mouseup', onUp);
  }

  function setupPolygonDrawing(map) {
    map.dragging.disable();
    const state = drawStateRef.current;
    state.mode = 'polygon';
    state.path = [];

    map.on('click', (e) => {
      if (state.mode !== 'polygon') return;
      state.path.push(e.latlng);
      setPolyPoints(state.path.length);
      if (state.preview) state.preview.remove();
      state.preview = L.polygon(state.path, SHAPE_STYLE).addTo(map);
    });
  }

  function finishPolygon() {
    const state = drawStateRef.current;
    if (state.path.length < 3 || !mapObj.current) return;
    clearOverlays();
    if (state.preview) state.preview.remove();
    const poly = L.polygon(state.path, SHAPE_STYLE).addTo(mapObj.current);
    overlaysRef.current = [poly];
    const polygon = state.path.map((p) => ({ lat: p.lat, lng: p.lng }));
    if (polygon.length && (polygon[0].lat !== polygon[polygon.length - 1].lat || polygon[0].lng !== polygon[polygon.length - 1].lng)) {
      polygon.push({ ...polygon[0] });
    }
    mapObj.current.off('click');
    emitSelection(polygon, 'polygon');
  }

  function startDrawMode(mode) {
    if (!mapObj.current) return;
    cancelDrawing();
    clearOverlays();
    setDrawMode(mode);
    if (mode === 'rectangle') setupRectangleDrawing(mapObj.current);
    if (mode === 'polygon') setupPolygonDrawing(mapObj.current);
  }

  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    const map = L.map(mapRef.current, {
      center: center ? [center.lat, center.lng] : [40.7128, -74.006],
      zoom: center?.zoom || 17,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    mapObj.current = map;
    onMapReadyRef.current?.(map);
    setMapReady(true);
    placeLocationMarker(locationPin);

    return () => {
      cancelDrawing();
      clearLocationMarker();
      clearOverlays();
      map.remove();
      mapObj.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    if (!mapObj.current || !center) return;
    mapObj.current.setView([center.lat, center.lng], center.zoom || mapObj.current.getZoom());
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
    if (!selection?.polygon?.length || !mapObj.current || !mapReady) return;
    clearOverlays();
    const latlngs = selection.polygon.map((p) => [p.lat, p.lng]);
    const poly = L.polygon(latlngs, SHAPE_STYLE).addTo(mapObj.current);
    overlaysRef.current = [poly];
    mapObj.current.fitBounds(poly.getBounds(), { padding: [24, 24] });
  }, [selection, mapReady]);

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
      <div className="or-map or-map-leaflet" ref={mapRef} />
    </div>
  );
}
