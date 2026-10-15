const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const dotenv = require('dotenv');
const pharmacyRoutes = require('./routes/pharmacies');
const pharmacyInventoryRoutes = require('./routes/pharmacyInventory');
const prescriptionRoutes =
  require('./routes/prescriptions');
const path = require('path');
const customerOrderRoutes =
  require('./routes/customerOrders');
const cartRoutes = require('./routes/cart');
const paymentRoutes =
  require('./routes/payments');
  require('dotenv').config();

// =====================================================
// LOAD ENV FIRST
// =====================================================

dotenv.config();

// =====================================================
// ROUTES
// =====================================================



// =====================================================
// AI CHAT
// =====================================================

const aiChatRoutes =
  require('./routes/aiChat');


// =====================================================
// AI DECISION SUPPORT
// =====================================================

const aiDecisionSupportRoutes =
  require('./routes/aiDecisionSupport');

const stockForecastRoutes =
  require('./routes/stockForecast');

const ocrRoutes =
  require('./routes/ocr');

const batchRoutes =
  require('./routes/batches');

const invoiceRoutes =
  require('./routes/invoices');

const analyticsRoutes =
  require('./routes/analytics');

const deadStockRoutes =
  require('./routes/deadStock');

const expiryRiskRoutes =
  require('./routes/expiryRisk');

const auditLogRoutes =
  require('./routes/auditLogs');

const whatsappReportRoutes =
  require('./routes/whatsappReports');

const backupRoutes =
  require('./routes/backup');

// =====================================================
// EXPRESS APP
// =====================================================

const app = express();

// =====================================================
// ROUTE NORMALIZER
// =====================================================

function getRouter(routeModule, routeName) {

  console.log('\n==============================');
  console.log(`🔍 ${routeName.toUpperCase()} DEBUG`);
  console.log('==============================');

  console.log(
    'Type:',
    typeof routeModule
  );

  console.log(
    'Keys:',
    Object.keys(routeModule || {})
  );

  console.log(
    'Is Function:',
    typeof routeModule === 'function'
  );

  const router =
    routeModule?.router ||
    routeModule;

  console.log(
    'Resolved Router Type:',
    typeof router
  );

  if (typeof router !== 'function') {

    console.error(
      `❌ ${routeName} is NOT a valid Express router.`
    );

    console.error(
      'Loaded value:',
      routeModule
    );

    throw new TypeError(
      `${routeName} must export an Express router/function`
    );
  }

  console.log(
    `✅ ${routeName} loaded successfully`
  );

  console.log(
    '==============================\n'
  );

  return router;
}

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(
  cors({

    origin: '*',

    methods: [
      'GET',
      'POST',
      'PUT',
      'DELETE'
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization'
    ]

  })
);

app.use(
  express.json()
);

app.use(
  '/uploads',
  express.static(
    path.join(__dirname, 'uploads')
  )
);

app.use(
  '/api/prescriptions',
  getRouter(
    prescriptionRoutes,
    'prescriptionRoutes'
  )
);

// =====================================================
// STOCK FORECAST
// =====================================================

app.use(
  '/api/stock-forecast',
  getRouter(
    stockForecastRoutes,
    'stockForecastRoutes'
  )
);

// =====================================================
// OCR
// =====================================================

app.use(
  '/api/ocr',
  getRouter(
    ocrRoutes,
    'ocrRoutes'
  )
);

// =====================================================
// EXPIRY RISK
// =====================================================

app.use(
  '/api/expiry-risk',
  getRouter(
    expiryRiskRoutes,
    'expiryRiskRoutes'
  )
);

// =====================================================
// AUTH
// =====================================================

const authRoutes =
  require('./routes/auth');

app.use(
  '/api/auth',
  getRouter(
    authRoutes,
    'authRoutes'
  )
);

// =====================================================
// MEDICINES
// =====================================================

const medicineRoutes =
  require('./routes/medicines');

app.use(
  '/api/medicines',
  getRouter(
    medicineRoutes,
    'medicineRoutes'
  )
);

// =====================================================
// SALES
// =====================================================

const salesRoutes =
  require('./routes/sales');

app.use(
  '/api/sales',
  getRouter(
    salesRoutes,
    'salesRoutes'
  )
);

app.use(
  '/api/payments',
  getRouter(
    paymentRoutes,
    'paymentRoutes'
  )
);

// =====================================================
// ALERTS
// =====================================================

const alertsRoutes =
  require('./routes/alerts');

app.use(
  '/api/alerts',
  getRouter(
    alertsRoutes,
    'alertsRoutes'
  )
);

// =====================================================
// REMOVALS
// =====================================================

const removalsRoutes =
  require('./routes/removals');

app.use(
  '/api/removals',
  getRouter(
    removalsRoutes,
    'removalsRoutes'
  )
);

// =====================================================
// BATCHES
// =====================================================

app.use(
  '/api/batches',
  getRouter(
    batchRoutes,
    'batchRoutes'
  )
);

// =====================================================
// INVOICES
// =====================================================

app.use(
  '/api/invoices',
  getRouter(
    invoiceRoutes,
    'invoiceRoutes'
  )
);

// =====================================================
// DEAD STOCK
// =====================================================

app.use(
  '/api/dead-stock',
  getRouter(
    deadStockRoutes,
    'deadStockRoutes'
  )
);

// =====================================================
// SUPPLIERS
// =====================================================

const supplierRoutes =
  require('./routes/suppliers');

app.use(
  '/api/suppliers',
  getRouter(
    supplierRoutes,
    'supplierRoutes'
  )
);

// =====================================================
// AUDIT LOGS
// =====================================================

app.use(
  '/api/audit-logs',
  getRouter(
    auditLogRoutes,
    'auditLogRoutes'
  )
);

// =====================================================
// AI REORDER
// =====================================================

console.log('\n📦 Loading Reorder Route...');

const reorderRoutes =
  require('./routes/reorder');

console.log(
  '📍 Reorder route resolved from:'
);

console.log(
  require.resolve('./routes/reorder')
);

app.use(
  '/api/reorder',
  getRouter(
    reorderRoutes,
    'reorderRoutes'
  )
);

app.use(
  '/api/pharmacies',
  getRouter(pharmacyRoutes, 'pharmacyRoutes')
);

app.use(
  '/api/pharmacy-inventory',
  getRouter(
    pharmacyInventoryRoutes,
    'pharmacyInventoryRoutes'
  )
);

app.use(
  '/api/customer-orders',
  getRouter(
    customerOrderRoutes,
    'customerOrderRoutes'
  )
);

app.use(
  '/api/cart',
  getRouter(cartRoutes, 'cartRoutes')
);

// =====================================================
// AI CHAT
// =====================================================

app.use(
  '/api/ai-chat',
  getRouter(
    aiChatRoutes,
    'aiChatRoutes'
  )
);

// =====================================================
// AI DECISION SUPPORT
// =====================================================

app.use(
  '/api/ai-decision-support',
  getRouter(
    aiDecisionSupportRoutes,
    'aiDecisionSupportRoutes'
  )
);

// =====================================================
// ANALYTICS
// =====================================================

app.use(
  '/api/analytics',
  getRouter(
    analyticsRoutes,
    'analyticsRoutes'
  )
);

// =====================================================
// WHATSAPP REPORTS
// =====================================================

app.use(
  '/api/whatsapp-reports',
  getRouter(
    whatsappReportRoutes,
    'whatsappReportRoutes'
  )
);

// =====================================================
// BACKUP
// =====================================================

app.use(
  '/api/backup',
  getRouter(
    backupRoutes,
    'backupRoutes'
  )
);

// =====================================================
// HEALTH / TEST ROUTE
// =====================================================

app.get(
  '/',
  (req, res) => {

    res.json({

      message:
        '💊 MedTracker API Running!',

      status:
        'success',

      version:
        '1.0.0'

    });

  }
);

// =====================================================
// MONGODB CONNECTION
// =====================================================

mongoose
  .connect(
    process.env.MONGO_URI
  )

  .then(() => {

    console.log(
      '✅ MongoDB Connected!'
    );

    const PORT =
      process.env.PORT || 5000;

    // =================================================
    // START SERVER
    // =================================================

    app.listen(
      PORT,
      '0.0.0.0',
      () => {

        console.log(
          `🚀 Server running on port ${PORT}`
        );

        console.log(
          `📡 Local API: http://localhost:${PORT}/api`
        );

        console.log(
          `🌐 Public API: https://medtracker-1.onrender.com/api`
        );

      }
    );

  })

  .catch(
    (err) => {

      console.log(
        '❌ DB Error:',
        err
      );

    }
  );


/* =====================================================
   AUTOMATIC EXPIRY + LOW STOCK EMAIL ALERTS
   Runs daily at 9:00 AM
===================================================== */

const runAutomaticMedicineAlerts = async () => {
  const Medicine = require('./models/Medicine');
  const User = require('./models/User');
  const Alert = require('./models/Alert');

  const {
    sendExpiryAlert,
    sendLowStockAlert,
  } = require('./services/emailService');

  const LOW_STOCK_THRESHOLD = 5;

  try {
    console.log('Checking medicine expiry and low stock...');

    const medicines = await Medicine.find({
      status: { $ne: 'removed' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryMedicines = [];
    const lowStockMedicines = [];

    for (const medicine of medicines) {
      let daysLeft = null;

      if (medicine.expiryDate) {
        const expiry = new Date(medicine.expiryDate);
        expiry.setHours(0, 0, 0, 0);

        daysLeft = Math.ceil(
          (expiry.getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24)
        );
      }

      let newStatus = 'safe';

      if (daysLeft !== null) {
        if (daysLeft <= 0) newStatus = 'expired';
        else if (daysLeft <= 7) newStatus = 'critical';
        else if (daysLeft <= 30) newStatus = 'warning';
        else if (daysLeft <= 90) newStatus = 'caution';
      }

      // Keep the database expiry status current.
      if (medicine.status !== newStatus) {
        medicine.status = newStatus;
        await medicine.save();
      }

      const expiryStage =
        daysLeft !== null && daysLeft <= 0
          ? 'expired'
          : daysLeft === 1
          ? 'one_day'
          : daysLeft !== null && daysLeft <= 7
          ? 'critical'
          : daysLeft !== null && daysLeft <= 30
          ? 'warning'
          : daysLeft !== null && daysLeft <= 90
          ? 'caution'
          : null;

      if (expiryStage) {
        expiryMedicines.push({
          medicine,
          daysLeft,
          expiryStage,
        });
      }

      if (
        Number(medicine.quantity || 0) <= LOW_STOCK_THRESHOLD &&
        newStatus !== 'expired'
      ) {
        lowStockMedicines.push(medicine);
      }
    }

    const admin = await User.findOne({ role: 'admin' });
    const pharmacist = await User.findOne({ role: 'pharmacist' });

    const recipient =
      admin?.email ||
      pharmacist?.email ||
      process.env.PHARMACY_EMAIL;

    if (!recipient) {
      console.error(
        'Automatic alerts skipped: no recipient email configured.'
      );
      return;
    }

    // Send expiry emails only for stages not already emailed.
    const newExpiryAlerts = [];

    for (const item of expiryMedicines) {
      const { medicine, expiryStage, daysLeft } = item;

      const previousAlert = await Alert.findOne({
        medicine: medicine._id,
        alertType: expiryStage,
        sentEmail: true,
      });

      if (!previousAlert) {
        newExpiryAlerts.push(item);
      }
    }

    if (newExpiryAlerts.length > 0) {
      const result = await sendExpiryAlert(
        recipient,
        newExpiryAlerts.map(({ medicine, daysLeft, expiryStage }) => ({
          name: medicine.name,
          batchNumber: medicine.batchNumber || 'N/A',
          quantity: medicine.quantity || 0,
          status:
            expiryStage === 'one_day' ? 'critical' : expiryStage,
          daysLeft,
        }))
      );

      if (result.success) {
        for (const item of newExpiryAlerts) {
          await Alert.create({
            medicine: item.medicine._id,
            medicineName: item.medicine.name,
            alertType: item.expiryStage,
            daysLeft: item.daysLeft,
            sentEmail: true,
            sentWhatsapp: false,
          });
        }

        console.log(
          `Expiry email sent to ${recipient} for ${newExpiryAlerts.length} medicine(s).`
        );
      } else {
        console.error('Expiry email failed:', result.error);
      }
    }

    // Send low-stock emails only for medicines not already emailed.
    const newLowStockAlerts = [];

    for (const medicine of lowStockMedicines) {
      const previousAlert = await Alert.findOne({
        medicine: medicine._id,
        alertType: 'lowstock',
        sentEmail: true,
      });

      if (!previousAlert) {
        newLowStockAlerts.push(medicine);
      }
    }

    if (newLowStockAlerts.length > 0) {
      const result = await sendLowStockAlert(
        recipient,
        newLowStockAlerts.map((medicine) => ({
          name: medicine.name,
          quantity: medicine.quantity || 0,
          supplier: medicine.supplier || 'Unknown',
        }))
      );

      if (result.success) {
        for (const medicine of newLowStockAlerts) {
          await Alert.create({
            medicine: medicine._id,
            medicineName: medicine.name,
            alertType: 'lowstock',
            daysLeft: 0,
            sentEmail: true,
            sentWhatsapp: false,
          });
        }

        console.log(
          `Low-stock email sent to ${recipient} for ${newLowStockAlerts.length} medicine(s).`
        );
      } else {
        console.error('Low-stock email failed:', result.error);
      }
    }

    console.log(
      `Automatic check complete. Expiry stages: ${newExpiryAlerts.length}; low stock: ${newLowStockAlerts.length}.`
    );
  } catch (error) {
    console.error('Automatic medicine alert error:', error);
  }
};

// Every day at 9:00 AM (server timezone).
cron.schedule('0 9 * * *', runAutomaticMedicineAlerts);

// Run once after MongoDB connects, so you can test without waiting
// until 9 AM. Remove this call if you don't want a startup check.
mongoose.connection.once('open', () => {
  runAutomaticMedicineAlerts().catch((error) =>
    console.error('Startup medicine alert error:', error)
  );
});
