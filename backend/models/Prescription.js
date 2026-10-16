const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema(
  {
    // =====================================================
    // CUSTOMER
    // =====================================================
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // =====================================================
    // PHARMACY
    // =====================================================
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pharmacy',
      default: null,
      index: true,
    },

    // =====================================================
    // ORDER
    // =====================================================
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerOrder',
      default: null,
      index: true,
    },

    // =====================================================
    // MEDICINES
    // =====================================================
    medicines: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine',
      },
    ],

    // =====================================================
    // FILE INFORMATION
    // =====================================================
    fileName: {
      type: String,
      required: true,
    },

    originalName: {
      type: String,
      default: '',
    },

    fileUrl: {
      type: String,
      required: true,
    },

    fileType: {
      type: String,
      enum: ['image', 'pdf'],
      required: true,
    },

    mimeType: {
      type: String,
      default: '',
    },

    // =====================================================
    // ACTUAL FILE DATA
    // Stored inside MongoDB
    // =====================================================
    fileData: {
      type: Buffer,
      select: false,
    },

    // =====================================================
    // SECURE FILE ACCESS TOKEN
    // =====================================================
    fileAccessToken: {
      type: String,
      select: false,
      index: true,
    },

    // =====================================================
    // PRESCRIPTION STATUS
    // =====================================================
    status: {
      type: String,
      enum: [
        'pending',
        'approved',
        'rejected',
      ],
      default: 'pending',
      index: true,
    },

    // =====================================================
    // REJECTION
    // =====================================================
    rejectionReason: {
      type: String,
      default: '',
    },

    // =====================================================
    // VERIFICATION
    // =====================================================
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.model(
    'Prescription',
    prescriptionSchema
  );