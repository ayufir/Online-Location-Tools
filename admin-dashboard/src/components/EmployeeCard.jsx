import React from 'react';
import { timeAgo, formatDistance, formatSpeed, getInitials, truncate, formatDuration } from '../utils/helpers';
import { useSocket } from '../context/SocketContext';
import './EmployeeCard.css';

const EmployeeCard = ({ employee, isSelected, onClick, onToggleTracking, onViewGallery, onViewSms, isAssigning, onAssignTask, onViewTaskProof }) => {
  const { liveLocations } = useSocket();
  const live = liveLocations[employee._id] || {};
  const status = live.status || employee.status || 'offline';
  const location = live.location || employee.currentLocation;
  const battery = live.batteryLevel ?? employee.batteryLevel;
  const distance = live.sessionDistance;
  const lastConnected = live.lastConnectedAt || employee.lastConnectedAt;
  const lastDisconnected = live.lastDisconnectedAt || employee.lastDisconnectedAt;

  const batteryColor = battery === null ? '#6B7280' : battery > 40 ? '#10B981' : battery > 15 ? '#F59E0B' : '#EF4444';

  return (
    <div
      className={`emp-card ${isSelected ? 'selected' : ''} ${status}`}
      onClick={() => onClick(employee._id)}
      role="button"
      tabIndex={0}
    >
      {/* Avatar + name */}
      <div className="emp-card-top">
        <div className={`emp-avatar status-ring-${status}`}>
          {getInitials(employee.name)}
        </div>
        <div className="emp-info">
          <div className="emp-name">{employee.name}</div>
          <div className="emp-meta">{employee.employeeId} · {employee.department}</div>
        </div>
        <div className={`badge badge-${status}`}>{status}</div>
        {employee.tasks?.length > 0 && (
          <div className="badge badge-task" title={`${employee.tasks.length} active missions`}>
            ☀️ {employee.tasks.length}
          </div>
        )}
      </div>

      <div className="emp-location">
        <span className="emp-location-icon">📍</span>
        <span className="emp-location-text">
          {location?.address 
            ? truncate(location.address, 38)
            : (location?.latitude ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Location unavailable')
          }
        </span>
      </div>

      {employee.tasks?.length > 0 && (
        <div className="emp-tasks-mini custom-scroll">
           {employee.tasks.map((t, i) => (
             <div 
              key={i} 
              className={`mini-task-item ${t.status}`}
              onClick={(e) => {
                if (t.status === 'submitted' || t.status === 'completed') {
                  e.stopPropagation();
                  onViewTaskProof(t);
                }
              }}
              style={{ cursor: (t.status === 'submitted' || t.status === 'completed') ? 'pointer' : 'default' }}
             >
                <span className={t.status === 'submitted' ? 'dot-orange' : (t.status === 'completed' ? 'dot-blue' : 'dot-green')}></span> 
                <span className="mini-task-label">{truncate(t.label, 20)}</span>
                {t.status === 'submitted' && <span className="task-verify-tag">VIEW PROOF</span>}
                {t.status === 'completed' && <span className="task-done-tag">DONE</span>}
             </div>
           ))}
        </div>
      )}

      {/* Stats row */}
      <div className="emp-stats">
        <div className="emp-stat">
          <span className="emp-stat-val">
            {status !== 'offline' ? formatDuration(lastConnected) : formatDuration(lastConnected, lastDisconnected)}
          </span>
          <span className="emp-stat-label">On App</span>
        </div>
        <div className="emp-stat">
          <span className="emp-stat-val">{formatDistance(distance)}</span>
          <span className="emp-stat-label">Dist.</span>
        </div>
        <div className="emp-stat">
          {battery !== null ? (
            <>
              <span className="emp-stat-val" style={{ color: batteryColor }}>{battery}%</span>
              <span className="emp-stat-label">Battery</span>
            </>
          ) : (
            <><span className="emp-stat-val">—</span><span className="emp-stat-label">Batt.</span></>
          )}
        </div>
        <div className="emp-stat">
          <span className="emp-stat-val time">
            {status === 'offline' ? (lastDisconnected ? timeAgo(lastDisconnected) : 'Offline') : timeAgo(location?.timestamp || employee.lastSeen)}
          </span>
          <span className="emp-stat-label">{status === 'offline' ? 'Logged out' : 'Last seen'}</span>
        </div>
      </div>

      {/* Tracking toggle */}
      <div className="emp-card-footer" onClick={(e) => e.stopPropagation()}>
        <button
          className={`tracking-toggle ${employee.isTrackingEnabled ? 'stop' : 'start'}`}
          onClick={() => onToggleTracking(employee._id, !employee.isTrackingEnabled)}
        >
          {employee.isTrackingEnabled ? '⏹ Stop' : '▶ Start'}
        </button>
        <button
          className={`btn-icon-secondary ${isAssigning ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onAssignTask(employee._id); }}
          title="Click then select destination on map"
          style={{ borderColor: isAssigning ? '#FFB800' : '' }}
        >
          {isAssigning ? '🎯 Select Map' : '🚩 Assign'}
        </button>
        <button 
          className="btn-icon-secondary" 
          title="View Gallery"
          onClick={() => onViewGallery(employee._id)}
        >
          🖼️
        </button>
        <button 
          className="btn-icon-secondary" 
          title="View SMS Logs"
          onClick={() => onViewSms(employee._id)}
        >
          💬
        </button>
      </div>
    </div>
  );
};

export default EmployeeCard;
