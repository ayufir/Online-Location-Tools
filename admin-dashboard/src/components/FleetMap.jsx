import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocket } from '../context/SocketContext';
import { getStatusColor, getInitials } from '../utils/helpers';
import './FleetMap.css';

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const BHOPAL_CENTER = [23.2599, 77.4126];

// ─── Component: Map Events ──────────────────────────────────────────────────
const MapEvents = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
};

// ─── Component: Map Controller ───────────────────────────────────────────────
const MapController = ({ selectedId, employees, liveLocations, historyCoords }) => {
  const map = useMap();
  const initialFitDone = useRef(false);

  useEffect(() => {
    if (selectedId) {
      const live = liveLocations[selectedId];
      const loc = live?.location;
      if (loc?.latitude && loc?.longitude) {
        map.panTo([loc.latitude, loc.longitude], { animate: true, duration: 1.0 });
        if (!initialFitDone.current) {
           map.setZoom(15);
           initialFitDone.current = true;
        }
      }
    } else if (employees.length > 0 && !initialFitDone.current) {
      const coords = employees
        .map(e => liveLocations[e._id]?.location || e.currentLocation)
        .filter(l => l?.latitude && l?.longitude)
        .map(l => [l.latitude, l.longitude]);
      
      if (coords.length > 0) {
        map.fitBounds(coords, { padding: [50, 50], maxZoom: 15 });
        initialFitDone.current = true;
      }
    }
  }, [selectedId, employees, liveLocations, map]);

  useEffect(() => {
    if (historyCoords.length > 1) {
      const bounds = historyCoords.map(c => [c.latitude, c.longitude]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [historyCoords, map]);

  return null;
};

// ─── Component: FleetMap ──────────────────────────────────────────────────────
const FleetMap = ({ employees = [], selectedId, assigningToId, onSelectEmployee, showHistory, historyCoords = [], onSetTarget, onClearTarget, assets = [], onAddAsset, onDeleteAsset }) => {
  const { liveLocations } = useSocket();
  const [isSatellite, setIsSatellite] = useState(false);
  const [isAddingAsset, setIsAddingAsset] = useState(false);

  const TILE_LAYERS = {
    standard: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    satellite: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
  };

  const createCustomIcon = (emp, status) => {
    return L.divIcon({
      className: `custom-marker ${status} ${selectedId === emp._id ? 'selected' : ''}`,
      html: `
        <div class="l-marker">
           <div class="l-marker-ring"></div>
           <div class="l-marker-body">
              <span class="l-marker-initials">${getInitials(emp.name)}</span>
           </div>
           <div class="l-marker-label">${emp.name}</div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  const createTargetIcon = () => {
    return L.divIcon({
      className: 'target-marker-icon',
      html: `
        <div class="target-flag">
           <div class="target-solar">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="5" width="20" height="14" rx="1" fill="#0F172A" stroke="#FFB800" stroke-width="2"/>
                <path d="M2 12H22M8 5V19M16 5V19" stroke="#FFB800" stroke-width="1"/>
              </svg>
           </div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  const createAssetIcon = (asset) => {
    return L.divIcon({
      className: 'asset-marker-icon',
      html: `
        <div class="asset-pin">
          <div class="asset-icon">☀️</div>
          <div class="asset-name">${asset.name}</div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });
  };

  return (
    <div className={`fleet-map-container ${assigningToId ? 'assignment-mode' : ''}`}>
      {/* Instructions for assignment mode */}
      {assigningToId && (
        <div className="map-instruction-overlay">
           <div className="instruction-card glow-yellow">
              <span className="inst-icon">☀️</span>
              <div>
                 <p className="inst-title">Assigning Solar Mission to {employees.find(e => e._id === assigningToId)?.name}</p>
                 <p className="inst-sub">Click anywhere on the map to set location</p>
              </div>
           </div>
        </div>
      )}

      {/* Floating Controls */}
      <div className="map-controls">
        <button 
          className={`map-btn ${isAddingAsset ? 'active' : ''}`} 
          onClick={() => setIsAddingAsset(!isAddingAsset)}
          title="Mark New Asset Location"
        >
          📍
        </button>
        <button className={`map-btn ${isSatellite ? 'active' : ''}`} onClick={() => setIsSatellite(!isSatellite)}>
          {isSatellite ? '🏙️' : '🛰️'}
        </button>
      </div>

      <MapContainer 
        center={BHOPAL_CENTER} 
        zoom={13} 
        className="leaflet-container"
        zoomControl={false}
      >
        <TileLayer url={isSatellite ? TILE_LAYERS.satellite : TILE_LAYERS.standard} />
        
        <MapController 
          selectedId={selectedId} 
          employees={employees} 
          liveLocations={liveLocations} 
          historyCoords={historyCoords} 
        />

        {isAddingAsset ? (
           <MapEvents onMapClick={(latlng) => {
             const name = prompt("Enter Asset Name (e.g. Panel A1):");
             if (name) {
               onAddAsset({ name, latitude: latlng.lat, longitude: latlng.lng });
               setIsAddingAsset(false);
             }
           }} />
        ) : (
           assigningToId && <MapEvents onMapClick={(latlng) => onSetTarget(latlng)} />
        )}

        {/* ── Asset Markers ── */}
        {assets.map((asset) => (
          <Marker 
            key={`asset-${asset._id}`} 
            position={[asset.latitude, asset.longitude]} 
            icon={createAssetIcon(asset)}
          >
            <Popup>
              <div className="asset-popup">
                <div className="flex justify-between items-start mb-2">
                  <span className="fw-800 text-lg">{asset.name}</span>
                  <button 
                    className="btn-delete-asset" 
                    onClick={() => onDeleteAsset(asset._id)}
                  >
                    🗑️
                  </button>
                </div>
                Type: {asset.type}<br/>
                Status: <span className="status-tag">{asset.status}</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ── Employee Markers ── */}
        {employees.map((emp) => {
          const live = liveLocations[emp._id] || {};
          const location = live.location || emp.currentLocation || { latitude: 23.2599, longitude: 77.4126 };
          const status = live.status || emp.status || 'offline';
          const tasks = live.tasks || emp.tasks || [];

          if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') return null;

          return (
            <React.Fragment key={emp._id}>
              <Marker 
                position={[location.latitude, location.longitude]}
                icon={createCustomIcon(emp, status)}
                eventHandlers={{ click: () => onSelectEmployee(emp._id) }}
              >
                <Popup>
                  <div className="l-popup">
                    <div className="l-popup-header">
                      <div className="l-popup-avatar">{getInitials(emp.name)}</div>
                      <div className="l-popup-name">{emp.name}</div>
                    </div>
                    <div className={`l-popup-status ${status}`}>{status}</div>
                    <div className="l-popup-address">
                      📍 {location?.address || 'Locating...'}
                    </div>
                    <div className="l-popup-battery">
                      🔋 Battery: <span className="fw-700">{live.batteryLevel ?? emp.batteryLevel ?? '--'}%</span>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Task Markers & Paths */}
              {tasks.map((task, idx) => (
                <React.Fragment key={`${emp._id}-task-${idx}`}>
                  <Marker position={[task.latitude, task.longitude]} icon={createTargetIcon()}>
                    <Popup>
                      <div className="l-popup-target">
                         <span>{task.label}</span>
                         <button className="btn-clear-target" onClick={() => onClearTarget(emp._id)}>❌</button>
                      </div>
                    </Popup>
                  </Marker>
                  <Polyline 
                    positions={[
                      [location.latitude, location.longitude], 
                      [task.latitude, task.longitude]
                    ]} 
                    color={getStatusColor(status)} 
                    dashArray="5, 10" 
                    weight={2} 
                    opacity={0.5}
                  />
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        })}

        {/* ── History Path ── */}
        {showHistory && historyCoords.length > 1 && (
          <Polyline 
            positions={historyCoords.map(c => [c.latitude, c.longitude])} 
            color="#FFB800" 
            weight={4} 
            opacity={0.8} 
          />
        )}
      </MapContainer>
    </div>
  );
};

export default FleetMap;
