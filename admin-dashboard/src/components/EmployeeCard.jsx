import React from 'react';
import { timeAgo, formatDistance, formatSpeed, getInitials, truncate } from '../utils/helpers';
import { useSocket } from '../context/SocketContext';
import './EmployeeCard.css';

const EmployeeCard = ({ employee, isSelected, onClick, onToggleTracking }) => {
  const { liveLocations } = useSocket();
  const live = liveLocations[employee._id] || {};
  const status = live.status || employee.status || 'offline';
  const location = live.location || employee.currentLocation;
  const battery = live.batteryLevel ?? employee.batteryLevel;
  const distance = live.sessionDistance;

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

      {/* Stats row */}
      <div className="emp-stats">
        <div className="emp-stat">
          <span className="emp-stat-val">{formatSpeed(location?.speed)}</span>
          <span className="emp-stat-label">Speed</span>
        </div>
        <div className="emp-stat">
          <span className="emp-stat-val">{formatDistance(distance)}</span>
          <span className="emp-stat-label">Today</span>
        </div>
        <div className="emp-stat">
          {battery !== null ? (
            <>
              <span className="emp-stat-val" style={{ color: batteryColor }}>{battery}%</span>
              <span className="emp-stat-label">Battery</span>
            </>
          ) : (
            <>
              <span className="emp-stat-val">—</span>
              <span className="emp-stat-label">Battery</span>
            </>
          )}
        </div>
        <div className="emp-stat">
          <span className="emp-stat-val time">{timeAgo(location?.timestamp || employee.lastSeen)}</span>
          <span className="emp-stat-label">Last seen</span>
        </div>
      </div>

      {/* Tracking toggle */}
      <div className="emp-card-footer" onClick={(e) => e.stopPropagation()}>
        <button
          className={`tracking-toggle ${employee.isTrackingEnabled ? 'stop' : 'start'}`}
          onClick={() => onToggleTracking(employee._id, !employee.isTrackingEnabled)}
        >
          {employee.isTrackingEnabled ? '⏹ Stop Tracking' : '▶ Start Tracking'}
        </button>
      </div>
    </div>
  );
};

export default EmployeeCard;
