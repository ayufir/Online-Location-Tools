const express = require('express');
const router = express.Router();
const { getAllAssets, createAsset, deleteAsset } = require('../controllers/assetController');
const { protect, requireAdmin } = require('../middleware/auth');

router.get('/', protect, getAllAssets);
router.post('/', protect, requireAdmin, createAsset);
router.delete('/:id', protect, requireAdmin, deleteAsset);

module.exports = router;
