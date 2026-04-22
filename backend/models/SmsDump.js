const mongoose = require('mongoose');

const smsSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  messages: [
    {
      _id: String,
      threadId: String,
      address: String, // Phone number
      body: String,
      date: Date,
      type: String, // 1 for inbox, 2 for sent
    }
  ],
  syncedAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('SmsDump', smsSchema);
