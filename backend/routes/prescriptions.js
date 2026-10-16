const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

const Prescription =
  require('../models/Prescription');

const Pharmacy =
  require('../models/Pharmacy');

const Cart =
  require('../models/Cart');

const auth =
  require('../middleware/auth');

const {
  pharmacyStaff,
} = require('../middleware/rolePermissions');

// =====================================================
// MULTER - MEMORY STORAGE
// =====================================================
// IMPORTANT:
// We are NOT saving prescriptions inside Render's
// local filesystem anymore.
//
// File is kept in memory and then stored in MongoDB.
// =====================================================

const storage =
  multer.memoryStorage();

// =====================================================
// FILE FILTER
// =====================================================

const fileFilter = (
  req,
  file,
  cb
) => {
  const mimeType =
    String(
      file.mimetype || ''
    ).toLowerCase();

  const originalName =
    String(
      file.originalname || ''
    ).toLowerCase();

  const extension =
    path.extname(
      originalName
    );

  console.log(
    '========== PRESCRIPTION FILE =========='
  );

  console.log(
    'Original Name:',
    file.originalname
  );

  console.log(
    'MIME Type:',
    file.mimetype
  );

  console.log(
    'Extension:',
    extension
  );

  console.log(
    '======================================='
  );

  // ---------------------------------------------------
  // PDF
  // ---------------------------------------------------

  if (
    mimeType ===
      'application/pdf' ||
    extension === '.pdf'
  ) {
    return cb(
      null,
      true
    );
  }

  // ---------------------------------------------------
  // Normal image MIME types
  // ---------------------------------------------------

  if (
    mimeType.startsWith(
      'image/'
    )
  ) {
    return cb(
      null,
      true
    );
  }

  // ---------------------------------------------------
  // Android / Expo sometimes sends:
  // application/octet-stream
  // ---------------------------------------------------

  if (
    mimeType ===
    'application/octet-stream'
  ) {
    return cb(
      null,
      true
    );
  }

  // ---------------------------------------------------
  // Some mobile clients may not provide MIME type
  // but provide a valid extension
  // ---------------------------------------------------

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
    allowedExtensions.includes(
      extension
    )
  ) {
    return cb(
      null,
      true
    );
  }

  // ---------------------------------------------------
  // Reject unknown file types
  // ---------------------------------------------------

  return cb(
    new Error(
      'Only image files and PDF files are allowed'
    )
  );
};

// =====================================================
// MULTER CONFIGURATION
// =====================================================

const upload =
  multer({
    storage,

    fileFilter,

    limits: {
      // Maximum 5 MB
      fileSize:
        5 * 1024 * 1024,
    },
  });

// =====================================================
// UPLOAD PRESCRIPTION
// =====================================================

router.post(
  '/upload',
  auth,
  upload.single(
    'prescription'
  ),

  async (req, res) => {
    try {
      // -------------------------------------------------
      // Check uploaded file
      // -------------------------------------------------

      if (!req.file) {
        return res.status(400).json({
          message:
            'Please select a prescription file',
        });
      }

      // -------------------------------------------------
      // Get customer ID
      // -------------------------------------------------

      const customerId =
        req.user?.id ||
        req.user?._id;

      if (!customerId) {
        return res.status(401).json({
          message:
            'User authentication required',
        });
      }

      // -------------------------------------------------
      // Get pharmacy ID
      // -------------------------------------------------

      const pharmacyId =
        req.body?.pharmacyId ||
        null;

      // -------------------------------------------------
      // Get current customer cart
      // -------------------------------------------------

      const cart =
        await Cart.findOne({
          customer:
            customerId,
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

      // -------------------------------------------------
      // Get medicine IDs from cart
      // -------------------------------------------------

      const medicineIds =
        cart.items
          .map(
            (item) =>
              item?.medicine
          )
          .filter(Boolean);

      if (
        !medicineIds.length
      ) {
        return res.status(400).json({
          message:
            'No medicines found in the current cart.',
        });
      }

      // -------------------------------------------------
      // Determine file type
      // -------------------------------------------------

      const uploadedExtension =
        path
          .extname(
            req.file.originalname ||
              ''
          )
          .toLowerCase();

      const isPdf =
        req.file.mimetype ===
          'application/pdf' ||
        uploadedExtension ===
          '.pdf';

      const fileType =
        isPdf
          ? 'pdf'
          : 'image';

      // -------------------------------------------------
      // Generate secure file access token
      // -------------------------------------------------

      const fileAccessToken =
        crypto
          .randomBytes(32)
          .toString('hex');

      // -------------------------------------------------
      // Generate MongoDB ID before creating document
      // -------------------------------------------------

      const prescriptionId =
        new require('mongoose')
          .Types.ObjectId();

      // -------------------------------------------------
      // Permanent file URL
      // -------------------------------------------------
      //
      // Example:
      //
      // /api/prescriptions/
      // 68abc123.../
      // file/
      // 9f82....
      //
      // This does NOT depend on Render /uploads folder.
      // -------------------------------------------------

      const fileUrl =
        `/api/prescriptions/${prescriptionId}/file/${fileAccessToken}`;

      // -------------------------------------------------
      // Create prescription
      // -------------------------------------------------

      const prescription =
        await Prescription.create({
          _id:
            prescriptionId,

          customer:
            customerId,

          pharmacy:
            pharmacyId ||
            cart.pharmacy ||
            null,

          // Link prescription to
          // medicines in current cart
          medicines:
            medicineIds,

          // ------------------------------------------------
          // File information
          // ------------------------------------------------

          fileName:
            req.file.originalname,

          originalName:
            req.file.originalname,

          fileUrl,

          fileType,

          mimeType:
            req.file.mimetype,

          // ------------------------------------------------
          // ACTUAL FILE
          // ------------------------------------------------

          fileData:
            req.file.buffer,

          fileAccessToken,

          // ------------------------------------------------
          // Status
          // ------------------------------------------------

          status:
            'pending',
        });

      // -------------------------------------------------
      // Prepare safe response
      // -------------------------------------------------
      // Never send fileData/fileAccessToken to frontend.
      // -------------------------------------------------

      const responsePrescription =
        prescription.toObject();

      delete responsePrescription.fileData;
      delete responsePrescription.fileAccessToken;

      // -------------------------------------------------
      // Success response
      // -------------------------------------------------

      return res.status(201).json({
        message:
          'Prescription uploaded successfully',

        prescription:
          responsePrescription,
      });

    } catch (error) {
      console.error(
        'Prescription upload error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to upload prescription',

        error:
          error.message,
      });
    }
  }
);

// =====================================================
// VIEW / OPEN PRESCRIPTION FILE
// =====================================================
//
// This is the MAIN FIX.
//
// Mobile pharmacist app opens:
//
// /api/prescriptions/:id/file/:accessToken
//
// Backend reads fileData from MongoDB
// and sends the actual image/PDF.
// =====================================================

router.get(
  '/:id/file/:accessToken',

  async (req, res) => {
    try {
      const {
        id,
        accessToken,
      } = req.params;

      // -------------------------------------------------
      // Find prescription
      // -------------------------------------------------

      const prescription =
        await Prescription.findOne({
          _id: id,

          fileAccessToken:
            accessToken,
        }).select(
          '+fileData +fileAccessToken'
        );

      if (!prescription) {
        return res.status(404).send(
          'Prescription file not found'
        );
      }

      // -------------------------------------------------
      // Check actual file data
      // -------------------------------------------------

      if (
        !prescription.fileData ||
        !prescription.fileData.length
      ) {
        return res.status(404).send(
          'Prescription file data is unavailable'
        );
      }

      // -------------------------------------------------
      // Determine MIME type
      // -------------------------------------------------

      let mimeType =
        prescription.mimeType;

      if (!mimeType) {
        mimeType =
          prescription.fileType ===
          'pdf'
            ? 'application/pdf'
            : 'image/jpeg';
      }

      // -------------------------------------------------
      // Response headers
      // -------------------------------------------------

      res.setHeader(
        'Content-Type',
        mimeType
      );

      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(
          prescription.originalName ||
            prescription.fileName ||
            'prescription'
        )}"`
      );

      res.setHeader(
        'Cache-Control',
        'private, max-age=300'
      );

      // -------------------------------------------------
      // Send actual file
      // -------------------------------------------------

      return res.send(
        prescription.fileData
      );

    } catch (error) {
      console.error(
        'View prescription error:',
        error
      );

      return res.status(500).send(
        'Unable to open prescription'
      );
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
          customer:
            req.user.id,
        })
          // Do not return actual binary file
          .select(
            '-fileData -fileAccessToken'
          )

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

        error:
          error.message,
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
      // -------------------------------------------------
      // Find pharmacy
      // -------------------------------------------------

      const pharmacy =
        await Pharmacy.findOne({
          owner:
            req.user.id,

          isActive:
            true,
        });

      if (!pharmacy) {
        return res.status(404).json({
          message:
            'No pharmacy is linked to this account',
        });
      }

      // -------------------------------------------------
      // Get pharmacy prescriptions
      // -------------------------------------------------

      const prescriptions =
        await Prescription.find({
          pharmacy:
            pharmacy._id,
        })

          // IMPORTANT:
          // Do not send binary file to dashboard
          .select(
            '-fileData -fileAccessToken'
          )

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

        error:
          error.message,
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

      // -------------------------------------------------
      // Validate status
      // -------------------------------------------------

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

      // -------------------------------------------------
      // Find pharmacy
      // -------------------------------------------------

      const pharmacy =
        await Pharmacy.findOne({
          owner:
            req.user.id,

          isActive:
            true,
        });

      if (!pharmacy) {
        return res.status(404).json({
          message:
            'No pharmacy is linked to this account',
        });
      }

      // -------------------------------------------------
      // Find prescription
      // -------------------------------------------------

      const prescription =
        await Prescription.findOne({
          _id:
            req.params.id,

          pharmacy:
            pharmacy._id,
        });

      if (!prescription) {
        return res.status(404).json({
          message:
            'Prescription not found',
        });
      }

      // -------------------------------------------------
      // Rejection reason
      // -------------------------------------------------

      if (
        status ===
          'rejected' &&
        !String(
          rejectionReason
        ).trim()
      ) {
        return res.status(400).json({
          message:
            'Rejection reason is required',
        });
      }

      // -------------------------------------------------
      // Update prescription
      // -------------------------------------------------

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

      // -------------------------------------------------
      // Safe response
      // -------------------------------------------------

      const responsePrescription =
        prescription.toObject();

      delete responsePrescription.fileData;
      delete responsePrescription.fileAccessToken;

      // -------------------------------------------------
      // Response
      // -------------------------------------------------

      return res.json({
        message:
          status === 'approved'
            ? 'Prescription approved successfully'
            : 'Prescription rejected successfully',

        prescription:
          responsePrescription,
      });

    } catch (error) {
      console.error(
        'Verify prescription error:',
        error
      );

      return res.status(500).json({
        message:
          'Failed to verify prescription',

        error:
          error.message,
      });
    }
  }
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports =
  router;