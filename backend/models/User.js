const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'employee'],
      default: 'employee',
    },
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
      default: 'Field Operations',
    },
    designation: {
      type: String,
      trim: true,
      default: 'Solar Technician',
    },
    avatar: {
      type: String,
      default: null,
    },

    // ─── Tracking State ─────────────────────────────────────────────────────
    isTrackingEnabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'idle', 'moving'],
      default: 'offline',
    },
    currentLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      speed: { type: Number, default: null },
      heading: { type: Number, default: null },
      altitude: { type: Number, default: null },
      address: { type: String, default: null },
      timestamp: { type: Date, default: null },
    },
    lastSeen: {
      type: Date,
      default: null,
    },
    socketId: {
      type: String,
      default: null,
    },
    batteryLevel: {
      type: Number,
      default: null,
    },
    lastConnectedAt: {
      type: Date,
      default: null,
    },
    lastDisconnectedAt: {
      type: Date,
      default: null,
    },
    tasks: [{
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      label: { type: String, default: 'Assigned Task' },
      status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
      setAt: { type: Date, default: Date.now },
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Pre-save: hash password ─────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Method: compare password ────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Method: toPublic (strips sensitive fields) ───────────────────────────────
userSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.socketId;
  return obj;
};

// Auto-generate unique employeeId for employees
userSchema.pre('save', async function (next) {
  if (this.isNew && this.role === 'employee' && !this.employeeId) {
    // Robust generation: ST + Timestamp suffix (last 4 digits) + random 2 digits
    const suffix = `${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
    this.employeeId = `ST-${suffix}`;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
