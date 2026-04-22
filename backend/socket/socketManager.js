const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Socket.IO Event Map:
 *
 * CLIENT → SERVER:
 *   admin:join                — Admin joins the admin_room
 *   employee:join             — Employee joins their room + marks online
 *   employee:disconnect       — Employee app goes offline / background
 *   employee:location:push    — (optional) direct socket location update from mobile
 *
 * SERVER → CLIENT:
 *   locationUpdate            — Broadcasts live GPS to admin_room
 *   employeeStatusChange      — Notifies admin_room of status change
 *   trackingCommand           — Tells employee to START/STOP tracking
 *   trackingToggled           — Tells admin tracking was toggled
 *   connectedEmployees        — List of currently online employees (sent on admin join)
 *   error                     — Generic error event
 */

// Track online employees in memory: employeeId → { socketId, name, ... }
const onlineEmployees = new Map();

// Offline timeout: if no ping after 5 minutes, mark as offline
const OFFLINE_TIMEOUT_MS = 5 * 60 * 1000;
const offlineTimers = new Map();

const clearOfflineTimer = (employeeId) => {
  if (offlineTimers.has(employeeId)) {
    clearTimeout(offlineTimers.get(employeeId));
    offlineTimers.delete(employeeId);
  }
};

const scheduleOfflineStatus = (io, employeeId, employeeDbId) => {
  clearOfflineTimer(employeeId);
  const timer = setTimeout(async () => {
    try {
      await User.findByIdAndUpdate(employeeId, { 
        status: 'offline', 
        socketId: null,
        lastDisconnectedAt: new Date()
      });
      onlineEmployees.delete(employeeId);
      io.to('admin_room').emit('employeeStatusChange', {
        employeeId,
        employeeDbId,
        status: 'offline',
        lastDisconnectedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      });
      console.log(`📴 Employee ${employeeDbId} marked offline (timeout)`);
    } catch (err) {
      console.error('Error marking employee offline:', err);
    }
  }, OFFLINE_TIMEOUT_MS);
  offlineTimers.set(employeeId, timer);
};

const initializeSocket = (io) => {
  // ─── Auth Middleware for Socket.IO ──────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        // Allow unauthenticated connections for admin room (token checked on join)
        socket.userRole = 'guest';
        return next();
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      socket.userRole = user.role;
      next();
    } catch (err) {
      // Allow connection, handle auth per event
      socket.userRole = 'guest';
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} [role: ${socket.userRole}]`);

    // ─── Admin joins admin_room ──────────────────────────────────────────────
    socket.on('admin:join', async () => {
      socket.join('admin_room');
      console.log(`👨‍💼 Admin joined admin_room [${socket.id}]`);

      // Send current online employees list
      const onlineList = Array.from(onlineEmployees.values());
      socket.emit('connectedEmployees', { employees: onlineList });
    });

    // ─── Employee app connects ───────────────────────────────────────────────
    socket.on('employee:join', async ({ token }) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user || user.role !== 'employee') {
           console.log(`⚠️ [Socket] Join rejected: Invalid user or role`);
           return;
        }

        const employeeData = {
          employeeId: user._id.toString(),
          name: user.name,
          employeeIdTag: user.employeeId,
          status: user.status || 'idle',
          location: user.currentLocation,
          tasks: user.tasks,
          lastSeen: new Date(),
        };

        onlineEmployees.set(user._id.toString(), employeeData);
        socket.join('employee_room');
        socket.join(`employee_${user._id.toString()}`);
        socket.userId = user._id.toString();
        socket.user = user; // Ensure socket.user is available for subsequent events

        console.log(`📱 [Socket] Employee Joined: ${user.name} (${user._id})`);

        // Update DB status immediately to online
        await User.findByIdAndUpdate(user._id, { 
          status: 'online', 
          socketId: socket.id, 
          lastSeen: new Date(),
          lastConnectedAt: new Date()
        });
        
        const updatePayload = {
           ...employeeData,
           status: 'online',
           lastConnectedAt: new Date().toISOString()
        };

        io.to('admin_room').emit('employeeStatusChange', updatePayload);

      } catch (err) {
        console.error('❌ [Socket] Employee Join Error:', err.message);
      }
    });

    // ─── Optional: real-time socket location push (supplement HTTP) ──────────
    socket.on('employee:location:push', async (data) => {
      const activeUser = socket.user || (socket.userId ? await User.findById(socket.userId) : null);
      if (!activeUser) return;
      
      const { latitude, longitude, speed, accuracy, heading, address, batteryLevel } = data;

      await User.findByIdAndUpdate(activeUser._id, {
        currentLocation: { latitude, longitude, accuracy, speed, heading, address, timestamp: new Date() },
        status: speed > 0.5 ? 'moving' : 'idle',
        lastSeen: new Date(),
        batteryLevel,
      });

      io.to('admin_room').emit('locationUpdate', {
        employeeId: activeUser._id.toString(),
        employeeDbId: activeUser.employeeId,
        name: activeUser.name,
        department: activeUser.department,
        status: speed > 0.5 ? 'moving' : 'idle',
        batteryLevel,
        location: { latitude, longitude, accuracy, speed, heading, address, timestamp: new Date().toISOString() },
        tasks: activeUser.tasks,
        timestamp: new Date().toISOString(),
      });

      // Reset offline timer
      scheduleOfflineStatus(io, socket.user._id.toString(), socket.user.employeeId);
    });

    // ─── Handle disconnect ───────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);

      if (socket.user && socket.user.role === 'employee') {
        const userId = socket.user._id.toString();
        scheduleOfflineStatus(io, userId, socket.user.employeeId);
      }
    });
  });

  console.log('📡 Socket.IO manager initialized');
};

module.exports = { initializeSocket, onlineEmployees };
