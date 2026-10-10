const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const Medicine = require('../models/Medicine');
const auth = require('../middleware/auth');

const {
  adminOnly,
  pharmacyStaff,
  authenticatedUser,
} = require('../middleware/rolePermissions');

const {
  createAuditLog,
} = require('./auditLogs');


// =====================================================
// CALCULATE MEDICINE STATUS
// =====================================================

const calculateStatus = (expiryDate) => {

  if (!expiryDate) {
    return 'safe';
  }

  const today = new Date();
  const expiry = new Date(expiryDate);

  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const daysLeft = Math.ceil(
    (expiry - today) /
      (1000 * 60 * 60 * 24)
  );

  if (daysLeft <= 0) {
    return 'expired';
  }

  if (daysLeft <= 7) {
    return 'critical';
  }

  if (daysLeft <= 30) {
    return 'warning';
  }

  if (daysLeft <= 90) {
    return 'caution';
  }

  return 'safe';
};


// =====================================================
// GENERATE UNIQUE QR CODE
// =====================================================

const generateUniqueQRCode = () => {

  return `MED-${crypto.randomUUID()}`;

};


// =====================================================
// UPDATE STATUS FOR ALL MEDICINES
// =====================================================

const refreshMedicineStatuses = async (medicines) => {

  for (const medicine of medicines) {

    // Removed medicine should never
    // become safe/expired again
    if (medicine.status === 'removed') {
      continue;
    }

    const newStatus =
      calculateStatus(
        medicine.expiryDate
      );

    if (medicine.status !== newStatus) {

      medicine.status = newStatus;

      await medicine.save();
    }
  }

  return medicines;
};


// =====================================================
// GET ALL MEDICINES
// GET /api/medicines
// =====================================================

router.get(
  '/',
  auth,
  authenticatedUser,
  async (req, res) => {

    try {

      const medicines =
        await Medicine.find()
          .sort({
            createdAt: -1
          });

      await refreshMedicineStatuses(
        medicines
      );

      res.json(
        medicines
      );

    } catch (err) {

      console.log(
        'Get medicines error:',
        err
      );

      res.status(500).json({
        message: err.message
      });

    }

  }
);


// =====================================================
// GET EXPIRING MEDICINES
// GET /api/medicines/expiring
// =====================================================

router.get(
  '/expiring',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const medicines =
        await Medicine.find({
          status: {
            $ne: 'removed'
          }
        }).sort({
          expiryDate: 1
        });

      await refreshMedicineStatuses(
        medicines
      );

      const today = new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const result =
        medicines
          .filter(
            (med) =>
              med.status !== 'safe'
          )
          .map((med) => {

            const expiry =
              new Date(
                med.expiryDate
              );

            expiry.setHours(
              0,
              0,
              0,
              0
            );

            const daysLeft =
              Math.ceil(
                (expiry - today) /
                (1000 * 60 * 60 * 24)
              );

            return {

              ...med.toObject(),

              daysLeft,

              status:
                calculateStatus(
                  med.expiryDate
                )

            };

          });

      res.json(
        result
      );

    } catch (err) {

      console.log(
        'Expiring medicines error:',
        err
      );

      res.status(500).json({
        message: err.message
      });

    }

  }
);


// =====================================================
// GET REORDER SUGGESTIONS
// GET /api/medicines/reorder-suggestions
// =====================================================

router.get(
  '/reorder-suggestions',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const medicines =
        await Medicine.find({

          quantity: {
            $lt: 20
          },

          status: {
            $nin: [
              'expired',
              'removed'
            ]
          }

        }).sort({
          quantity: 1
        });

      await refreshMedicineStatuses(
        medicines
      );

      const result =
        medicines.filter(
          (med) =>
            med.status !== 'expired' &&
            med.status !== 'removed'
        );

      res.json(
        result
      );

    } catch (err) {

      console.log(
        'Reorder suggestions error:',
        err
      );

      res.status(500).json({
        message: err.message
      });

    }

  }
);


// =====================================================
// DASHBOARD STATISTICS
// GET /api/medicines/stats/dashboard
// =====================================================

router.get(
  '/stats/dashboard',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const medicines =
        await Medicine.find({
          status: {
            $ne: 'removed'
          }
        });

      await refreshMedicineStatuses(
        medicines
      );

      const total =
        medicines.length;

      const expired =
        medicines.filter(
          (med) =>
            med.status === 'expired'
        ).length;

      const expiringSoon =
        medicines.filter(
          (med) =>
            med.status === 'critical' ||
            med.status === 'warning' ||
            med.status === 'caution'
        ).length;

      const lowStock =
        medicines.filter(
          (med) =>
            med.quantity < 20 &&
            med.status !== 'expired'
        ).length;

      const totalStockValue =
        medicines.reduce(
          (sum, med) => {

            return (
              sum +
              (
                med.quantity *
                (med.purchasePrice || 0)
              )
            );

          },
          0
        );

      res.json({

        total,

        expired,

        expiringSoon,

        lowStock,

        totalStockValue:
          totalStockValue.toFixed(2)

      });

    } catch (err) {

      console.log(
        'Dashboard stats error:',
        err
      );

      res.status(500).json({
        message: err.message
      });

    }

  }
);


// =====================================================
// SEARCH MEDICINES
// GET /api/medicines/search/:query
// =====================================================

router.get(
  '/search/:query',
  auth,
  authenticatedUser,
  async (req, res) => {

    try {

      const query =
        req.params.query;

      const medicines =
        await Medicine.find({

          status: {
            $ne: 'removed'
          },

          $or: [

            {
              name: {
                $regex: query,
                $options: 'i'
              }
            },

            {
              brand: {
                $regex: query,
                $options: 'i'
              }
            },

            {
              batchNumber: {
                $regex: query,
                $options: 'i'
              }
            },

            {
              category: {
                $regex: query,
                $options: 'i'
              }
            },

            // =================================================
            // SEARCH BY PHYSICAL LOCATION
            // =================================================

            {
              rackNumber: {
                $regex: query,
                $options: 'i'
              }
            },

            {
              shelfNumber: {
                $regex: query,
                $options: 'i'
              }
            },

            {
              boxNumber: {
                $regex: query,
                $options: 'i'
              }
            }

          ]

        }).sort({
          name: 1
        });

      await refreshMedicineStatuses(
        medicines
      );

      res.json(
        medicines
      );

    } catch (err) {

      console.log(
        'Search error:',
        err
      );

      res.status(500).json({
        message: err.message
      });

    }

  }
);


// =====================================================
// ADD NEW MEDICINE
// POST /api/medicines
// =====================================================

router.post(
  '/',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const {

        name,
        brand,
        category,
        batchNumber,
        mfgDate,
        expiryDate,
        quantity,
        purchasePrice,
        sellingPrice,
        supplier,

        // =================================================
        // PHYSICAL STORAGE LOCATION
        // =================================================

        rackNumber,
        shelfNumber,
        boxNumber

      } = req.body;


      // ---------------------------------------------
      // VALIDATE REQUIRED FIELDS
      // ---------------------------------------------

      if (
        !name ||
        !batchNumber ||
        !expiryDate ||
        quantity === undefined
      ) {

        return res.status(400).json({

          message:
            'Name, batch number, expiry date and quantity are required'

        });

      }


      // ---------------------------------------------
      // GENERATE UNIQUE QR
      // ---------------------------------------------

      const qrCode =
        generateUniqueQRCode();


      // ---------------------------------------------
      // CALCULATE STATUS
      // ---------------------------------------------

      const status =
        calculateStatus(
          expiryDate
        );


      // ---------------------------------------------
      // CREATE MEDICINE
      // ---------------------------------------------

      const medicine =
        new Medicine({

          name,

          brand,

          category,

          batchNumber,

          mfgDate,

          expiryDate,

          quantity,

          purchasePrice,

          sellingPrice,

          supplier,

          // =================================================
          // PHYSICAL STORAGE LOCATION
          // =================================================

          rackNumber,

          shelfNumber,

          boxNumber,

          qrCode,

          status

        });


      // ---------------------------------------------
      // SAVE
      // ---------------------------------------------

      await medicine.save();


      // ---------------------------------------------
      // AUDIT LOG
      // ---------------------------------------------

      await createAuditLog({

        req,

        action:
          'MEDICINE_ADDED',

        module:
          'medicine',

        medicine:
          medicine._id,

        medicineName:
          medicine.name,

        batchNumber:
          medicine.batchNumber,

        quantity:
          medicine.quantity,

        description:
          'New medicine added to inventory',

        details: {

          brand:
            medicine.brand || '',

          category:
            medicine.category || '',

          purchasePrice:
            medicine.purchasePrice || 0,

          sellingPrice:
            medicine.sellingPrice || 0,

          supplier:
            medicine.supplier || '',

          expiryDate:
            medicine.expiryDate || null

        }

      });


      // ---------------------------------------------
      // RESPONSE
      // ---------------------------------------------

      res.status(201).json({

        message:
          '✅ Medicine added successfully!',

        medicine,

        qrCode

      });

    } catch (err) {

      console.log(
        'Add medicine error:',
        err
      );

      res.status(500).json({
        message: err.message
      });

    }

  }
);


// =====================================================
// GENERATE QR FOR EXISTING MEDICINE
//
// POST /api/medicines/:id/generate-qr
//
// Used for old medicines that were created before
// QR generation was added.
// =====================================================

router.post(
  '/:id/generate-qr',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const medicine =
        await Medicine.findById(
          req.params.id
        );


      if (!medicine) {

        return res.status(404).json({

          message:
            'Medicine not found'

        });

      }


      // ---------------------------------------------
      // If QR already exists, return existing QR
      // ---------------------------------------------

      if (medicine.qrCode) {

        return res.json({

          message:
            '✅ QR code already exists',

          medicine,

          qrCode:
            medicine.qrCode

        });

      }


      // ---------------------------------------------
      // Generate new unique QR
      // ---------------------------------------------

      const qrCode =
        generateUniqueQRCode();


      medicine.qrCode =
        qrCode;


      await medicine.save();


      // ---------------------------------------------
      // LOG
      // ---------------------------------------------

      console.log(
        '✅ QR generated for:',
        medicine.name
      );

      console.log(
        'Batch:',
        medicine.batchNumber
      );

      console.log(
        'QR:',
        qrCode
      );


      res.json({

        message:
          '✅ QR code generated successfully!',

        medicine,

        qrCode

      });

    } catch (err) {

      console.log(
        'Generate QR error:',
        err
      );

      res.status(500).json({

        message:
          err.message

      });

    }

  }
);


// =====================================================
// UPDATE MEDICINE
// PUT /api/medicines/:id
// =====================================================

router.put(
  '/:id',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const {

        name,
        brand,
        category,
        batchNumber,
        mfgDate,
        expiryDate,
        quantity,
        purchasePrice,
        sellingPrice,
        supplier,

        // =================================================
        // PHYSICAL STORAGE LOCATION
        // =================================================

        rackNumber,
        shelfNumber,
        boxNumber

      } = req.body;


      const medicine =
        await Medicine.findById(
          req.params.id
        );


      if (!medicine) {

        return res.status(404).json({

          message:
            'Medicine not found'

        });

      }


      // ---------------------------------------------
      // DO NOT UPDATE REMOVED MEDICINE
      // ---------------------------------------------

      if (
        medicine.status === 'removed'
      ) {

        return res.status(400).json({

          message:
            'Removed medicine cannot be updated'

        });

      }


      // ---------------------------------------------
      // SAVE OLD VALUES FOR AUDIT
      // ---------------------------------------------

      const oldValues = {

        name:
          medicine.name,

        brand:
          medicine.brand,

        category:
          medicine.category,

        batchNumber:
          medicine.batchNumber,

        mfgDate:
          medicine.mfgDate,

        expiryDate:
          medicine.expiryDate,

        quantity:
          medicine.quantity,

        purchasePrice:
          medicine.purchasePrice,

        sellingPrice:
          medicine.sellingPrice,

        supplier:
          medicine.supplier,

        rackNumber:
          medicine.rackNumber,

        shelfNumber:
          medicine.shelfNumber,

        boxNumber:
          medicine.boxNumber

      };


      // ---------------------------------------------
      // UPDATE FIELDS
      // ---------------------------------------------

      if (
        name !== undefined
      ) {
        medicine.name = name;
      }


      if (
        brand !== undefined
      ) {
        medicine.brand = brand;
      }


      if (
        category !== undefined
      ) {
        medicine.category = category;
      }


      if (
        batchNumber !== undefined
      ) {
        medicine.batchNumber = batchNumber;
      }


      if (
        mfgDate !== undefined
      ) {
        medicine.mfgDate = mfgDate;
      }


      if (
        expiryDate !== undefined
      ) {
        medicine.expiryDate = expiryDate;
      }


      if (
        quantity !== undefined
      ) {
        medicine.quantity = quantity;
      }


      if (
        purchasePrice !== undefined
      ) {
        medicine.purchasePrice =
          purchasePrice;
      }


      if (
        sellingPrice !== undefined
      ) {
        medicine.sellingPrice =
          sellingPrice;
      }


      if (
        supplier !== undefined
      ) {
        medicine.supplier = supplier;
      }


      // =================================================
      // UPDATE PHYSICAL STORAGE LOCATION
      // =================================================

      if (
        rackNumber !== undefined
      ) {
        medicine.rackNumber =
          rackNumber;
      }


      if (
        shelfNumber !== undefined
      ) {
        medicine.shelfNumber =
          shelfNumber;
      }


      if (
        boxNumber !== undefined
      ) {
        medicine.boxNumber =
          boxNumber;
      }


      // ---------------------------------------------
      // IMPORTANT:
      // QR CODE IS NOT CHANGED DURING UPDATE
      // ---------------------------------------------

      medicine.status =
        calculateStatus(
          medicine.expiryDate
        );


      await medicine.save();


      // ---------------------------------------------
      // AUDIT LOG
      // ---------------------------------------------

      await createAuditLog({

        req,

        action:
          'MEDICINE_UPDATED',

        module:
          'medicine',

        medicine:
          medicine._id,

        medicineName:
          medicine.name,

        batchNumber:
          medicine.batchNumber,

        quantity:
          medicine.quantity,

        description:
          'Medicine details updated',

        details: {

          oldValues,

          newValues: {

            name:
              medicine.name,

            brand:
              medicine.brand,

            category:
              medicine.category,

            batchNumber:
              medicine.batchNumber,

            mfgDate:
              medicine.mfgDate,

            expiryDate:
              medicine.expiryDate,

            quantity:
              medicine.quantity,

            purchasePrice:
              medicine.purchasePrice,

            sellingPrice:
              medicine.sellingPrice,

            supplier:
              medicine.supplier,

            rackNumber:
              medicine.rackNumber,

            shelfNumber:
              medicine.shelfNumber,

            boxNumber:
              medicine.boxNumber

          }

        }

      });


      console.log(
        'Medicine updated:',
        medicine.name
      );

      console.log(
        'Expiry:',
        medicine.expiryDate
      );

      console.log(
        'Rack:',
        medicine.rackNumber
      );

      console.log(
        'Shelf:',
        medicine.shelfNumber
      );

      console.log(
        'Box:',
        medicine.boxNumber
      );

      console.log(
        'New status:',
        medicine.status
      );


      res.json({

        message:
          '✅ Medicine updated successfully!',

        medicine

      });

    } catch (err) {

      console.log(
        'Update medicine error:',
        err
      );

      res.status(500).json({
        message: err.message
      });

    }

  }
);


// =====================================================
// GET SINGLE MEDICINE
// GET /api/medicines/:id
// =====================================================

router.get(
  '/:id',
  auth,
  authenticatedUser,
  async (req, res) => {

    try {

      const medicine =
        await Medicine.findById(
          req.params.id
        );


      if (!medicine) {

        return res.status(404).json({

          message:
            'Medicine not found'

        });

      }


      // ---------------------------------------------
      // Don't change removed medicine
      // ---------------------------------------------

      if (
        medicine.status !== 'removed'
      ) {

        const newStatus =
          calculateStatus(
            medicine.expiryDate
          );


        if (
          medicine.status !== newStatus
        ) {

          medicine.status =
            newStatus;

          await medicine.save();

        }

      }


      res.json(
        medicine
      );

    } catch (err) {

      console.log(
        'Get medicine error:',
        err
      );

      res.status(500).json({
        message: err.message
      });

    }

  }
);


// =====================================================
// DELETE MEDICINE
// DELETE /api/medicines/:id
// =====================================================

router.delete(
  '/:id',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const medicine =
        await Medicine.findById(
          req.params.id
        );


      if (!medicine) {

        return res.status(404).json({

          message:
            'Medicine not found'

        });

      }


      await Medicine.findByIdAndDelete(
        req.params.id
      );


      // ---------------------------------------------
      // AUDIT LOG
      // ---------------------------------------------

      await createAuditLog({

        req,

        action:
          'MEDICINE_DELETED',

        module:
          'medicine',

        medicine:
          medicine._id,

        medicineName:
          medicine.name,

        batchNumber:
          medicine.batchNumber,

        quantity:
          medicine.quantity,

        description:
          'Medicine permanently deleted from inventory',

        details: {

          brand:
            medicine.brand || '',

          category:
            medicine.category || '',

          purchasePrice:
            medicine.purchasePrice || 0,

          sellingPrice:
            medicine.sellingPrice || 0,

          supplier:
            medicine.supplier || '',

          expiryDate:
            medicine.expiryDate || null

        }

      });


      res.json({

        message:
          '✅ Medicine deleted successfully!'

      });

    } catch (err) {

      console.log(
        'Delete medicine error:',
        err
      );

      res.status(500).json({
        message: err.message
      });

    }

  }
);


// =====================================================
// MARK MEDICINE AS REMOVED
// PUT /api/medicines/:id/remove
// =====================================================

router.put(
  '/:id/remove',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const {
        removedBy,
        removalReason
      } = req.body;


      const medicine =
        await Medicine.findById(
          req.params.id
        );


      if (!medicine) {

        return res.status(404).json({

          message:
            'Medicine not found'

        });

      }


      if (
        medicine.status === 'removed'
      ) {

        return res.status(400).json({

          message:
            'Medicine is already removed'

        });

      }


      medicine.quantity = 0;

      medicine.status =
        'removed';

      medicine.removedAt =
        new Date();

      medicine.removedBy =
        removedBy ||
        'Unknown';

      medicine.removalReason =
        removalReason ||
        'expired';


      await medicine.save();


      // ---------------------------------------------
      // AUDIT LOG
      // ---------------------------------------------

      await createAuditLog({

        req,

        action:
          'MEDICINE_REMOVED',

        module:
          'medicine',

        medicine:
          medicine._id,

        medicineName:
          medicine.name,

        batchNumber:
          medicine.batchNumber,

        quantity:
          medicine.quantity,

        description:
          'Medicine marked as removed',

        details: {

          removedBy:
            medicine.removedBy,

          removalReason:
            medicine.removalReason,

          removedAt:
            medicine.removedAt

        }

      });


      res.json({

        message:
          '✅ Medicine marked as removed!',

        medicine

      });

    } catch (err) {

      console.log(
        'Remove medicine error:',
        err
      );

      res.status(500).json({
        message: err.message
      });

    }

  }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;