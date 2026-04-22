const User = require('../models/User');
const LocationHistory = require('../models/LocationHistory');
const { haversineDistance } = require('../utils/distance');
const { v4: uuidv4 } = require('crypto').webcrypto
  ? require('crypto')
  : { v4: () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };

// Helper: generate session ID
const generateSessionId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper: determine status from speed
const getStatusFromSpeed = (speed) => {
  if (speed === null || speed === undefined) return 'idle';
  if (speed > 0.5) return 'moving';
  return 'idle';
};

// ─── POST /api/location/update ────────────────────────────────────────────────
// Called by the mobile app every 30 seconds
exports.updateLocation = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { latitude, longitude, accuracy, speed, heading, altitude, address, batteryLevel } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'latitude and longitude are required.' });
    }

    const employee = await User.findById(employeeId);
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });

    // Auto-enable tracking if it's disabled but the app is sending data
    if (!employee.isTrackingEnabled) {
      employee.isTrackingEnabled = true;
      await employee.save();
      console.log(`📡 Auto-enabled tracking for ${employee.name} (${employeeId})`);
    }

    const status = getStatusFromSpeed(speed);
    const now = new Date();

    // Update user's current location and pulse status to online
    await User.findByIdAndUpdate(employeeId, {
      currentLocation: {
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        altitude,
        address,
        timestamp: now,
      },
      status: speed > 0.5 ? 'moving' : 'idle',
      lastSeen: now,
      batteryLevel: batteryLevel || null, // Capture battery level
    });

    // ─── Update Location History ───────────────────────────────────────────
    const today = now.toISOString().split('T')[0];
    let session = await LocationHistory.findOne({
      employee: employeeId,
      date: today,
      isActive: true,
    });

    if (!session) {
      session = await LocationHistory.create({
        employee: employeeId,
        employeeId: employee.employeeId,
        sessionId: generateSessionId(),
        date: today,
        startTime: now,
        coordinates: [],
      });
    }

    const newCoord = { latitude, longitude, accuracy, speed, heading, altitude, address, timestamp: now };

    // Calculate incremental distance
    let addedDistance = 0;
    if (session.coordinates.length > 0) {
      const lastCoord = session.coordinates[session.coordinates.length - 1];
      addedDistance = haversineDistance(
        lastCoord.latitude,
        lastCoord.longitude,
        latitude,
        longitude
      );
    }

    session.coordinates.push(newCoord);
    session.totalDistance += addedDistance;
    session.totalPoints = session.coordinates.length;
    if (speed && speed > session.maxSpeed) session.maxSpeed = speed;
    if (session.coordinates.length > 1) {
      const sumSpeed = session.coordinates.reduce((s, c) => s + (c.speed || 0), 0);
      session.avgSpeed = sumSpeed / session.coordinates.length;
    }
    await session.save();

    // ─── Broadcast via Socket.IO ───────────────────────────────────────────
    const io = req.io;
    if (io) {
      const payload = {
        employeeId: employeeId.toString(),
        employeeDbId: employee.employeeId,
        name: employee.name,
        department: employee.department,
        designation: employee.designation,
        status,
        batteryLevel: batteryLevel || null,
        location: { latitude, longitude, accuracy, speed, heading, altitude, address, timestamp: now },
        targetLocation: employee.targetLocation,
        sessionDistance: session.totalDistance,
        timestamp: now.toISOString(),
      };
      io.to('admin_room').emit('locationUpdate', payload);
    }

    res.json({ success: true, message: 'Location updated.', status });
  } catch (err) {
    console.error('Location update error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/location/history/:employeeId ────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const { date, limit = 7 } = req.query;
    const employee = await User.findOne({ _id: req.params.employeeId, role: 'employee' });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });

    const query = { employee: req.params.employeeId };
    if (date) query.date = date;

    const history = await LocationHistory.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, count: history.length, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/location/live ───────────────────────────────────────────────────
// Admin only: Get all employees
exports.getLiveAll = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' })
      .select('name employeeId department designation status isTrackingEnabled currentLocation lastSeen batteryLevel targetLocation lastConnectedAt lastDisconnectedAt');
    res.json({ success: true, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/location/team ───────────────────────────────────────────────────
// Employee context: Get active teammates (excluding self or entire team)
exports.getTeamLocations = async (req, res) => {
  try {
    const employees = await User.find({ 
      role: 'employee', 
      isTrackingEnabled: true,
      _id: { $ne: req.user._id } // Exclude current user
    }).select('name department designation status currentLocation lastSeen targetLocation');
    
    res.json({ success: true, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/location/session/:sessionId ─────────────────────────────────────
exports.getSession = async (req, res) => {
  try {
    const session = await LocationHistory.findOne({ sessionId: req.params.sessionId });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/location/target/:employeeId ──────────────────────────────────
// Admin: Set a target destination for an employee
exports.setTargetLocation = async (req, res) => {
  try {
    const { latitude, longitude, label } = req.body;
    const { employeeId } = req.params;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required.' });
    }

    const employee = await User.findByIdAndUpdate(employeeId, {
      targetLocation: {
        latitude,
        longitude,
        label: label || 'Assigned Destination',
        setAt: new Date(),
      }
    }, { new: true });

    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });

    // Broadcast update via Socket.io
    const io = req.io;
    if (io) {
      io.to('admin_room').emit('employeeStatusChange', {
        employeeId: employee._id.toString(),
        targetLocation: employee.targetLocation,
      });
      
      // Specifically inform the employee if they are connected
      io.to('employee_room').emit('target:update', {
        employeeId: employee._id.toString(),
        targetLocation: employee.targetLocation,
      });
    }

    res.json({ success: true, message: 'Target location set.', data: employee.targetLocation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/location/target/:employeeId ───────────────────────────────
// Admin: Clear target destination
exports.clearTargetLocation = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const employee = await User.findByIdAndUpdate(employeeId, {
      targetLocation: {
        latitude: null,
        longitude: null,
        label: 'Assigned Destination',
        setAt: null,
      }
    }, { new: true });

    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });

    const io = req.io;
    if (io) {
      io.to('admin_room').emit('employeeStatusChange', {
        employeeId: employee._id.toString(),
        targetLocation: null,
      });
      io.to('employee_room').emit('target:update', {
        employeeId: employee._id.toString(),
        targetLocation: null,
      });
    }

    res.json({ success: true, message: 'Target location cleared.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
