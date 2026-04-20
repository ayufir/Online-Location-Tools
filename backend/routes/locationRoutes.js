const router = require('express').Router();
const { 
  updateLocation, 
  getHistory, 
  getLiveAll, 
  getSession, 
  getTeamLocations,
  setTargetLocation,
  clearTargetLocation
} = require('../controllers/locationController');
const { protect, requireAdmin } = require('../middleware/auth');

// Mobile app pushes location (employee auth)
router.post('/update', protect, updateLocation);

// Employee context: view teammates
router.get('/team', protect, getTeamLocations);

// Admin-only: view all live locations
router.get('/live', protect, requireAdmin, getLiveAll);

// Admin: get movement history for an employee
router.get('/history/:employeeId', protect, requireAdmin, getHistory);

// Admin: get a specific session
router.get('/session/:sessionId', protect, requireAdmin, getSession);

// Admin: waypoint management
router.put('/target/:employeeId', protect, requireAdmin, setTargetLocation);
router.delete('/target/:employeeId', protect, requireAdmin, clearTargetLocation);

module.exports = router;
