const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware: Verify JWT and attach user to req.user
 */
const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      console.log('⚠️ [Auth] No Bearer token found in header:', authHeader || 'Empty');
    }

    if (!token) {
      console.log('❌ Auth Failed: No token provided in headers');
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      // Return 401 silently to avoid terminal spam from old deleted devices
      return res.status(401).json({ success: false, message: 'Token is valid but user no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

/**
 * Middleware: Only allow admin role
 */
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
};

/**
 * Middleware: Allow only employee role
 */
const requireEmployee = (req, res, next) => {
  if (req.user && req.user.role === 'employee') return next();
  return res.status(403).json({ success: false, message: 'Access denied. Employee only.' });
};

module.exports = { protect, requireAdmin, requireEmployee };
