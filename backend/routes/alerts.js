
const express = require('express');
const router = express.Router();

const Alert = require('../models/Alert');
const Medicine = require('../models/Medicine');
const User = require('../models/User');

const auth = require('../middleware/auth');
const { pharmacyStaff } = require('../middleware/rolePermissions');

const {
  sendExpiryAlert,
  sendLowStockAlert,
} = require('../services/emailService');

const {
  sendWhatsAppAlert,
  sendWhatsAppLowStock,
} = require('../services/whatsappService');

const LOW_STOCK_THRESHOLD = 5;

// =====================================================
// HELPERS
// =====================================================

const calculateStatus = (expiryDate) => {
  if (!expiryDate) return 'safe';

  const today = new Date();
  const expiry = new Date(expiryDate);

  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const daysLeft = Math.ceil(
    (expiry.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (daysLeft <= 0) return 'expired';
  if (daysLeft <= 7) return 'critical';
  if (daysLeft <= 30) return 'warning';
  if (daysLeft <= 90) return 'caution';

  return 'safe';
};

const calculateDaysLeft = (expiryDate) => {
  if (!expiryDate) return null;

  const today = new Date();
  const expiry = new Date(expiryDate);

  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  return Math.ceil(
    (expiry.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );
};

const getAlertEmail = async () => {
  const admin = await User.findOne({ role: 'admin' });
  const pharmacist = await User.findOne({ role: 'pharmacist' });

  return (
    admin?.email ||
    pharmacist?.email ||
    process.env.PHARMACY_EMAIL ||
    null
  );
};

const getExpiryMedicines = (medicines) => {
  return medicines
    .map((medicine) => {
      const status = calculateStatus(medicine.expiryDate);

      return {
        medicine,
        status,
        daysLeft: calculateDaysLeft(medicine.expiryDate),
      };
    })
    .filter(({ status }) =>
      ['expired', 'critical', 'warning', 'caution'].includes(status)
    );
};

const getLowStockMedicines = (medicines) => {
  return medicines.filter((medicine) => {
    const quantity = Number(medicine.quantity || 0);
    const status = calculateStatus(medicine.expiryDate);

    return (
      quantity <= LOW_STOCK_THRESHOLD &&
      status !== 'expired'
    );
  });
};

const getExpiryEmailData = (items) =>
  items.map(({ medicine, status, daysLeft }) => ({
    name: medicine.name,
    batchNumber: medicine.batchNumber || 'N/A',
    quantity: Number(medicine.quantity || 0),
    status,
    daysLeft,
  }));

const getLowStockEmailData = (medicines) =>
  medicines.map((medicine) => ({
    name: medicine.name,
    quantity: Number(medicine.quantity || 0),
    supplier: medicine.supplier || 'Unknown',
  }));

const getStartOfDay = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

// =====================================================
// GET LIVE ALERTS
// GET /api/alerts
// =====================================================

router.get('/', auth, pharmacyStaff, async (req, res) => {
  try {
    const medicines = await Medicine.find({
      status: { $ne: 'removed' },
    }).sort({ expiryDate: 1 });

    const alerts = [];

    for (const medicine of medicines) {
      const status = calculateStatus(medicine.expiryDate);
      const daysLeft = calculateDaysLeft(medicine.expiryDate);
      const quantity = Number(medicine.quantity || 0);

      if (
        ['expired', 'critical', 'warning', 'caution'].includes(status)
      ) {
        alerts.push({
          id: `expiry-${medicine._id}`,
          _id: medicine._id,
          medicineId: medicine._id,
          name: medicine.name,
          brand: medicine.brand || 'N/A',
          batch: medicine.batchNumber || 'N/A',
          expiry: medicine.expiryDate,
          expiryDate: medicine.expiryDate,
          daysLeft,
          qty: quantity,
          type: status,
          status,
          sellingPrice: Number(medicine.sellingPrice || 0),
          supplier: medicine.supplier || '',
          qrCode: medicine.qrCode || null,
        });
      }

      if (quantity <= LOW_STOCK_THRESHOLD && status !== 'expired') {
        alerts.push({
          id: `lowstock-${medicine._id}`,
          _id: medicine._id,
          medicineId: medicine._id,
          name: medicine.name,
          brand: medicine.brand || 'N/A',
          batch: medicine.batchNumber || 'N/A',
          expiry: medicine.expiryDate,
          expiryDate: medicine.expiryDate,
          daysLeft,
          qty: quantity,
          type: 'lowstock',
          status,
          sellingPrice: Number(medicine.sellingPrice || 0),
          supplier: medicine.supplier || '',
          qrCode: medicine.qrCode || null,
        });
      }
    }

    const priority = {
      expired: 1,
      critical: 2,
      warning: 3,
      caution: 4,
      lowstock: 5,
    };

    alerts.sort(
      (a, b) =>
        (priority[a.type] || 99) - (priority[b.type] || 99)
    );

    return res.json(alerts);
  } catch (err) {
    console.error('Get live alerts error:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// =====================================================
// GENERATE ALERTS AND SEND EMAIL / WHATSAPP
// POST /api/alerts/generate
// =====================================================

router.post('/generate', auth, pharmacyStaff, async (req, res) => {
  try {
    console.log('Generating MedTracker alerts...');

    const medicines = await Medicine.find({
      status: { $ne: 'removed' },
    });

    // Refresh expiry status in MongoDB.
    for (const medicine of medicines) {
      const newStatus = calculateStatus(medicine.expiryDate);

      if (medicine.status !== 'removed' && medicine.status !== newStatus) {
        medicine.status = newStatus;
        await medicine.save();
      }
    }

    const expiryItems = getExpiryMedicines(medicines);
    const lowStockMedicines = getLowStockMedicines(medicines);

    console.log(`Expiry alerts: ${expiryItems.length}`);
    console.log(`Low-stock alerts: ${lowStockMedicines.length}`);

    const alertEmail = await getAlertEmail();
    const alertWhatsApp = process.env.PHARMACY_WHATSAPP;

    let expiryEmailResult = {
      success: false,
      message: alertEmail ? 'No expiry alerts to send' : 'Recipient email not configured',
    };

    let lowStockEmailResult = {
      success: false,
      message: alertEmail ? 'No low-stock alerts to send' : 'Recipient email not configured',
    };

    let expiryWhatsappResult = {
      success: false,
      message: 'No expiry WhatsApp sent',
    };

    let lowStockWhatsappResult = {
      success: false,
      message: 'No low-stock WhatsApp sent',
    };

    // Send expiry email.
    if (expiryItems.length > 0 && alertEmail) {
      expiryEmailResult = await sendExpiryAlert(
        alertEmail,
        getExpiryEmailData(expiryItems)
      );

      console.log(
        expiryEmailResult.success
          ? 'Expiry email sent'
          : `Expiry email failed: ${expiryEmailResult.error || 'Unknown error'}`
      );
    }

    // Send low-stock email.
    if (lowStockMedicines.length > 0 && alertEmail) {
      lowStockEmailResult = await sendLowStockAlert(
        alertEmail,
        getLowStockEmailData(lowStockMedicines)
      );

      console.log(
        lowStockEmailResult.success
          ? 'Low-stock email sent'
          : `Low-stock email failed: ${lowStockEmailResult.error || 'Unknown error'}`
      );
    }

    // Send expiry WhatsApp.
    if (expiryItems.length > 0 && alertWhatsApp) {
      expiryWhatsappResult = await sendWhatsAppAlert(
        alertWhatsApp,
        getExpiryEmailData(expiryItems)
      );

      console.log(
        expiryWhatsappResult.success
          ? 'Expiry WhatsApp sent'
          : 'Expiry WhatsApp failed'
      );
    }

    // Send low-stock WhatsApp.
    if (lowStockMedicines.length > 0 && alertWhatsApp) {
      lowStockWhatsappResult = await sendWhatsAppLowStock(
        alertWhatsApp,
        getLowStockEmailData(lowStockMedicines)
      );

      console.log(
        lowStockWhatsappResult.success
          ? 'Low-stock WhatsApp sent'
          : 'Low-stock WhatsApp failed'
      );
    }

    // Save one database alert per medicine/type per day.
    // This prevents duplicate notification records, but does not
    // itself prevent repeated emails when this endpoint is called again.
    const startOfDay = getStartOfDay();
    const alertsCreated = [];

    for (const item of expiryItems) {
      const medicine = item.medicine;

      const existingAlert = await Alert.findOne({
        medicine: medicine._id,
        alertType: item.status,
        createdAt: { $gte: startOfDay },
      });

      if (existingAlert) continue;

      const alert = await Alert.create({
        medicine: medicine._id,
        medicineName: medicine.name,
        alertType: item.status,
        daysLeft: item.daysLeft,
        sentEmail: expiryEmailResult.success,
        sentWhatsapp: expiryWhatsappResult.success,
      });

      alertsCreated.push(alert);
    }

    for (const medicine of lowStockMedicines) {
      const existingAlert = await Alert.findOne({
        medicine: medicine._id,
        alertType: 'lowstock',
        createdAt: { $gte: startOfDay },
      });

      if (existingAlert) continue;

      const alert = await Alert.create({
        medicine: medicine._id,
        medicineName: medicine.name,
        alertType: 'lowstock',
        daysLeft: 0,
        sentEmail: lowStockEmailResult.success,
        sentWhatsapp: lowStockWhatsappResult.success,
      });

      alertsCreated.push(alert);
    }

    return res.json({
      success: true,
      message: `${alertsCreated.length} new alert records created`,
      alerts: alertsCreated,
      recipientEmail: alertEmail,
      emailSent: expiryEmailResult.success,
      lowStockEmailSent: lowStockEmailResult.success,
      whatsappSent: expiryWhatsappResult.success,
      lowStockWhatsappSent: lowStockWhatsappResult.success,
      expiringCount: expiryItems.length,
      lowStockCount: lowStockMedicines.length,
      emailResults: {
        expiry: expiryEmailResult,
        lowStock: lowStockEmailResult,
      },
    });
  } catch (err) {
    console.error('Alert generation error:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// =====================================================
// GET UNREAD ALERT COUNT
// GET /api/alerts/unread-count
// =====================================================

router.get('/unread-count', auth, pharmacyStaff, async (req, res) => {
  try {
    const count = await Alert.countDocuments({ isRead: false });

    return res.json({
      success: true,
      count,
    });
  } catch (err) {
    console.error('Unread alert count error:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// =====================================================
// MARK ALL ALERTS AS READ
// PUT /api/alerts/read-all
// =====================================================

router.put('/read-all', auth, pharmacyStaff, async (req, res) => {
  try {
    const result = await Alert.updateMany(
      { isRead: false },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return res.json({
      success: true,
      message: 'All alerts marked as read',
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error('Mark all alerts read error:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// =====================================================
// MARK ONE ALERT AS READ
// PUT /api/alerts/:id/read
// =====================================================

router.put('/:id/read', auth, pharmacyStaff, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    alert.isRead = true;
    alert.readAt = new Date();

    await alert.save();

    return res.json({
      success: true,
      message: 'Alert marked as read',
      alert,
    });
  } catch (err) {
    console.error('Mark alert read error:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// =====================================================
// MANUAL EMAIL ALERT
// POST /api/alerts/send-email
// =====================================================

router.post('/send-email', auth, pharmacyStaff, async (req, res) => {
  try {
    // Recipient is selected by the backend.
    // The frontend no longer needs to provide "email".
    const toEmail = await getAlertEmail();

    if (!toEmail) {
      return res.status(400).json({
        success: false,
        message:
          'No recipient email configured. Set an admin/pharmacist email or PHARMACY_EMAIL.',
      });
    }

    const medicines = req.body.medicines;

    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Medicine list is required',
      });
    }

    const result = await sendExpiryAlert(toEmail, medicines);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Email sending failed',
      });
    }

    return res.json({
      success: true,
      message: `Email sent successfully to ${toEmail}`,
    });
  } catch (err) {
    console.error('Manual email error:', err);

    return res.status(500).json({
      success: false,
      message: 'Failed to send email',
    });
  }
});

module.exports = router;
