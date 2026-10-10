const mongoose = require('mongoose');

const paymentSessionSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
    },

    // -----------------------------------------------
    // PRESCRIPTION
    // -----------------------------------------------
    prescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null,
      index: true,
    },

    items: [
      {
        inventoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'PharmacyInventory',
          required: true,
        },

        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],

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
        required: true,
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

    subtotal: {
      type: Number,
      required: true,
    },

    deliveryFee: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },

    razorpayPaymentId: {
      type: String,
      default: '',
    },

    status: {
      type: String,
      enum: [
        'pending',
        'paid',
        'failed',
        'expired',
      ],
      default: 'pending',
    },

    customerOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerOrder',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'PaymentSession',
  paymentSessionSchema
);