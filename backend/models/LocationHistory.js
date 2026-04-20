const mongoose = require('mongoose');

const coordinateSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number, default: null },
    speed: { type: Number, default: null },   // m/s
    heading: { type: Number, default: null }, // degrees 0-360
    altitude: { type: Number, default: null },
    address: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const locationHistorySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employeeId: {
      type: String,
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    coordinates: [coordinateSchema],

    // Session metadata
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    totalDistance: { type: Number, default: 0 }, // meters
    maxSpeed: { type: Number, default: 0 },       // m/s
    avgSpeed: { type: Number, default: 0 },       // m/s
    totalPoints: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Index for fast queries
locationHistorySchema.index({ employee: 1, date: -1 });
locationHistorySchema.index({ sessionId: 1 }, { unique: true });
locationHistorySchema.index({ employee: 1, isActive: 1 });

module.exports = mongoose.model('LocationHistory', locationHistorySchema);
