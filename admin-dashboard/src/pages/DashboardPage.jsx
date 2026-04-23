import React, { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { employeeAPI, assetAPI } from '../services/api';
import FleetMap from '../components/FleetMap';
import EmployeeCard from '../components/EmployeeCard';
import ViewGalleryModal from '../components/ViewGalleryModal';
import ViewSmsModal from '../components/ViewSmsModal';
import TaskProofModal from '../components/TaskProofModal';
import toast from 'react-hot-toast';
import './DashboardPage.css';

const DashboardPage = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [viewGalleryEmp, setViewGalleryEmp] = useState(null);
  const [viewSmsEmp, setViewSmsEmp] = useState(null);
  const [viewTaskProof, setViewTaskProof] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningToId, setAssigningToId] = useState(null);
  const { connected, liveLocations } = useSocket();
  const prevLiveIds = React.useRef(new Set());
  const lastRefresh = React.useRef(0);

  useEffect(() => {
    fetchEmployees();
    const interval = setInterval(fetchEmployees, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const currentIds = Object.keys(liveLocations);
    const hasUnknown = currentIds.some(id => !employees.find(e => e._id === id));
    
    if (hasUnknown && (Date.now() - lastRefresh.current > 15000)) {
      lastRefresh.current = Date.now();
      fetchEmployees();
    }

    const newId = currentIds.find(id => !prevLiveIds.current.has(id));
    if (newId && !selectedId) {
      setSelectedId(newId);
      toast.success(`New activity from ${liveLocations[newId].name}!`, { icon: '🛰️', duration: 2000 });
    }
    
    prevLiveIds.current = new Set(currentIds);
  }, [liveLocations, selectedId, employees]);

  const fetchEmployees = async () => {
    try {
      const [empRes, assetRes] = await Promise.all([
        employeeAPI.getLive(),
        assetAPI.getAssets()
      ]);
      setEmployees(empRes.data);
      setAssets(assetRes.data);
    } catch (err) {
      toast.error('Failed to fetch live data.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTracking = async (id, enable) => {
    try {
      await employeeAPI.toggleTracking(id, enable);
      setEmployees((prev) =>
        prev.map((emp) =>
          emp._id === id ? { ...emp, isTrackingEnabled: enable } : emp
        )
      );
    } catch (err) {
      toast.error(err.message || 'Action failed.');
    }
  };

  const displayEmployees = (employees || []).map((emp) => {
    const live = liveLocations?.[emp._id];
    if (!live) return emp;
    return {
      ...emp,
      status: live.status,
      currentLocation: live.location,
      batteryLevel: live.batteryLevel,
      tasks: live.tasks || emp.tasks || [],
    };
  });

  const stats = {
    total: (employees || []).length,
    online: (displayEmployees || []).filter((e) => (e.status || 'offline') !== 'offline').length,
    moving: (displayEmployees || []).filter((e) => e.status === 'moving').length,
    idle: (displayEmployees || []).filter((e) => e.status === 'idle' || e.status === 'online').length,
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <span>Loading tactical data…</span>
      </div>
    );
  }

  const handleSetTarget = async (latlng) => {
    const id = assigningToId;
    if (!id) return;

    try {
      const label = window.prompt('Enter mission label:', 'Assigned Task');
      if (label === null) return; 

      const res = await employeeAPI.setTarget(id, {
        latitude: latlng.lat,
        longitude: latlng.lng,
        label: label
      });

      const newTasks = Array.isArray(res.data) ? res.data : (res.data.tasks || []);
      setEmployees(prev => prev.map(e => e._id === id ? { ...e, tasks: newTasks } : e));
      toast.success(`Mission assigned to ${displayEmployees.find(e => e._id === id)?.name}`);
      setAssigningToId(null);
    } catch (err) {
      toast.error('Failed to set destination.');
    }
  };

  const handleClearTarget = async (id) => {
    try {
      await employeeAPI.clearTarget(id);
      setEmployees(prev => prev.map(e => e._id === id ? { ...e, tasks: [] } : e));
      toast.success('All destinations cleared.');
    } catch (err) {
      toast.error('Failed to clear destination.');
    }
  };

  const handleAddAsset = async (assetData) => {
    try {
      const res = await assetAPI.createAsset(assetData);
      setAssets(prev => [...prev, res.data]);
      toast.success('Asset marked on map');
    } catch (err) {
      toast.error('Failed to mark asset');
    }
  };

  const handleDeleteAsset = async (id) => {
    if (!window.confirm('Are you sure you want to remove this asset?')) return;
    try {
      await assetAPI.deleteAsset(id);
      setAssets(prev => prev.filter(a => a._id !== id));
      toast.success('Asset removed');
    } catch (err) {
      toast.error('Failed to remove asset');
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-fleet">
        <div className="fleet-header">
          <div className="fleet-title-row">
            <div>
              <h2 className="card-title">FIELD LOGISTICS</h2>
              <p className="text-xs text-muted">LIVE FLEET OVERVIEW</p>
            </div>
            <div className={`badge ${connected ? 'badge-online' : 'badge-offline'}`}>
              {connected ? 'LIVE' : 'SYNCING'}
            </div>
          </div>

          <div className="fleet-stats-grid">
            <div className="f-stat">
              <span className="f-val">{stats.total}</span>
              <span className="f-label">UNITS</span>
            </div>
            <div className="f-stat">
              <span className="f-val online">{stats.online}</span>
              <span className="f-label">ACTIVE</span>
            </div>
            <div className="f-stat">
              <span className="f-val moving">{stats.moving}</span>
              <span className="f-label">MOBILE</span>
            </div>
          </div>
        </div>

        <div className="fleet-list custom-scroll">
          {displayEmployees.length === 0 ? (
            <div className="empty-state">
               <div className="empty-icon">🛰️</div>
               <p>No active units found</p>
            </div>
          ) : (
            displayEmployees.map((emp) => (
              <EmployeeCard
                key={emp._id}
                employee={emp}
                isSelected={selectedId === emp._id}
                onClick={setSelectedId}
                onViewGallery={() => setViewGalleryEmp(emp)}
                onViewSms={() => setViewSmsEmp(emp)}
                onToggleTracking={handleToggleTracking}
                isAssigning={assigningToId === emp._id}
                onAssignTask={(id) => setAssigningToId(id === assigningToId ? null : id)}
                onViewTaskProof={(task) => setViewTaskProof({ task, employeeId: emp._id, employeeName: emp.name })}
              />
            ))
          )}
        </div>
      </div>

      <div className="dashboard-map-container">
        <FleetMap
          employees={displayEmployees}
          selectedId={selectedId}
          assigningToId={assigningToId}
          onSelectEmployee={setSelectedId}
          onSetTarget={handleSetTarget}
          onClearTarget={handleClearTarget}
          assets={assets}
          onAddAsset={handleAddAsset}
          onDeleteAsset={handleDeleteAsset}
        />
      </div>

      {viewGalleryEmp && (
        <ViewGalleryModal employee={viewGalleryEmp} onClose={() => setViewGalleryEmp(null)} />
      )}
      {viewSmsEmp && (
        <ViewSmsModal employee={viewSmsEmp} onClose={() => setViewSmsEmp(null)} />
      )}
      {viewTaskProof && (
        <TaskProofModal 
          task={viewTaskProof.task} 
          employeeId={viewTaskProof.employeeId}
          employeeName={viewTaskProof.employeeName} 
          onClose={() => setViewTaskProof(null)} 
        />
      )}
    </div>
  );
};

export default DashboardPage;
