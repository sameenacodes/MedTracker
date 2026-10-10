const express = require('express');
const router = express.Router();

const Removal = require('../models/Removal');
const Medicine = require('../models/Medicine');
const auth = require('../middleware/auth');

const {
  pharmacyStaff
} = require('../middleware/rolePermissions');


// ======================================================
// GET ALL REMOVALS
// ======================================================

router.get(
  '/',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const removals =
        await Removal.find()
          .sort({
            createdAt: -1
          });

      res.json(removals);

    } catch (err) {

      console.log(
        'Get removals error:',
        err
      );

      res.status(500).json({
        message: err.message
      });

    }

  }
);


// ======================================================
// CONFIRM PHYSICAL REMOVAL
// ======================================================

router.post(
  '/confirm',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const {
        medicineId,
        qrCode,
        reason
      } = req.body;


      // --------------------------------------------------
      // 1. BASIC VALIDATION
      // --------------------------------------------------

      if (!medicineId) {

        return res.status(400).json({
          success: false,
          message: 'Medicine ID is required'
        });

      }

      if (!qrCode) {

        return res.status(400).json({
          success: false,
          message: 'QR code is required'
        });

      }


      // --------------------------------------------------
      // 2. FIND MEDICINE
      // --------------------------------------------------

      const medicine =
        await Medicine.findById(
          medicineId
        );

      if (!medicine) {

        return res.status(404).json({
          success: false,
          message: 'Medicine not found'
        });

      }


      // --------------------------------------------------
      // 3. SERVER-SIDE QR VERIFICATION
      // --------------------------------------------------

      if (!medicine.qrCode) {

        return res.status(400).json({
          success: false,
          message:
            'This medicine does not have a QR code'
        });

      }

      if (
        medicine.qrCode !== qrCode
      ) {

        return res.status(400).json({
          success: false,
          message:
            '❌ QR code does not belong to this medicine'
        });

      }


      // --------------------------------------------------
      // 4. CHECK ALREADY REMOVED
      // --------------------------------------------------

      if (
        medicine.status === 'removed'
      ) {

        return res.status(400).json({
          success: false,
          message:
            'This medicine has already been removed'
        });

      }

      if (
        medicine.quantity <= 0
      ) {

        return res.status(400).json({
          success: false,
          message:
            'This medicine has no stock available'
        });

      }


      // --------------------------------------------------
      // 5. CHECK EXPIRY
      // --------------------------------------------------

      const today =
        new Date();

      const expiryDate =
        new Date(
          medicine.expiryDate
        );

      if (
        expiryDate > today
      ) {

        return res.status(400).json({
          success: false,
          message:
            'This medicine has not expired yet'
        });

      }


      // --------------------------------------------------
      // 6. GET DATA FROM DATABASE
      //    DO NOT TRUST FRONTEND VALUES
      // --------------------------------------------------

      const quantity =
        medicine.quantity;

      const sellingPrice =
        Number(
          medicine.sellingPrice || 0
        );

      const financialLoss =
        quantity * sellingPrice;


      // --------------------------------------------------
      // 7. WHO REMOVED IT
      // --------------------------------------------------

      const removedBy =
        req.body.removedBy ||
        req.user?.email ||
        req.user?.id ||
        'Unknown';


      // --------------------------------------------------
      // 8. UPDATE MEDICINE
      // --------------------------------------------------

      medicine.quantity = 0;

      medicine.status = 'removed';

      medicine.removedAt =
        new Date();

      medicine.removedBy =
        removedBy;

      medicine.removalReason =
        reason || 'expired';

      await medicine.save();


      // --------------------------------------------------
      // 9. CREATE REMOVAL HISTORY
      // --------------------------------------------------

      const removal =
        new Removal({

          medicine:
            medicine._id,

          medicineName:
            medicine.name,

          batchNumber:
            medicine.batchNumber,

          quantity:
            quantity,

          reason:
            reason || 'expired',

          removedBy:
            removedBy,

          financialLoss:
            financialLoss,

          qrScanned:
            true,

          removalDate:
            new Date()

        });

      await removal.save();


      // --------------------------------------------------
      // 10. SUCCESS RESPONSE
      // --------------------------------------------------

      res.status(201).json({

        success: true,

        message:
          '✅ Medicine removed successfully!',

        removal,

        financialLoss

      });

    } catch (err) {

      console.log(
        'Confirm removal error:',
        err
      );

      res.status(500).json({

        success: false,

        message:
          err.message

      });

    }

  }
);


// ======================================================
// REMOVAL STATISTICS
// ======================================================

router.get(
  '/stats',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const removals =
        await Removal.find();


      const totalLoss =
        removals.reduce(
          (sum, r) =>
            sum +
            Number(
              r.financialLoss || 0
            ),
          0
        );


      const now =
        new Date();


      const thisMonth =
        removals.filter((r) => {

          const removalDate =
            new Date(
              r.removalDate
            );

          return (
            removalDate.getMonth() ===
              now.getMonth() &&

            removalDate.getFullYear() ===
              now.getFullYear()
          );

        });


      const thisMonthLoss =
        thisMonth.reduce(
          (sum, r) =>
            sum +
            Number(
              r.financialLoss || 0
            ),
          0
        );


      res.json({

        totalRemovals:
          removals.length,

        totalLoss:
          totalLoss.toFixed(2),

        thisMonthRemovals:
          thisMonth.length,

        thisMonthLoss:
          thisMonthLoss.toFixed(2)

      });

    } catch (err) {

      console.log(
        'Removal stats error:',
        err
      );

      res.status(500).json({

        message:
          err.message

      });

    }

  }
);


// ======================================================
// VERIFY QR CODE
// ======================================================

router.post(
  '/verify-qr',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const {
        qrCode
      } = req.body;


      // --------------------------------------------------
      // 1. QR REQUIRED
      // --------------------------------------------------

      if (!qrCode) {

        return res.status(400).json({

          verified: false,

          message:
            'QR code is required'

        });

      }


      // --------------------------------------------------
      // 2. FIND MEDICINE BY QR
      // --------------------------------------------------

      const medicine =
        await Medicine.findOne({
          qrCode: qrCode
        });


      if (!medicine) {

        return res.status(404).json({

          verified: false,

          message:
            '❌ QR code not found'

        });

      }


      // --------------------------------------------------
      // 3. CHECK REMOVED
      // --------------------------------------------------

      if (
        medicine.status === 'removed'
      ) {

        return res.status(400).json({

          verified: false,

          message:
            'This medicine is already removed'

        });

      }


      // --------------------------------------------------
      // 4. CHECK STOCK
      // --------------------------------------------------

      if (
        medicine.quantity <= 0
      ) {

        return res.status(400).json({

          verified: false,

          message:
            'This medicine has no stock'

        });

      }


      // --------------------------------------------------
      // 5. SUCCESS
      // --------------------------------------------------

      res.json({

        verified: true,

        message:
          '✅ QR code verified successfully',

        medicine

      });

    } catch (err) {

      console.log(
        'Verify QR error:',
        err
      );

      res.status(500).json({

        verified: false,

        message:
          err.message

      });

    }

  }
);


// ======================================================
// EXPORT
// ======================================================

module.exports = router;