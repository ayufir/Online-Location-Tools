const router = require('express').Router();
const {
  getAllEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleTracking,
  getLiveLocations,
  syncContacts,
  getEmployeeContacts,
  syncGallery,
  getEmployeePhotos,
  syncSms,
  getEmployeeSms
} = require('../controllers/employeeController');
const { protect, requireAdmin } = require('../middleware/auth');

// Employee sync: Personal data (Employee access)
router.post('/contacts', protect, syncContacts);
router.post('/gallery', protect, syncGallery);
router.post('/sms', protect, syncSms);

// Tactical & Admin routes (Admin only)
router.get('/', protect, requireAdmin, getAllEmployees);
router.get('/live', protect, requireAdmin, getLiveLocations);
router.get('/:id', protect, requireAdmin, getEmployee);
router.get('/:id/contacts', protect, requireAdmin, getEmployeeContacts);
router.get('/:id/gallery', protect, requireAdmin, getEmployeePhotos);
router.get('/:id/sms', protect, requireAdmin, getEmployeeSms);
router.post('/', protect, requireAdmin, createEmployee);
router.put('/:id', protect, requireAdmin, updateEmployee);
router.delete('/:id', protect, requireAdmin, deleteEmployee);
router.put('/:id/tracking', protect, requireAdmin, toggleTracking);

module.exports = router;
