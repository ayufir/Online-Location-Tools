const router = require('express').Router();
const { 
  updateLocation, 
  getHistory, 
  getLiveAll, 
  getSession, 
  getTeamLocations,
  setTargetLocation,
  clearTargetLocation,
  completeTask,
  approveTask
} = require('../controllers/locationController');
const { protect, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Mobile app pushes location (employee auth)
router.post('/update', protect, updateLocation);

// Employee context: view teammates
router.get('/team', protect, getTeamLocations);

// Employee context: Complete a task
router.put('/task/:taskId/complete', protect, upload.any(), completeTask);

// Admin-only: Approve a task
router.put('/task/:employeeId/:taskId/approve', protect, requireAdmin, approveTask);

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
