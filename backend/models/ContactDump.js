const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  contacts: [
    {
      name: String,
      phoneNumbers: [String],
      emails: [String],
    }
  ],
  syncedAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('ContactDump', contactSchema);
