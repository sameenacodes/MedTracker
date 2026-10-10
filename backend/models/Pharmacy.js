const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema(
  {
    // Pharmacy owner / admin user
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Pharmacy basic details
    name: {
      type: String,
      required: true,
      trim: true,
    },

    licenseNumber: {
      type: String,
      trim: true,
      default: '',
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },

    // Location
    address: {
      type: String,
      trim: true,
      default: '',
    },

    area: {
      type: String,
      trim: true,
      default: '',
    },

    city: {
      type: String,
      trim: true,
      default: '',
    },

    district: {
      type: String,
      trim: true,
      default: '',
    },

    pincode: {
      type: String,
      trim: true,
      default: '',
    },

    // Marketplace availability
    isActive: {
      type: Boolean,
      default: true,
    },

    acceptsOnlineOrders: {
      type: Boolean,
      default: true,
    },

    // Delivery
    deliveryAvailable: {
      type: Boolean,
      default: true,
    },

    deliveryRadiusKm: {
      type: Number,
      default: 10,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Pharmacy', pharmacySchema);