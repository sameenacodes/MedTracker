const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    // =========================
    // BASIC MEDICINE DETAILS
    // =========================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    brand: {
      type: String,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
    },

    batchNumber: {
      type: String,
      required: true,
      trim: true,
    },

    mfgDate: {
      type: String,
    },

    expiryDate: {
      type: Date,
      required: true,
    },

    // =========================
    // STOCK & PRICE
    // =========================

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    // Minimum stock level required
    // by the pharmacy before reorder
    minimumStock: {
      type: Number,
      default: 5,
      min: 0,
    },

    purchasePrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    sellingPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    supplier: {
      type: String,
      trim: true,
    },

    // =========================
    // PHYSICAL STORAGE LOCATION
    // =========================

    rackNumber: {
      type: String,
      trim: true,
    },

    shelfNumber: {
      type: String,
      trim: true,
    },

    boxNumber: {
      type: String,
      trim: true,
    },

    // =========================
    // QR CODE
    // =========================

    qrCode: {
      type: String,
      unique: true,
      sparse: true,
    },

    // =========================
    // MEDICINE STATUS
    // =========================

    status: {
      type: String,
      enum: [
        'safe',
        'caution',
        'warning',
        'critical',
        'expired',
        'removed',
      ],
      default: 'safe',
    },

    // =========================
    // REMOVAL DETAILS
    // =========================

    removedAt: {
      type: Date,
    },

    removedBy: {
      type: String,
    },

    removalReason: {
      type: String,
    },

    // =========================
    // CREATED DATE
    // =========================

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Medicine', medicineSchema);