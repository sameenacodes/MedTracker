const mongoose = require('mongoose');

const customerOrderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      required: true,
      index: true,
    },

    // Prescription used for this order
    prescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null,
      index: true,
    },

    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrderItem',
      },
    ],

    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    deliveryFee: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

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

    paymentMethod: {
      type: String,
      enum: ['COD', 'ONLINE'],
      default: 'COD',
    },

    paymentStatus: {
      type: String,
      enum: [
        'pending',
        'paid',
        'failed',
        'refunded',
      ],
      default: 'pending',
    },

    orderStatus: {
      type: String,
      enum: [
        'placed',
        'accepted',
        'preparing',
        'ready_for_pickup',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'rejected',
      ],
      default: 'placed',
      index: true,
    },

    cancellationReason: {
      type: String,
      default: '',
    },

    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    estimatedDeliveryTime: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'CustomerOrder',
  customerOrderSchema
);