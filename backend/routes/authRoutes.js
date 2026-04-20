const router = require('express').Router();
const { login, refreshToken, getMe, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
