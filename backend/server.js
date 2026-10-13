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

// =====================================================
// DAILY EXPIRY + LOW STOCK CRON
// 9:00 AM EVERY DAY
// =====================================================

cron.schedule(
  '0 9 * * *',
  async () => {

    console.log(
      '⏰ Running daily expiry check...'
    );

    try {

      const Medicine =
        require(
          './models/Medicine'
        );

      const User =
        require(
          './models/User'
        );

      const {
        sendExpiryAlert,
        sendLowStockAlert
      } =
        require(
          './services/emailService'
        );

      // =================================================
      // TODAY
      // =================================================

      const today =
        new Date();

      // =================================================
      // GET ACTIVE MEDICINES
      // =================================================

      const medicines =
        await Medicine.find({

          status: {
            $ne: 'removed'
          }

        });

      const alertMedicines = [];

      const lowStockMedicines = [];

      // =================================================
      // PROCESS MEDICINES
      // =================================================

      for (
        const med of medicines
      ) {

        const expiry =
          new Date(
            med.expiryDate
          );

        const daysLeft =
          Math.ceil(

            (
              expiry - today
            ) /

            (
              1000 *
              60 *
              60 *
              24
            )

          );

        // =================================================
        // CALCULATE STATUS
        // =================================================

        let newStatus =
          'safe';

        if (
          daysLeft <= 0
        ) {

          newStatus =
            'expired';

        }

        else if (
          daysLeft <= 7
        ) {

          newStatus =
            'critical';

        }

        else if (
          daysLeft <= 30
        ) {

          newStatus =
            'warning';

        }

        else if (
          daysLeft <= 90
        ) {

          newStatus =
            'caution';

        }

        else {

          newStatus =
            'safe';

        }

        // =================================================
        // UPDATE MEDICINE STATUS
        // =================================================

        await Medicine.findByIdAndUpdate(

          med._id,

          {
            status:
              newStatus
          }

        );

        // =================================================
        // EXPIRY ALERT LIST
        // =================================================

        if (
          newStatus !== 'safe'
        ) {

          alertMedicines.push({

            name:
              med.name,

            batchNumber:
              med.batchNumber,

            quantity:
              med.quantity,

            status:
              newStatus,

            daysLeft:
              daysLeft

          });

        }

        // =================================================
        // LOW STOCK
        // =================================================

        if (

          med.quantity < 20

          &&

          newStatus !== 'expired'

        ) {

          lowStockMedicines.push({

            name:
              med.name,

            quantity:
              med.quantity,

            supplier:
              med.supplier

          });

        }

      }

      // =================================================
      // FIND EMAIL RECIPIENT
      // =================================================

      const admin =
        await User.findOne({
          role: 'admin'
        });

      const pharmacist =
        await User.findOne({
          role: 'pharmacist'
        });

      const alertEmail =

        admin?.email ||

        pharmacist?.email ||

        process.env.PHARMACY_EMAIL;

      // =================================================
      // EXPIRY EMAIL
      // =================================================

      if (

        alertMedicines.length > 0

        &&

        alertEmail

      ) {

        const result =
          await sendExpiryAlert(

            alertEmail,

            alertMedicines

          );

        if (
          result.success
        ) {

          console.log(

            `✅ Expiry alert email sent to ${alertEmail}`

          );

          console.log(

            `📧 ${alertMedicines.length} medicines reported`

          );

        }

      }

      // =================================================
      // LOW STOCK EMAIL
      // =================================================

      if (

        lowStockMedicines.length > 0

        &&

        alertEmail

      ) {

        const result =
          await sendLowStockAlert(

            alertEmail,

            lowStockMedicines

          );

        if (
          result.success
        ) {

          console.log(

            `✅ Low stock alert email sent to ${alertEmail}`

          );

        }

      }

      // =================================================
      // COMPLETE
      // =================================================

      console.log(
        '✅ Daily expiry check complete!'
      );

      console.log(

        `📊 Expiring: ${alertMedicines.length}` +

        ` | Low Stock: ${lowStockMedicines.length}`

      );

    }

    catch (err) {

      console.log(
        '❌ Cron job error:',
        err.message
      );

    }

  }
);

// =====================================================
// TEST CRON
// Runs every minute
// Currently disabled
// =====================================================

/*
cron.schedule(
  '* * * * *',
  async () => {

    console.log(
      '⏰ Test cron running...',
      new Date().toLocaleTimeString()
    );

  }
);
*/