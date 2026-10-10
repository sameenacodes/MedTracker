const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    inventory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PharmacyInventory',
      required: true,
    },

    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },

    medicineName: {
      type: String,
      required: true,
    },

    brand: {
      type: String,
      default: '',
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: true,
  }
);

const cartSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      default: null,
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =====================================================
    // DELIVERY ADDRESS
    // =====================================================

    deliveryAddress: {
      name: {
        type: String,
        default: '',
      },

      phone: {
        type: String,
        default: '',
      },

      address: {
        type: String,
        default: '',
      },

      area: {
        type: String,
        default: '',
      },

      city: {
        type: String,
        default: '',
      },

      district: {
        type: String,
        default: '',
      },

      pincode: {
        type: String,
        default: '',
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Cart', cartSchema);