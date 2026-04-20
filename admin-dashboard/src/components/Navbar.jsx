import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const pageTitles = {
  '/dashboard': { title: 'Live Dashboard', sub: 'Real-time employee tracking command center' },
  '/employees': { title: 'Employee Management', sub: 'Manage your field workforce' },
  '/tracking':  { title: 'Track & History', sub: 'Movement trails and location analytics' },
};

const Navbar = () => {
  const location = useLocation();
  const { connected } = useSocket();
  const { logout } = useAuth();

  const page = pageTitles[location.pathname] || pageTitles['/dashboard'];
  const now = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="page-title">{page.title}</div>
        <div className="page-sub">{page.sub}</div>
      </div>
      <div className="navbar-right">
        <div className="current-time">{now}</div>
        <div className={`ws-status ${connected ? 'live' : 'off'}`}>
          <span className="ws-dot" />
          {connected ? 'LIVE' : 'OFFLINE'}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={logout}>
          Sign Out
        </button>
      </div>
    </header>
  );
};

export default Navbar;
