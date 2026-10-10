const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
  {
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },

    medicineName: {
      type: String,
      required: true,
      trim: true,
    },

    batchNumber: {
      type: String,
      trim: true,
      default: '',
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    customer: {
      name: {
        type: String,
        trim: true,
        default: 'Walk-in Customer',
      },

      phone: {
        type: String,
        trim: true,
        default: '',
      },

      email: {
        type: String,
        trim: true,
        default: '',
      },

      address: {
        type: String,
        trim: true,
        default: '',
      },
    },

    items: {
      type: [invoiceItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'Invoice must contain at least one item',
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    discount: {
      type: Number,
      min: 0,
      default: 0,
    },

    taxAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    grandTotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card', 'other'],
      default: 'cash',
    },

    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'cancelled'],
      default: 'paid',
    },

    notes: {
      type: String,
      trim: true,
      default: '',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ 'customer.phone': 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);