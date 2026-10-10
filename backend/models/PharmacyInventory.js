const mongoose = require('mongoose');

const pharmacyInventorySchema = new mongoose.Schema(
  {
    // =====================================================
    // PHARMACY
    // =====================================================
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },

    // =====================================================
    // MEDICINE
    // =====================================================
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
      index: true,
    },

    // =====================================================
    // ONLINE SELLING PRICE
    // =====================================================
    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // =====================================================
    // ONLINE STOCK
    // =====================================================
    onlineQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =====================================================
    // ONLINE ORDER ENABLE
    // =====================================================
    availableForOnlineOrder: {
      type: Boolean,
      default: false,
    },

    // =====================================================
    // PRESCRIPTION REQUIRED
    // =====================================================
    requiresPrescription: {
      type: Boolean,
      default: false,
    },

    // =====================================================
    // MAX ORDER QUANTITY
    // =====================================================
    maxOrderQuantity: {
      type: Number,
      default: 10,
      min: 1,
    },

    // =====================================================
    // STATUS
    // =====================================================
    status: {
      type: String,
      enum: [
        'active',
        'out_of_stock',
        'inactive',
      ],
      default: 'active',
    },
  },

  {
    timestamps: true,
  }
);

// =====================================================
// UNIQUE PHARMACY + MEDICINE
// =====================================================

pharmacyInventorySchema.index(
  {
    pharmacy: 1,
    medicine: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  'PharmacyInventory',
  pharmacyInventorySchema
);