const Asset = require('../models/Asset');

// ─── GET /api/assets ──────────────────────────────────────────────────────────
exports.getAllAssets = async (req, res) => {
  try {
    const assets = await Asset.find();
    res.json({ success: true, data: assets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/assets (Admin Only) ───────────────────────────────────────────
exports.createAsset = async (req, res) => {
  try {
    const { name, type, latitude, longitude } = req.body;
    
    const asset = new Asset({
      name,
      type,
      latitude,
      longitude,
      createdBy: req.user._id
    });

    await asset.save();
    res.status(201).json({ success: true, data: asset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/assets/:id (Admin Only) ─────────────────────────────────────
exports.deleteAsset = async (req, res) => {
  try {
    await Asset.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Asset removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
