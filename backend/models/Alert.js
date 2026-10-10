const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({

  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine'
  },

  medicineName: {
    type: String
  },

  alertType: {
    type: String,
    enum: [
      'critical',
      'warning',
      'caution',
      'expired',
      'lowstock'
    ]
  },

  daysLeft: {
    type: Number
  },

  sentEmail: {
    type: Boolean,
    default: false
  },

  sentWhatsapp: {
    type: Boolean,
    default: false
  },

  // ==========================================
  // NOTIFICATION CENTER
  // ==========================================

  isRead: {
    type: Boolean,
    default: false
  },

  readAt: {
    type: Date,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model('Alert', alertSchema);