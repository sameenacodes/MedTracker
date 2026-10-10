const mongoose = require('mongoose');

const removalSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine'
  },
  medicineName: { type: String, required: true },
  batchNumber: { type: String, required: true },
  quantity: { type: Number, required: true },
  reason: {
    type: String,
    enum: ['expired', 'damaged', 'recalled'],
    default: 'expired'
  },
  removedBy: { type: String, required: true },
  financialLoss: { type: Number, default: 0 },
  qrScanned: { type: Boolean, default: false },
  removalDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model(
  'Removal', removalSchema
);