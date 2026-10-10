const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    userName: {
      type: String,
      trim: true,
      default: 'Unknown User',
    },

    userRole: {
      type: String,
      trim: true,
      default: 'unknown',
    },

    action: {
      type: String,
      required: true,
      trim: true,
    },

    module: {
      type: String,
      trim: true,
      default: 'system',
    },

    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      default: null,
    },

    medicineName: {
      type: String,
      trim: true,
      default: '',
    },

    batchNumber: {
      type: String,
      trim: true,
      default: '',
    },

    quantity: {
      type: Number,
      default: null,
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    ipAddress: {
      type: String,
      trim: true,
      default: '',
    },

    userAgent: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);


// =====================================================
// INDEXES
// =====================================================

auditLogSchema.index({
  createdAt: -1,
});

auditLogSchema.index({
  user: 1,
  createdAt: -1,
});

auditLogSchema.index({
  action: 1,
  createdAt: -1,
});

auditLogSchema.index({
  medicine: 1,
  createdAt: -1,
});


module.exports = mongoose.model(
  'AuditLog',
  auditLogSchema
);