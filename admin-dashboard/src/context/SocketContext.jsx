import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  // Local state mirrors of live data
  const [liveLocations, setLiveLocations] = useState({});  // employeeId → {location, status, ...}
  const [activityFeed, setActivityFeed] = useState([]);    // Recent events

  useEffect(() => {
    const connectSocket = () => {
      if (socketRef.current) socketRef.current.disconnect();

      const token = localStorage.getItem('solartrack_token');
      const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

      console.log('🔌 [Socket] Connecting to:', SOCKET_URL, token ? '(Authenticated)' : '(Guest)');

      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        console.log('✅ [Socket] Connected as:', token ? 'Admin' : 'Guest');
        socket.emit('admin:join');
      });

      socket.on('disconnect', () => {
        setConnected(false);
        console.log('❌ [Socket] Disconnected');
      });

      // ─── Live Location Updates ─────────────────────────────────────────────
      socket.on('locationUpdate', (data) => {
        setLiveLocations((prev) => {
          const existing = prev[data.employeeId] || {};
          return {
            ...prev,
            [data.employeeId]: { ...existing, ...data },
          };
        });
        addActivity({
          type: 'location',
          employeeId: data.employeeId,
          name: data.name,
          status: data.status,
          message: `${data.name} — ${data.location?.address || 'Location updated'}`,
          timestamp: data.timestamp,
        });
      });

      // ─── Status Changes ────────────────────────────────────────────────────
      socket.on('employeeStatusChange', (data) => {
        setLiveLocations((prev) => {
          const existing = prev[data.employeeId] || {};
          return {
            ...prev,
            [data.employeeId]: { ...existing, ...data },
          };
        });
        addActivity({
          type: 'status',
          employeeId: data.employeeId,
          name: data.name,
          status: data.status,
          message: `${data.name} is now ${data.status}`,
          timestamp: data.timestamp,
        });
      });

      // ─── Connected employees ───────────────────────────────────────────────
      socket.on('connectedEmployees', ({ employees }) => {
        const map = {};
        employees.forEach((e) => { map[e.employeeId] = e; });
        setLiveLocations((prev) => ({ ...prev, ...map }));
      });
    };

    connectSocket();

    // Listen for storage events (e.g., login in another tab or after redirect)
    const handleStorageChange = (e) => {
      if (e.key === 'solartrack_token') {
        console.log('🔑 [Socket] Token changed, reconnecting...');
        connectSocket();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const reconnect = () => {
    console.log('🔄 [Socket] Manual reconnection requested...');
    // We just need to trigger the effect or manually call the internal connectSocket
    // For simplicity, we'll expose the socketRef to allow manual connect/disconnect calls
    if (socketRef.current) {
       const token = localStorage.getItem('solartrack_token');
       socketRef.current.auth = { token };
       socketRef.current.disconnect().connect();
    }
  };

  const addActivity = (event) => {
    setActivityFeed((prev) => [
      { ...event, id: `${Date.now()}-${Math.random()}` },
      ...prev.slice(0, 99), // Keep max 100 events
    ]);
  };

  const socket = socketRef.current;

  return (
    <SocketContext.Provider value={{ socket, connected, liveLocations, activityFeed }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
};
