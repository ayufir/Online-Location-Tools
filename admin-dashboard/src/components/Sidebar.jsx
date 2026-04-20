import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const navItems = [
  { to: '/dashboard', icon: '📡', label: 'Live Dashboard' },
  { to: '/employees', icon: '👥', label: 'Employees' },
  { to: '/tracking',  icon: '🗺️', label: 'Track & History' },
];

const Sidebar = () => {
  const { connected, liveLocations } = useSocket();
  const { user, logout } = useAuth();
  const location = useLocation();

  const onlineCount = Object.values(liveLocations).filter(
    (e) => e.status !== 'offline'
  ).length;

  const movingCount = Object.values(liveLocations).filter(
    (e) => e.status === 'moving'
  ).length;

  return (
    <aside className="sidebar">
      {/* ── Logo ── */}
      <div className="sidebar-logo">
        <div className="logo-icon">🌞</div>
        <div>
          <div className="logo-name">SolarTrack</div>
          <div className="logo-sub">Pro Fleet Command</div>
        </div>
      </div>

      {/* ── Connection status ── */}
      <div className={`connection-badge ${connected ? 'connected' : 'disconnected'}`}>
        <span className="conn-dot" />
        {connected ? 'Live Connected' : 'Reconnecting…'}
      </div>

      {/* ── Live stats ── */}
      <div className="sidebar-stats">
        <div className="stat-pill">
          <span className="stat-val moving">{movingCount}</span>
          <span className="stat-label">Moving</span>
        </div>
        <div className="stat-pill">
          <span className="stat-val online">{onlineCount}</span>
          <span className="stat-label">Online</span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.to === '/dashboard' && onlineCount > 0 && (
              <span className="nav-badge">{onlineCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer / User ── */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.name?.[0] || 'A'}</div>
          <div className="user-details">
            <div className="user-name">{user?.name || 'Admin'}</div>
            <div className="user-role">Administrator</div>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={logout} title="Logout">
          ⇥
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
