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
const FleetMap = ({ employees = [], selectedId, onSelectEmployee, showHistory, historyCoords = [], onSetTarget, onClearTarget, assets = [], onAddAsset, onDeleteAsset }) => {
  const { liveLocations } = useSocket();
  const [isSatellite, setIsSatellite] = useState(false);
  const [trails, setTrails] = useState({});
  const [isAddingAsset, setIsAddingAsset] = useState(false);

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

  useEffect(() => {
    const newTrails = { ...trails };
    let changed = false;

    Object.keys(liveLocations).forEach(id => {
      const loc = liveLocations[id]?.location;
      if (!loc?.latitude || !loc?.longitude) return;

      const currentTrail = newTrails[id] || [];
      const lastPoint = currentTrail[currentTrail.length - 1];

      if (!lastPoint || lastPoint.lat !== loc.latitude || lastPoint.lng !== loc.longitude) {
        const updated = [...currentTrail, { lat: loc.latitude, lng: loc.longitude }].slice(-10);
        newTrails[id] = updated;
        changed = true;
      }
    });

    if (changed) setTrails(newTrails);
  }, [liveLocations]);

  const createCustomIcon = (emp, status) => {
    const initials = getInitials(emp.name);
    // Use avatar if available, otherwise fallback to initials
    const avatarUrl = emp.avatar || `https://i.pravatar.cc/100?u=${emp._id}`;
    
    return L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div class="l-marker ${selectedId === emp._id ? 'selected' : ''} status-${status}">
          <div class="l-marker-ring"></div>
          <div class="l-marker-body">
            ${emp.avatar || true ? 
              `<img src="${avatarUrl}" class="l-marker-avatar-img" alt="${emp.name}" />` : 
              `<span class="l-marker-initials">${initials}</span>`
            }
          </div>
          <div class="l-marker-label">${emp.name.split(' ')[0]}</div>
        </div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });
  };

  const createTargetIcon = () => {
    return L.divIcon({
      className: 'target-marker-icon',
      html: `
        <div class="target-flag">
          <div class="target-pole"></div>
          <div class="target-cloth">🏁</div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [4, 32],
    });
  };

  const TILE_LAYERS = {
    standard: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    satellite: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
  };

  return (
    <div className="fleet-map-container">
      <MapContainer center={BHOPAL_CENTER} zoom={12} scrollWheelZoom={true} zoomControl={false}>
        <TileLayer url={isSatellite ? TILE_LAYERS.satellite : TILE_LAYERS.standard} />

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

        {isAddingAsset ? (
           <MapEvents onMapClick={(latlng) => {
             const name = prompt("Enter Asset Name (e.g. Panel A1):");
             if (name) {
               onAddAsset({ name, latitude: latlng.lat, longitude: latlng.lng });
               setIsAddingAsset(false);
             }
           }} />
        ) : (
           selectedId && <MapEvents onMapClick={(latlng) => onSetTarget(selectedId, latlng)} />
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
                  <strong>{asset.name}</strong>
                  <button 
                    className="btn-delete-asset" 
                    title="Remove Asset"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDeleteAsset(asset._id);
                    }}
                  >
                    🗑️
                  </button>
                </div>
                Type: {asset.type}<br/>
                Status: <span className="status-tag">{asset.status}</span>
                
                {selectedId && (
                  <div className="asset-action">
                    <button 
                      className="btn-assign-asset"
                      onClick={() => onSetTarget(selectedId, { lat: asset.latitude, lng: asset.longitude, label: `MISSION: ${asset.name}` })}
                    >
                      🚀 Assign to Field Unit
                    </button>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {employees.map((emp) => {
          const live = liveLocations[emp._id] || {};
          const location = live.location || emp.currentLocation || { latitude: 23.2599, longitude: 77.4126 };
          const status = live.status || emp.status || 'offline';
          const target = live.targetLocation || emp.targetLocation;

          if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') return null;

          return (
            <React.Fragment key={emp._id}>
              {/* Employee Marker */}
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
                    {target?.latitude && (
                       <div className="l-popup-target">
                         🎯 Heading to: {target.label}
                         <button 
                           className="btn-clear-target" 
                           title="Clear Destination"
                           onClick={(e) => { e.stopPropagation(); onClearTarget(emp._id); }}
                         >
                           🗑️
                         </button>
                       </div>
                    )}
                  </div>
                </Popup>
              </Marker>

              {/* Target Marker & Path */}
              {target?.latitude && target?.longitude && (
                <>
                  <Marker position={[target.latitude, target.longitude]} icon={createTargetIcon()}>
                    <Popup>Destination: {target.label}</Popup>
                  </Marker>
                  <Polyline 
                    positions={[[location.latitude, location.longitude], [target.latitude, target.longitude]]}
                    color="#10B981"
                    weight={2}
                    dashArray="10, 10"
                    opacity={0.5}
                  />
                </>
              )}
            </React.Fragment>
          );
        })}

        {Object.keys(trails).map(id => (
          <Polyline 
            key={`trail-${id}`}
            positions={trails[id].map(p => [p.lat, p.lng])}
            color={selectedId === id ? "#F59E0B" : "rgba(139, 148, 158, 0.4)"}
            weight={selectedId === id ? 4 : 2}
            dashArray="5, 8"
            opacity={0.6}
          />
        ))}

        <MapController selectedId={selectedId} employees={employees} liveLocations={liveLocations} historyCoords={historyCoords} />
      </MapContainer>
    </div>
  );
};

export default FleetMap;
