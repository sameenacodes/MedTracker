const express = require('express');
const router = express.Router();

const Alert = require('../models/Alert');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const auth = require('../middleware/auth');
const {
  pharmacyStaff
} = require('../middleware/rolePermissions');

const {
  sendExpiryAlert,
  sendLowStockAlert,
} = require('../services/emailService');

const {
  sendWhatsAppAlert,
  sendWhatsAppLowStock,
} = require('../services/whatsappService');


// =====================================================
// HELPER: Calculate medicine expiry status
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
// HELPER: Calculate days left
// =====================================================

const calculateDaysLeft = (expiryDate) => {

  if (!expiryDate) {
    return 0;
  }

  const today = new Date();
  const expiry = new Date(expiryDate);

  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  return Math.ceil(
    (expiry - today) /
      (1000 * 60 * 60 * 24)
  );
};


// =====================================================
// GET CURRENT LIVE ALERTS
// GET /api/alerts
// =====================================================
//
// IMPORTANT:
// This endpoint reads directly from Medicine.
// No hardcoded alert data.
// No stale Alert records.
//
// Alert types:
// expired
// critical
// warning
// caution
// lowstock
//
// Removed medicines are excluded.
// =====================================================

router.get('/', auth, pharmacyStaff, async (req, res) => {

  try {

    const medicines = await Medicine.find({
      status: {
        $ne: 'removed',
      },
    }).sort({
      expiryDate: 1,
    });


    const alerts = [];


    // =================================================
    // CREATE LIVE ALERTS
    // =================================================

    for (const medicine of medicines) {

      const status =
        calculateStatus(
          medicine.expiryDate
        );

      const daysLeft =
        calculateDaysLeft(
          medicine.expiryDate
        );


      // =================================================
      // EXPIRY ALERT
      // =================================================

      if (
        status === 'expired' ||
        status === 'critical' ||
        status === 'warning' ||
        status === 'caution'
      ) {

        alerts.push({

          id:
            `expiry-${medicine._id}`,

          _id:
            medicine._id,

          medicineId:
            medicine._id,

          name:
            medicine.name,

          brand:
            medicine.brand || 'N/A',

          batch:
            medicine.batchNumber,

          expiry:
            medicine.expiryDate,

          expiryDate:
            medicine.expiryDate,

          daysLeft:
            daysLeft,

          qty:
            Number(
              medicine.quantity || 0
            ),

          type:
            status,

          status:
            status,

          sellingPrice:
            Number(
              medicine.sellingPrice || 0
            ),

          supplier:
            medicine.supplier || '',

          qrCode:
            medicine.qrCode || null,

        });

      }


      // =================================================
      // LOW STOCK ALERT
      // =================================================
      //
      // Low stock threshold = 20 units.
      // Expired medicines are NOT duplicated as low stock.
      // =================================================

      if (
        Number(
          medicine.quantity || 0
        ) < 20 &&
        status !== 'expired'
      ) {

        alerts.push({

          id:
            `lowstock-${medicine._id}`,

          _id:
            medicine._id,

          medicineId:
            medicine._id,

          name:
            medicine.name,

          brand:
            medicine.brand || 'N/A',

          batch:
            medicine.batchNumber,

          expiry:
            medicine.expiryDate,

          expiryDate:
            medicine.expiryDate,

          daysLeft:
            daysLeft,

          qty:
            Number(
              medicine.quantity || 0
            ),

          type:
            'lowstock',

          status:
            status,

          sellingPrice:
            Number(
              medicine.sellingPrice || 0
            ),

          supplier:
            medicine.supplier || '',

          qrCode:
            medicine.qrCode || null,

        });

      }

    }


    // =================================================
    // SORT ALERTS
    // =================================================

    const priority = {

      expired: 1,

      critical: 2,

      warning: 3,

      caution: 4,

      lowstock: 5,

    };


    alerts.sort(
      (a, b) =>
        (priority[a.type] || 99) -
        (priority[b.type] || 99)
    );


    // =================================================
    // RESPONSE
    // =================================================

    res.json(alerts);


  } catch (err) {

    console.log(
      '❌ Get live alerts error:',
      err
    );

    res.status(500).json({

      message:
        err.message,

    });

  }

});


// =====================================================
// GENERATE ALERTS
// POST /api/alerts/generate
// =====================================================

router.post(
  '/generate',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      console.log(
        '🔔 Generating alerts...'
      );


      // =================================================
      // GET ACTIVE MEDICINES
      // =================================================

      const medicines =
        await Medicine.find({
          status: {
            $ne: 'removed',
          },
        });


      const expiringMedicines = [];
      const lowStockMedicines = [];


      // =================================================
      // REFRESH STATUS
      // =================================================

      for (
        const medicine of medicines
      ) {

        const newStatus =
          calculateStatus(
            medicine.expiryDate
          );

        const daysLeft =
          calculateDaysLeft(
            medicine.expiryDate
          );


        // -----------------------------------------------
        // Update status
        // -----------------------------------------------

        if (
          medicine.status !==
          newStatus
        ) {

          medicine.status =
            newStatus;

          await medicine.save();

        }


        // -----------------------------------------------
        // Expiry alert
        // -----------------------------------------------

        if (
          newStatus === 'expired' ||
          newStatus === 'critical' ||
          newStatus === 'warning' ||
          newStatus === 'caution'
        ) {

          expiringMedicines.push({

            medicine:
              medicine,

            daysLeft:
              daysLeft,

            status:
              newStatus,

          });

        }


        // -----------------------------------------------
        // Low stock alert
        // -----------------------------------------------

        if (
          Number(
            medicine.quantity || 0
          ) < 20 &&
          newStatus !== 'expired'
        ) {

          lowStockMedicines.push({

            medicine:
              medicine,

            quantity:
              Number(
                medicine.quantity || 0
              ),

          });

        }

      }


      console.log(
        `📊 Expiry alerts: ${expiringMedicines.length}`
      );

      console.log(
        `📦 Low stock alerts: ${lowStockMedicines.length}`
      );


      // =================================================
      // ALERT RECIPIENTS
      // =================================================

      const admin =
        await User.findOne({
          role: 'admin',
        });

      const pharmacist =
        await User.findOne({
          role: 'pharmacist',
        });


      const alertEmail =
        admin?.email ||
        pharmacist?.email ||
        process.env.PHARMACY_EMAIL;


      const alertWhatsApp =
        process.env.PHARMACY_WHATSAPP;


      // =================================================
      // EXPIRY MEDICINE DATA
      // =================================================

      const medicinesWithDays =
        expiringMedicines.map(
          (item) => ({

            name:
              item.medicine.name,

            batchNumber:
              item.medicine.batchNumber,

            quantity:
              item.medicine.quantity,

            status:
              item.status,

            daysLeft:
              item.daysLeft,

          })
        );


      // =================================================
      // EMAIL RESULT
      // =================================================

      let emailResult = {

        success: false,

        message:
          'Email not configured',

      };


      // =================================================
      // SEND EXPIRY EMAIL
      // =================================================

      if (
        expiringMedicines.length > 0 &&
        alertEmail
      ) {

        try {

          emailResult =
            await sendExpiryAlert(
              alertEmail,
              medicinesWithDays
            );

          console.log(
            emailResult.success
              ? '✅ Expiry email sent'
              : '❌ Expiry email failed'
          );

        } catch (emailError) {

          console.log(
            '❌ Email error:',
            emailError.message
          );

          emailResult = {

            success: false,

            message:
              emailError.message,

          };

        }

      }


      // =================================================
      // WHATSAPP RESULT
      // =================================================

      let whatsappResult = {

        success: false,

        message:
          'WhatsApp not configured',

      };


      // =================================================
      // SEND EXPIRY WHATSAPP
      // =================================================

      if (
        expiringMedicines.length > 0 &&
        alertWhatsApp
      ) {

        try {

          whatsappResult =
            await sendWhatsAppAlert(
              alertWhatsApp,
              medicinesWithDays
            );

          console.log(
            whatsappResult.success
              ? '✅ Expiry WhatsApp sent'
              : '❌ Expiry WhatsApp failed'
          );

        } catch (
          whatsappError
        ) {

          console.log(
            '❌ WhatsApp error:',
            whatsappError.message
          );

          whatsappResult = {

            success: false,

            message:
              whatsappError.message,

          };

        }

      }


      // =================================================
      // LOW STOCK EMAIL
      // =================================================

      let lowStockEmailResult = {

        success: false,

      };


      if (
        lowStockMedicines.length > 0 &&
        alertEmail
      ) {

        try {

          lowStockEmailResult =
            await sendLowStockAlert(
              alertEmail,

              lowStockMedicines.map(
                (item) => ({

                  name:
                    item.medicine.name,

                  quantity:
                    item.medicine.quantity,

                  supplier:
                    item.medicine.supplier,

                })
              )
            );

          console.log(
            lowStockEmailResult.success
              ? '✅ Low stock email sent'
              : '❌ Low stock email failed'
          );

        } catch (emailError) {

          console.log(
            '❌ Low stock email error:',
            emailError.message
          );

        }

      }


      // =================================================
      // LOW STOCK WHATSAPP
      // =================================================

      let lowStockWhatsappResult = {

        success: false,

      };


      if (
        lowStockMedicines.length > 0 &&
        alertWhatsApp
      ) {

        try {

          lowStockWhatsappResult =
            await sendWhatsAppLowStock(
              alertWhatsApp,

              lowStockMedicines.map(
                (item) => ({

                  name:
                    item.medicine.name,

                  quantity:
                    item.medicine.quantity,

                  supplier:
                    item.medicine.supplier,

                })
              )
            );

          console.log(
            lowStockWhatsappResult.success
              ? '✅ Low stock WhatsApp sent'
              : '❌ Low stock WhatsApp failed'
          );

        } catch (
          whatsappError
        ) {

          console.log(
            '❌ Low stock WhatsApp error:',
            whatsappError.message
          );

        }

      }


      // =================================================
      // SAVE EXPIRY ALERT RECORDS
      // =================================================

      const alertsCreated = [];


      for (
        const item of expiringMedicines
      ) {

        const medicine =
          item.medicine;

        const daysLeft =
          item.daysLeft;

        const alertType =
          item.status;


        // -----------------------------------------------
        // START OF TODAY
        // -----------------------------------------------

        const startOfDay =
          new Date();

        startOfDay.setHours(
          0,
          0,
          0,
          0
        );


        // -----------------------------------------------
        // CHECK DUPLICATE
        // -----------------------------------------------

        const existingAlert =
          await Alert.findOne({

            medicine:
              medicine._id,

            alertType:
              alertType,

            createdAt: {

              $gte:
                startOfDay,

            },

          });


        if (
          existingAlert
        ) {

          console.log(
            `ℹ️ Alert already exists for ${medicine.name}`
          );

          continue;

        }


        // -----------------------------------------------
        // CREATE ALERT
        // -----------------------------------------------

        const alert =
          new Alert({

            medicine:
              medicine._id,

            medicineName:
              medicine.name,

            alertType:
              alertType,

            daysLeft:
              daysLeft,

            sentEmail:
              emailResult.success,

            sentWhatsapp:
              whatsappResult.success,

          });


        await alert.save();

        alertsCreated.push(
          alert
        );

      }


      // =================================================
      // SAVE LOW STOCK ALERT RECORDS
      // =================================================

      for (
        const item of lowStockMedicines
      ) {

        const medicine =
          item.medicine;


        const startOfDay =
          new Date();

        startOfDay.setHours(
          0,
          0,
          0,
          0
        );


        const existingAlert =
          await Alert.findOne({

            medicine:
              medicine._id,

            alertType:
              'lowstock',

            createdAt: {

              $gte:
                startOfDay,

            },

          });


        if (
          existingAlert
        ) {

          continue;

        }


        const alert =
          new Alert({

            medicine:
              medicine._id,

            medicineName:
              medicine.name,

            alertType:
              'lowstock',

            daysLeft:
              0,

            sentEmail:
              lowStockEmailResult.success,

            sentWhatsapp:
              lowStockWhatsappResult.success,

          });


        await alert.save();

        alertsCreated.push(
          alert
        );

      }


      // =================================================
      // RESPONSE
      // =================================================

      res.json({

        message:
          `✅ ${alertsCreated.length} alerts generated!`,

        alerts:
          alertsCreated,

        emailSent:
          emailResult.success,

        whatsappSent:
          whatsappResult.success,

        lowStockEmailSent:
          lowStockEmailResult.success,

        lowStockWhatsappSent:
          lowStockWhatsappResult.success,

        expiringCount:
          expiringMedicines.length,

        lowStockCount:
          lowStockMedicines.length,

      });


    } catch (err) {

      console.log(
        '❌ Alert generation error:',
        err
      );

      res.status(500).json({

        message:
          err.message,

      });

    }

  }
);


// =====================================================
// NOTIFICATION CENTER
// GET UNREAD ALERT COUNT
// GET /api/alerts/unread-count
// =====================================================

router.get(
  '/unread-count',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const count =
        await Alert.countDocuments({
          isRead: false,
        });


      res.json({

        success: true,

        count,

      });


    } catch (err) {

      console.log(
        '❌ Unread alert count error:',
        err
      );

      res.status(500).json({

        success: false,

        message:
          err.message,

      });

    }

  }
);


// =====================================================
// NOTIFICATION CENTER
// MARK ALL ALERTS AS READ
// PUT /api/alerts/read-all
// =====================================================

router.put(
  '/read-all',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const result =
        await Alert.updateMany(

          {
            isRead: false,
          },

          {
            $set: {

              isRead: true,

              readAt:
                new Date(),

            },
          }

        );


      res.json({

        success: true,

        message:
          'All alerts marked as read',

        modifiedCount:
          result.modifiedCount,

      });


    } catch (err) {

      console.log(
        '❌ Mark all alerts read error:',
        err
      );

      res.status(500).json({

        success: false,

        message:
          err.message,

      });

    }

  }
);


// =====================================================
// NOTIFICATION CENTER
// MARK SINGLE ALERT AS READ
// PUT /api/alerts/:id/read
// =====================================================

router.put(
  '/:id/read',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const alert =
        await Alert.findById(
          req.params.id
        );


      if (!alert) {

        return res.status(404).json({

          success: false,

          message:
            'Alert not found',

        });

      }


      alert.isRead = true;

      alert.readAt =
        new Date();


      await alert.save();


      res.json({

        success: true,

        message:
          'Alert marked as read',

        alert,

      });


    } catch (err) {

      console.log(
        '❌ Mark alert read error:',
        err
      );

      res.status(500).json({

        success: false,

        message:
          err.message,

      });

    }

  }
);


// =====================================================
// MANUAL EMAIL ALERT
// POST /api/alerts/send-email
// =====================================================

router.post(
  '/send-email',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const {
        email,
        medicines,
      } = req.body;


      // -----------------------------------------------
      // Validate email
      // -----------------------------------------------

      if (!email) {

        return res.status(400).json({

          message:
            'Email address is required',

          success:
            false,

        });

      }


      // -----------------------------------------------
      // Validate medicines
      // -----------------------------------------------

      if (
        !medicines ||
        !Array.isArray(medicines) ||
        medicines.length === 0
      ) {

        return res.status(400).json({

          message:
            'Medicine list is required',

          success:
            false,

        });

      }


      // -----------------------------------------------
      // Send email
      // -----------------------------------------------

      const result =
        await sendExpiryAlert(
          email,
          medicines
        );


      res.json({

        message:
          result.success
            ? '✅ Email sent!'
            : '❌ Email failed!',

        success:
          result.success,

      });


    } catch (err) {

      console.log(
        '❌ Manual email error:',
        err
      );

      res.status(500).json({

        message:
          err.message,

        success:
          false,

      });

    }

  }
);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;