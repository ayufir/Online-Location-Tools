import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useSocket } from '../context/SocketContext';
import { haversineDistance, formatDistance, getStatusColor, getInitials } from '../utils/helpers';
import './MapboxMap.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN';

const BHOPAL_CENTER = [77.4126, 23.2599]; // lng, lat

const MapboxMap = ({ employees = [], selectedId, onSelectEmployee, showHistory, historyCoords = [] }) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const popupsRef = useRef({});
  const historyLayerAdded = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState([]);

  const { liveLocations } = useSocket();

  // ─── Initialize map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: BHOPAL_CENTER,
      zoom: 11,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120 }), 'bottom-right');
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.on('load', () => {
      mapRef.current = map;
      setMapLoaded(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ─── Update markers when liveLocations change ────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const map = mapRef.current;
    const allEmployees = employees.length > 0 ? employees : [];

    allEmployees.forEach((emp) => {
      const live = liveLocations[emp._id] || {};
      const location = live.location || emp.currentLocation;
      const status = live.status || emp.status || 'offline';
      const isSelected = emp._id === selectedId;

      if (!location?.latitude || !location?.longitude) return;

      const color = getStatusColor(status);
      const initials = getInitials(emp.name);

      // ─── Create or update marker ───────────────────────────────────────────
      if (!markersRef.current[emp._id]) {
        // Create marker element
        const el = document.createElement('div');
        el.className = `map-marker ${status}`;
        el.dataset.empId = emp._id;
        el.innerHTML = `
          <div class="marker-ring ${status === 'moving' ? 'pulse' : ''}"></div>
          <div class="marker-body" style="background:${color}">
            <span class="marker-initials">${initials}</span>
          </div>
          <div class="marker-label">${emp.name.split(' ')[0]}</div>
        `;

        const popup = new mapboxgl.Popup({
          offset: 35,
          closeButton: true,
          maxWidth: '260px',
          className: 'custom-popup',
        }).setHTML(buildPopupHTML(emp, location, status));

        el.addEventListener('click', () => {
          if (onSelectEmployee) onSelectEmployee(emp._id);
          popup.addTo(map);
        });

        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([location.longitude, location.latitude])
          .setPopup(popup)
          .addTo(map);

        markersRef.current[emp._id] = { marker, el };
        popupsRef.current[emp._id] = popup;
      } else {
        // Update existing marker
        const { marker, el } = markersRef.current[emp._id];
        marker.setLngLat([location.longitude, location.latitude]);

        // Update classes
        el.className = `map-marker ${status}`;
        const ring = el.querySelector('.marker-ring');
        if (ring) {
          ring.className = `marker-ring ${status === 'moving' ? 'pulse' : ''}`;
        }
        const body = el.querySelector('.marker-body');
        if (body) body.style.background = color;

        // Update popup content
        if (popupsRef.current[emp._id]) {
          popupsRef.current[emp._id].setHTML(buildPopupHTML(emp, location, status));
        }
      }

      // Highlight selected
      const { el } = markersRef.current[emp._id] || {};
      if (el) {
        el.classList.toggle('selected', isSelected);
      }
    });

    // ─── Fit bounds to show all employees on mount/sync ──────────────────────────
    if (allEmployees.length > 0 && !selectedId) {
      const bounds = new mapboxgl.LngLatBounds();
      let hasCoords = false;
      allEmployees.forEach(emp => {
        const live = liveLocations[emp._id] || {};
        const loc = live.location || emp.currentLocation;
        if (loc?.latitude && loc?.longitude) {
          bounds.extend([loc.longitude, loc.latitude]);
          hasCoords = true;
        }
      });
      if (hasCoords) {
        map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 2000 });
      }
    }
  }, [mapLoaded, employees, liveLocations, selectedId]);

  // ─── Pan to selected employee ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !selectedId) return;
    const live = liveLocations[selectedId];
    if (live?.location?.latitude) {
      mapRef.current.flyTo({
        center: [live.location.longitude, live.location.latitude],
        zoom: 14,
        speed: 1.2,
        curve: 1,
      });
    }
  }, [selectedId, mapLoaded]);

  // ─── History trail ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    // Remove old trail
    if (map.getLayer('history-line')) map.removeLayer('history-line');
    if (map.getSource('history-source')) map.removeSource('history-source');

    if (!showHistory || historyCoords.length < 2) return;

    const geoJSON = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: historyCoords.map((c) => [c.longitude, c.latitude]),
      },
    };

    map.addSource('history-source', { type: 'geojson', data: geoJSON });
    map.addLayer({
      id: 'history-line',
      type: 'line',
      source: 'history-source',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#F59E0B',
        'line-width': 3,
        'line-dasharray': [2, 2],
        'line-opacity': 0.85,
      },
    });

    // Fit bounds to trail
    const bounds = historyCoords.reduce(
      (b, c) => b.extend([c.longitude, c.latitude]),
      new mapboxgl.LngLatBounds([historyCoords[0].longitude, historyCoords[0].latitude], [historyCoords[0].longitude, historyCoords[0].latitude])
    );
    map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
  }, [mapLoaded, showHistory, historyCoords]);

  // ─── Measure mode ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    const handleClick = (e) => {
      if (!measureMode) return;
      const { lng, lat } = e.lngLat;
      setMeasurePoints((prev) => {
        const next = [...prev, { longitude: lng, latitude: lat }];
        if (next.length === 2) {
          const dist = haversineDistance(
            { latitude: next[0].latitude, longitude: next[0].longitude },
            { latitude: next[1].latitude, longitude: next[1].longitude }
          );
          alert(`Distance: ${formatDistance(dist)}`);
          return [];
        }
        return next;
      });
    };

    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [mapLoaded, measureMode]);

  return (
    <div className="map-container">
      <div ref={mapContainer} className="mapbox-canvas" />

      {/* Map controls overlay */}
      <div className="map-controls">
        <button
          className={`map-ctrl-btn ${measureMode ? 'active' : ''}`}
          onClick={() => setMeasureMode((v) => !v)}
          title="Measure Distance (click 2 points)"
        >
          📏
        </button>
        <button
          className="map-ctrl-btn"
          onClick={() => {
            if (mapRef.current) mapRef.current.flyTo({ center: BHOPAL_CENTER, zoom: 11, speed: 1.5 });
          }}
          title="Reset View"
        >
          🏠
        </button>
      </div>

      {measureMode && (
        <div className="measure-hint">
          📍 {measurePoints.length === 0 ? 'Click first point' : 'Click second point to measure'}
        </div>
      )}

      {!mapboxgl.accessToken || mapboxgl.accessToken.includes('YOUR_MAPBOX_TOKEN') ? (
        <div className="map-token-warning">
          <div className="warning-card">
            <h3>🗺️ Mapbox Token Required</h3>
            <p>Your map is black because the access token is missing or invalid.</p>
            <a href="https://account.mapbox.com/" target="_blank" rel="noopener noreferrer" className="token-link">
              Get Free Token from Mapbox.com
            </a>
            <div className="token-instructions">
              Paste it in: <code>admin-dashboard/.env</code>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const buildPopupHTML = (emp, location, status) => `
  <div class="popup-content">
    <div class="popup-header">
      <div class="popup-avatar">${getInitials(emp.name)}</div>
      <div>
        <div class="popup-name">${emp.name}</div>
        <div class="popup-id">${emp.employeeId || ''} · ${emp.designation || ''}</div>
      </div>
    </div>
    <div class="popup-status ${status}">${status.toUpperCase()}</div>
    <div class="popup-rows">
      <div class="popup-row"><span>📍</span><span>${location?.address || 'Fetching address…'}</span></div>
      <div class="popup-row"><span>🌐</span><span>${location?.latitude?.toFixed(6) || '—'}, ${location?.longitude?.toFixed(6) || '—'}</span></div>
      <div class="popup-row"><span>⚡</span><span>${location?.speed ? (location.speed * 3.6).toFixed(1) + ' km/h' : '—'}</span></div>
      <div class="popup-row"><span>🎯</span><span>Accuracy: ${location?.accuracy ? location.accuracy.toFixed(0) + 'm' : '—'}</span></div>
    </div>
  </div>
`;

export default MapboxMap;
