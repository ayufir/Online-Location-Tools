const router = require('express').Router();
const {
  getAllEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleTracking,
  getLiveLocations,
} = require('../controllers/employeeController');
const { protect, requireAdmin } = require('../middleware/auth');

// All employee routes require admin auth
router.use(protect, requireAdmin);

router.get('/', getAllEmployees);
router.get('/live', getLiveLocations);
router.get('/:id', getEmployee);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);
router.put('/:id/tracking', toggleTracking);

module.exports = router;
