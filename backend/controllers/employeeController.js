const User = require('../models/User');
const LocationHistory = require('../models/LocationHistory');

// ─── GET /api/employees ───────────────────────────────────────────────────────
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' })
      .select('-password -socketId')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: employees.length, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/employees/:id ───────────────────────────────────────────────────
exports.getEmployee = async (req, res) => {
  try {
    const employee = await User.findOne({ _id: req.params.id, role: 'employee' }).select('-password');
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });
    res.json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/employees ──────────────────────────────────────────────────────
exports.createEmployee = async (req, res) => {
  try {
    const { name, email, password, phone, department, designation } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const employee = await User.create({
      name,
      email,
      password,
      phone,
      department,
      designation,
      role: 'employee',
      currentLocation: {
        latitude: 23.2599,
        longitude: 77.4126,
        address: 'Bhopal HQ (Awaiting Sync)',
        timestamp: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully.',
      data: employee.toPublic(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/employees/:id ───────────────────────────────────────────────────
exports.updateEmployee = async (req, res) => {
  try {
    const { name, email, phone, department, designation, isActive } = req.body;

    const employee = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'employee' },
      { $set: { name, email, phone, department, designation, isActive } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });

    res.json({ success: true, message: 'Employee updated successfully.', data: employee });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/employees/:id ────────────────────────────────────────────────
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await User.findOneAndDelete({ _id: req.params.id, role: 'employee' });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });

    // Optionally cleanup location history
    await LocationHistory.deleteMany({ employee: req.params.id });

    res.json({ success: true, message: 'Employee deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/employees/:id/tracking ──────────────────────────────────────────
exports.toggleTracking = async (req, res) => {
  try {
    const { enable } = req.body; // true or false
    const employee = await User.findOne({ _id: req.params.id, role: 'employee' });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' });

    employee.isTrackingEnabled = enable;
    if (!enable) {
      employee.status = 'offline';
    }
    await employee.save();

    // Emit socket command to specific employee
    const io = req.io;
    if (io) {
      io.to(`employee_${req.params.id}`).emit('trackingCommand', {
        command: enable ? 'START' : 'STOP',
        employeeId: req.params.id,
        timestamp: new Date().toISOString(),
      });

      // Notify admin
      io.to('admin_room').emit('trackingToggled', {
        employeeId: req.params.id,
        isTrackingEnabled: enable,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: `Tracking ${enable ? 'started' : 'stopped'} for ${employee.name}.`,
      data: { isTrackingEnabled: employee.isTrackingEnabled, status: employee.status },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/employees/live-locations ───────────────────────────────────────
exports.getLiveLocations = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' })
      .select('name employeeId department designation status isTrackingEnabled currentLocation lastSeen batteryLevel avatar');

    res.json({ success: true, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
