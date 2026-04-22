const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  photos: [
    {
      assetId: String,
      filename: String,
      uri: String, // Local URI on phone (not useful for admin directly but good for metadata)
      thumbnail: String, // Base64 thumbnail 
      creationTime: Date,
      mediaType: String,
    }
  ],
  totalCount: Number,
  syncedAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('GalleryDump', gallerySchema);
