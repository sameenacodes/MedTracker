const twilio = require('twilio');

// ============================================================
// TWILIO CONFIGURATION
// ============================================================

const TWILIO_ACCOUNT_SID =
  process.env.TWILIO_ACCOUNT_SID;

const TWILIO_AUTH_TOKEN =
  process.env.TWILIO_AUTH_TOKEN;

const TWILIO_WHATSAPP_FROM =
  process.env.TWILIO_WHATSAPP_FROM;

// ============================================================
// VALIDATE TWILIO CONFIG
// ============================================================

console.log(
  '📱 WhatsApp configuration:'
);

console.log(
  'TWILIO_ACCOUNT_SID:',
  TWILIO_ACCOUNT_SID
    ? 'SET'
    : 'MISSING'
);

console.log(
  'TWILIO_AUTH_TOKEN:',
  TWILIO_AUTH_TOKEN
    ? 'SET'
    : 'MISSING'
);

console.log(
  'TWILIO_WHATSAPP_FROM:',
  TWILIO_WHATSAPP_FROM
    ? 'SET'
    : 'MISSING'
);

// ============================================================
// CREATE TWILIO CLIENT
// ============================================================

let client = null;

if (
  TWILIO_ACCOUNT_SID &&
  TWILIO_AUTH_TOKEN
) {
  client = twilio(
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN
  );

  console.log(
    '✅ Twilio WhatsApp client initialized'
  );
} else {
  console.log(
    '⚠️ Twilio client NOT initialized'
  );
}

// ============================================================
// VALIDATE CLIENT
// ============================================================

const checkTwilioConfig = () => {
  if (!client) {
    throw new Error(
      'Twilio is not configured. Please check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env'
    );
  }

  if (!TWILIO_WHATSAPP_FROM) {
    throw new Error(
      'TWILIO_WHATSAPP_FROM is missing in .env'
    );
  }
};

// ============================================================
// SEND WHATSAPP EXPIRY ALERT
// ============================================================

const sendWhatsAppAlert = async (
  toNumber,
  medicines
) => {
  try {

    checkTwilioConfig();

    if (!toNumber) {
      throw new Error(
        'WhatsApp recipient number is required'
      );
    }

    if (!Array.isArray(medicines)) {
      throw new Error(
        'Medicines must be an array'
      );
    }

    // --------------------------------------------------------
    // BUILD MESSAGE
    // --------------------------------------------------------

    let message =
      `🏥 *${process.env.PHARMACY_NAME || 'MedTracker'}*\n`;

    message +=
      `⚠️ *Medicine Expiry Alert*\n\n`;

    message +=
      `📅 Date: ${new Date().toLocaleDateString('en-IN')}\n\n`;

    message +=
      `*Medicines needing attention:*\n`;

    message +=
      `─────────────────\n`;

    medicines.forEach((med, i) => {

      const emoji =
        med.status === 'expired'
          ? '⛔'
          : med.status === 'critical'
            ? '🔴'
            : med.status === 'warning'
              ? '🟠'
              : '🟡';

      message +=
        `${i + 1}. ${emoji} *${med.name || 'Unknown Medicine'}*\n`;

      message +=
        `   Batch: ${med.batchNumber || 'N/A'}\n`;

      message +=
        `   Stock: ${med.quantity || 0} units\n`;

      message +=
        `   Status: ${
          Number(med.daysLeft) <= 0
            ? 'EXPIRED ⛔'
            : `${med.daysLeft} days left`
        }\n\n`;
    });

    message +=
      `─────────────────\n`;

    message +=
      `⚡ Please take immediate action!\n`;

    message +=
      `💊 _MedTracker Alert System_`;

    // --------------------------------------------------------
    // SEND
    // --------------------------------------------------------

    const result =
      await client.messages.create({
        body: message,
        from: TWILIO_WHATSAPP_FROM,
        to: toNumber,
      });

    console.log(
      '✅ WhatsApp expiry alert sent:',
      result.sid
    );

    return {
      success: true,
      sid: result.sid,
    };

  } catch (err) {

    console.log(
      '❌ WhatsApp expiry error:',
      err.message
    );

    return {
      success: false,
      error: err.message,
    };
  }
};

// ============================================================
// SEND LOW STOCK WHATSAPP ALERT
// ============================================================

const sendWhatsAppLowStock = async (
  toNumber,
  medicines
) => {
  try {

    checkTwilioConfig();

    if (!toNumber) {
      throw new Error(
        'WhatsApp recipient number is required'
      );
    }

    if (!Array.isArray(medicines)) {
      throw new Error(
        'Medicines must be an array'
      );
    }

    let message =
      `🏥 *${process.env.PHARMACY_NAME || 'MedTracker'}*\n`;

    message +=
      `📦 *Low Stock Alert*\n\n`;

    message +=
      `*Medicines running low:*\n`;

    message +=
      `─────────────────\n`;

    medicines.forEach((med, i) => {

      message +=
        `${i + 1}. 📦 *${med.name || 'Unknown Medicine'}*\n`;

      message +=
        `   Current Stock: ${med.quantity || 0} units\n`;

      message +=
        `   Supplier: ${med.supplier || 'Unknown'}\n\n`;
    });

    message +=
      `─────────────────\n`;

    message +=
      `🛒 Please reorder soon!\n`;

    message +=
      `💊 _MedTracker Alert System_`;

    const result =
      await client.messages.create({
        body: message,
        from: TWILIO_WHATSAPP_FROM,
        to: toNumber,
      });

    console.log(
      '✅ WhatsApp low stock sent:',
      result.sid
    );

    return {
      success: true,
      sid: result.sid,
    };

  } catch (err) {

    console.log(
      '❌ WhatsApp low stock error:',
      err.message
    );

    return {
      success: false,
      error: err.message,
    };
  }
};

// ============================================================
// SEND WELCOME WHATSAPP
// ============================================================

const sendWhatsAppWelcome = async (
  toNumber,
  name,
  role
) => {
  try {

    checkTwilioConfig();

    if (!toNumber) {
      throw new Error(
        'WhatsApp recipient number is required'
      );
    }

    const message =
      `💊 *Welcome to MedTracker!*\n\n` +
      `Hello *${name || 'User'}*! 👋\n\n` +
      `Your account has been created successfully.\n` +
      `Role: *${String(role || 'user').toUpperCase()}*\n\n` +
      `You can now login and manage your pharmacy inventory.\n\n` +
      `🏥 _${process.env.PHARMACY_NAME || 'MedTracker'}_`;

    const result =
      await client.messages.create({
        body: message,
        from: TWILIO_WHATSAPP_FROM,
        to: toNumber,
      });

    console.log(
      '✅ Welcome WhatsApp sent:',
      result.sid
    );

    return {
      success: true,
      sid: result.sid,
    };

  } catch (err) {

    console.log(
      '❌ Welcome WhatsApp error:',
      err.message
    );

    return {
      success: false,
      error: err.message,
    };
  }
};

// ============================================================
// SEND WHATSAPP INVENTORY REPORT
// ============================================================

const sendWhatsAppInventoryReport =
  async (
    toNumber,
    report
  ) => {

    try {

      checkTwilioConfig();

      if (!toNumber) {
        throw new Error(
          'WhatsApp recipient number is required'
        );
      }

      report = report || {};

      // ------------------------------------------------------
      // BUILD MESSAGE
      // ------------------------------------------------------

      let message =
        `🏥 *${process.env.PHARMACY_NAME || 'MedTracker'}*\n`;

      message +=
        `📊 *Pharmacy Inventory Report*\n\n`;

      message +=
        `📅 Date: ${new Date().toLocaleDateString('en-IN')}\n`;

      message +=
        `─────────────────\n\n`;

      // ------------------------------------------------------
      // INVENTORY
      // ------------------------------------------------------

      message +=
        `📦 *Inventory Summary*\n`;

      message +=
        `Total Medicines: ${report.totalMedicines || 0}\n`;

      message +=
        `Total Units: ${report.totalUnits || 0}\n`;

      message +=
        `Low Stock: ${report.lowStockCount || 0}\n`;

      message +=
        `Out of Stock: ${report.outOfStockCount || 0}\n`;

      message +=
        `Inventory Value: ₹${Number(
          report.inventoryValue || 0
        ).toLocaleString('en-IN')}\n\n`;

      // ------------------------------------------------------
      // SALES
      // ------------------------------------------------------

      message +=
        `💰 *Sales Summary*\n`;

      message +=
        `Total Bills: ${report.totalBills || 0}\n`;

      message +=
        `Units Sold: ${report.totalUnitsSold || 0}\n`;

      message +=
        `Revenue: ₹${Number(
          report.totalRevenue || 0
        ).toLocaleString('en-IN')}\n`;

      message +=
        `Profit: ₹${Number(
          report.totalProfit || 0
        ).toLocaleString('en-IN')}\n\n`;

      // ------------------------------------------------------
      // ATTENTION
      // ------------------------------------------------------

      message +=
        `⚠️ *Attention Required*\n`;

      message +=
        `Expiring Soon: ${report.expiringSoon || 0}\n`;

      message +=
        `Expired: ${report.expired || 0}\n`;

      message +=
        `Dead Stock: ${report.deadStockCount || 0}\n\n`;

      message +=
        `─────────────────\n`;

      message +=
        `💊 _Generated by MedTracker_`;

      // ------------------------------------------------------
      // SEND
      // ------------------------------------------------------

      const result =
        await client.messages.create({
          body: message,
          from: TWILIO_WHATSAPP_FROM,
          to: toNumber,
        });

      console.log(
        '✅ WhatsApp inventory report sent:',
        result.sid
      );

      return {
        success: true,
        sid: result.sid,
      };

    } catch (err) {

      console.log(
        '❌ WhatsApp inventory report error:',
        err.message
      );

      return {
        success: false,
        error: err.message,
      };
    }
  };

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  sendWhatsAppAlert,
  sendWhatsAppLowStock,
  sendWhatsAppWelcome,
  sendWhatsAppInventoryReport,
};