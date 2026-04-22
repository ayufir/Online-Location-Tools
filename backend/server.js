const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const locationRoutes = require('./routes/locationRoutes');
const assetRoutes = require('./routes/assetRoutes');
const { initializeSocket } = require('./socket/socketManager');

dotenv.config();

const app = express();
const server = http.createServer(app);

// In production, specify origins. In dev, we can allow true to match any origin.
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://192.168.1.12:5173', // Local network dashboard
  'http://192.168.1.12:5000', 
  process.env.DASHBOARD_URL,
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow all origins in development
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── Database ────────────────────────────────────────────────────────────────
connectDB();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ 
  origin: (origin, callback) => {
    callback(null, true);
  }, 
  credentials: true 
}));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Attach Socket.IO instance to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/assets', assetRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'SolarTrack Pro Backend',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
initializeSocket(io);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌞 =====================================`);
  console.log(`   SolarTrack Pro Backend`);
  console.log(`   🚀 Port      : ${PORT}`);
  console.log(`   🗄️  MongoDB   : ${process.env.MONGODB_URI}`);
  console.log(`   🌐 Dashboard : ${process.env.DASHBOARD_URL}`);
  console.log(`   📡 WebSocket : Ready`);
  console.log(`🌞 =====================================\n`);
});

module.exports = { app, server, io };
