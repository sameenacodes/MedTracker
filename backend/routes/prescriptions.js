const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const Prescription = require('../models/Prescription');
const Pharmacy = require('../models/Pharmacy');
const Cart = require('../models/Cart');

const auth = require('../middleware/auth');
const { pharmacyStaff } = require('../middleware/rolePermissions');

// =====================================================
// UPLOAD DIRECTORY
// =====================================================

const uploadDir = path.join(
  __dirname,
  '../uploads/prescriptions'
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

// =====================================================
// MULTER STORAGE
// =====================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path
      .extname(file.originalname || '')
      .toLowerCase();

    const uniqueName =
      `prescription-${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${extension}`;

    cb(null, uniqueName);
  },
});

// =====================================================
// FILE FILTER
// =====================================================

const fileFilter = (req, file, cb) => {
  const mimeType = String(file.mimetype || '').toLowerCase();
  const originalName = String(file.originalname || '').toLowerCase();

  const extension = path.extname(originalName);

  console.log('========== PRESCRIPTION FILE ==========');
  console.log('Original Name:', file.originalname);
  console.log('MIME Type:', file.mimetype);
  console.log('Extension:', extension);
  console.log('=======================================');

  // -------------------------------------------------
  // PDF
  // -------------------------------------------------
  if (
    mimeType === 'application/pdf' ||
    extension === '.pdf'
  ) {
    return cb(null, true);
  }

  // -------------------------------------------------
  // Normal image MIME types
  // -------------------------------------------------
  if (mimeType.startsWith('image/')) {
    return cb(null, true);
  }

  // -------------------------------------------------
  // Android / Expo sometimes sends:
  // application/octet-stream
  // -------------------------------------------------
  if (
    mimeType === 'application/octet-stream'
  ) {
    return cb(null, true);
  }

  // -------------------------------------------------
  // Some mobile clients may not provide MIME type
  // but provide a valid image extension
  // -------------------------------------------------
  const allowedExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.heic',
    '.heif',
    '.pdf',
  ];

  if (
    allowedExtensions.includes(extension)
  ) {
    return cb(null, true);
  }

  // -------------------------------------------------
  // Reject only completely unknown file types
  // -------------------------------------------------
  return cb(
    new Error(
      'Only image files and PDF files are allowed'
    )
  );
};
// =====================================================
// MULTER CONFIGURATION
// =====================================================

const upload = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// =====================================================
// UPLOAD PRESCRIPTION
// =====================================================

router.post(
  '/upload',
  auth,
  upload.single('prescription'),
  async (req, res) => {
    try {
      // ---------------------------------------------
      // Check uploaded file
      // ---------------------------------------------

      if (!req.file) {
        return res.status(400).json({
          message:
            'Please select a prescription file',
        });
      }

      // ---------------------------------------------
      // Get customer ID
      // ---------------------------------------------

      const customerId =
        req.user?.id ||
        req.user?._id;

      if (!customerId) {
        return res.status(401).json({
          message:
            'User authentication required',
        });
      }

      // ---------------------------------------------
      // Get pharmacy ID
      // ---------------------------------------------

      const pharmacyId =
        req.body?.pharmacyId ||
        null;

      // ---------------------------------------------
      // Get current customer cart
      // ---------------------------------------------

      const cart =
        await Cart.findOne({
          customer: customerId,
        });

      if (
        !cart ||
        !cart.items ||
        !cart.items.length
      ) {
        return res.status(400).json({
          message:
            'Your cart is empty. Add the medicine before uploading a prescription.',
        });
      }

      // ---------------------------------------------
      // Get medicine IDs from cart
      // ---------------------------------------------

      const medicineIds =
        cart.items
          .map(
            (item) =>
              item?.medicine
          )
          .filter(Boolean);

      if (!medicineIds.length) {
        return res.status(400).json({
          message:
            'No medicines found in the current cart.',
        });
      }

      // ---------------------------------------------
      // Determine file type
      // ---------------------------------------------

      const uploadedExtension =
        path
          .extname(
            req.file.originalname || ''
          )
          .toLowerCase();

      const fileType =
        req.file.mimetype ===
          'application/pdf' ||
        uploadedExtension === '.pdf'
          ? 'pdf'
          : 'image';

      // ---------------------------------------------
      // File URL
      // ---------------------------------------------

      const fileUrl =
        `/uploads/prescriptions/${req.file.filename}`;

      // ---------------------------------------------
      // Create prescription
      // ---------------------------------------------

      const prescription =
        await Prescription.create({
          customer: customerId,

          pharmacy:
            pharmacyId ||
            cart.pharmacy ||
            null,

          // Link prescription to
          // medicines in current cart
          medicines: medicineIds,

          fileName:
            req.file.filename,

          originalName:
            req.file.originalname,

          fileUrl,

          fileType,

          mimeType:
            req.file.mimetype,

          status: 'pending',
        });

      // ---------------------------------------------
      // Success response
      // ---------------------------------------------

      return res.status(201).json({
        message:
          'Prescription uploaded successfully',

        prescription,
      });
    } catch (error) {
      console.error(
        'Prescription upload error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to upload prescription',

        error: error.message,
      });
    }
  }
);

// =====================================================
// GET CUSTOMER PRESCRIPTIONS
// =====================================================

router.get(
  '/my',
  auth,
  async (req, res) => {
    try {
      const prescriptions =
        await Prescription.find({
          customer: req.user.id,
        })
          .populate(
            'pharmacy',
            'name phone address city'
          )
          .populate(
            'medicines',
            'name brand'
          )
          .sort({
            createdAt: -1,
          });

      return res.json({
        count:
          prescriptions.length,

        prescriptions,
      });
    } catch (error) {
      console.error(
        'Get prescriptions error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to fetch prescriptions',

        error: error.message,
      });
    }
  }
);

// =====================================================
// GET PHARMACY PRESCRIPTIONS
// =====================================================

router.get(
  '/pharmacy',
  auth,
  pharmacyStaff,
  async (req, res) => {
    try {
      // ---------------------------------------------
      // Find pharmacy
      // ---------------------------------------------

      const pharmacy =
        await Pharmacy.findOne({
          owner: req.user.id,
          isActive: true,
        });

      if (!pharmacy) {
        return res.status(404).json({
          message:
            'No pharmacy is linked to this account',
        });
      }

      // ---------------------------------------------
      // Get pharmacy prescriptions
      // ---------------------------------------------

      const prescriptions =
        await Prescription.find({
          pharmacy:
            pharmacy._id,
        })
          .populate(
            'customer',
            'name email'
          )
          .populate(
            'order',
            'orderNumber orderStatus'
          )
          .populate(
            'medicines',
            'name brand'
          )
          .sort({
            createdAt: -1,
          });

      return res.json({
        count:
          prescriptions.length,

        prescriptions,
      });
    } catch (error) {
      console.error(
        'Get pharmacy prescriptions error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to fetch pharmacy prescriptions',

        error: error.message,
      });
    }
  }
);

// =====================================================
// VERIFY / APPROVE / REJECT PRESCRIPTION
// =====================================================

router.put(
  '/:id/verify',
  auth,
  pharmacyStaff,
  async (req, res) => {
    try {
      const {
        status,
        rejectionReason = '',
      } = req.body;

      // ---------------------------------------------
      // Validate status
      // ---------------------------------------------

      if (
        ![
          'approved',
          'rejected',
        ].includes(status)
      ) {
        return res.status(400).json({
          message:
            'Status must be approved or rejected',
        });
      }

      // ---------------------------------------------
      // Find pharmacy
      // ---------------------------------------------

      const pharmacy =
        await Pharmacy.findOne({
          owner: req.user.id,
          isActive: true,
        });

      if (!pharmacy) {
        return res.status(404).json({
          message:
            'No pharmacy is linked to this account',
        });
      }

      // ---------------------------------------------
      // Find prescription
      // ---------------------------------------------

      const prescription =
        await Prescription.findOne({
          _id: req.params.id,

          pharmacy:
            pharmacy._id,
        });

      if (!prescription) {
        return res.status(404).json({
          message:
            'Prescription not found',
        });
      }

      // ---------------------------------------------
      // Rejection reason
      // ---------------------------------------------

      if (
        status === 'rejected' &&
        !String(
          rejectionReason
        ).trim()
      ) {
        return res.status(400).json({
          message:
            'Rejection reason is required',
        });
      }

      // ---------------------------------------------
      // Update prescription
      // ---------------------------------------------

      prescription.status =
        status;

      prescription.rejectionReason =
        status === 'rejected'
          ? String(
              rejectionReason
            ).trim()
          : '';

      prescription.verifiedBy =
        req.user.id;

      prescription.verifiedAt =
        new Date();

      await prescription.save();

      // ---------------------------------------------
      // Response
      // ---------------------------------------------

      return res.json({
        message:
          status === 'approved'
            ? 'Prescription approved successfully'
            : 'Prescription rejected successfully',

        prescription,
      });
    } catch (error) {
      console.error(
        'Verify prescription error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to verify prescription',

        error: error.message,
      });
    }
  }
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;