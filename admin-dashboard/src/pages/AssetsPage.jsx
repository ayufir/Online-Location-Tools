import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { assetAPI } from '../services/api';
import toast from 'react-hot-toast';
import './AssetsPage.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const BHOPAL_CENTER = [23.2599, 77.4126];

const MapEvents = ({ onMapClick, isAdding }) => {
  useMapEvents({
    click: (e) => {
      if (isAdding) onMapClick(e.latlng);
    },
  });
  return null;
};

const AssetsPage = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const res = await assetAPI.getAssets();
      setAssets(res.data);
    } catch (err) {
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (latlng) => {
    const name = window.prompt('Enter Solar Panel Name/ID:', `Panel-${assets.length + 1}`);
    if (!name) return;

    try {
      const res = await assetAPI.createAsset({
        name,
        latitude: latlng.lat,
        longitude: latlng.lng,
        type: 'Solar Panel'
      });
      setAssets([...assets, res.data]);
      toast.success('Asset added successfully!');
      setIsAdding(false);
    } catch (err) {
      toast.error('Failed to add asset');
    }
  };

  const handleDeleteAsset = async (id) => {
    if (!window.confirm('Delete this asset permanentely?')) return;
    try {
      await assetAPI.deleteAsset(id);
      setAssets(assets.filter(a => a._id !== id));
      toast.success('Asset removed');
    } catch (err) {
      toast.error('Failed to remove asset');
    }
  };

  const assetIcon = (name) => L.divIcon({
    className: 'asset-div-icon',
    html: `
      <div class="asset-marker-outer">
        <div class="asset-marker-inner">☀️</div>
        <div class="asset-marker-label">${name}</div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40]
  });

  if (loading) return <div className="loading">Initializing Asset Map...</div>;

  return (
    <div className="assets-page glass-effect">
      <div className="assets-sidebar glass-sidebar">
        <div className="assets-header">
          <h2 className="premium-title">SOLAR GRID</h2>
          <p className="text-xs text-muted">INFRASTRUCTURE MANAGEMENT</p>
          
          <div className="asset-stats mt-4">
             <div className="stat-pill">
                <span className="stat-val">{assets.length}</span>
                <span className="stat-label">Total Panels</span>
             </div>
          </div>

          <button 
            className={`btn ${isAdding ? 'btn-danger' : 'btn-primary'} w-full mt-4`}
            onClick={() => setIsAdding(!isAdding)}
          >
            {isAdding ? '✖ Cancel Adding' : '➕ Add New Panel'}
          </button>
          {isAdding && <p className="hint-text">Click anywhere on the map to place a new panel</p>}
        </div>

        <div className="asset-list custom-scroll">
          {assets.map(asset => (
            <div key={asset._id} className="asset-item glass-card">
               <div className="asset-info">
                  <span className="asset-name">{asset.name}</span>
                  <span className="asset-coords">{asset.latitude.toFixed(4)}, {asset.longitude.toFixed(4)}</span>
               </div>
               <button className="btn-delete" onClick={() => handleDeleteAsset(asset._id)}>🗑️</button>
            </div>
          ))}
        </div>
      </div>

      <div className="assets-map-container">
        <div className="map-toolbar">
           <button className="tool-btn" onClick={() => setIsSatellite(!isSatellite)}>
              {isSatellite ? '🏙️' : '🛰️'}
           </button>
        </div>

        <MapContainer center={BHOPAL_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer 
            url={isSatellite ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"} 
          />
          
          <MapEvents onMapClick={handleAddAsset} isAdding={isAdding} />

          {assets.map(asset => (
            <Marker 
              key={asset._id} 
              position={[asset.latitude, asset.longitude]}
              icon={assetIcon(asset.name)}
            >
              <Popup>
                <div className="asset-popup">
                  <h3>{asset.name}</h3>
                  <p>Status: {asset.status}</p>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAsset(asset._id)}>Delete</button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default AssetsPage;
