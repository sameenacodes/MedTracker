const mongoose = require('mongoose');

const reorderSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },

  medicineName: {
    type: String,
    required: true
  },

  supplier: {
    type: String,
    default: 'Not specified'
  },

  // Total quantity ordered from supplier
  quantity: {
    type: Number,
    required: true,
    min: 1
  },

  // Quantity actually received so far
  receivedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },

  currentStock: {
    type: Number,
    default: 0
  },

  priority: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    default: 'MEDIUM'
  },

  status: {
    type: String,
    enum: [
      'pending',
      'ordered',
      'partially_received',
      'received',
      'cancelled'
    ],
    default: 'pending'
  },

  orderedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Automatically update updatedAt before saving
reorderSchema.pre('save', function (next) {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Reorder', reorderSchema);