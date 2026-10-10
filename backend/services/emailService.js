const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email service error:', error);
  } else {
    console.log('✅ Email service ready!');
  }
});

// Send expiry alert email
const sendExpiryAlert = async (
  toEmail, medicines) => {
  try {
    // Build medicine table rows
    const medicineRows = medicines.map(med => `
      <tr>
        <td style="padding:10px;border:1px solid #ddd;">
          ${med.name}
        </td>
        <td style="padding:10px;border:1px solid #ddd;">
          ${med.batchNumber}
        </td>
        <td style="padding:10px;border:1px solid #ddd;">
          ${med.quantity} units
        </td>
        <td style="padding:10px;border:1px solid #ddd;
          color:${med.status === 'expired' ? '#F96167' :
                 med.status === 'critical' ? '#F96167' :
                 med.status === 'warning' ? '#FF9800' :
                 '#FFC107'};">
          ${med.status === 'expired' ? '⛔ EXPIRED' :
            med.status === 'critical' ? '🔴 Critical' :
            med.status === 'warning' ? '🟠 Warning' :
            '🟡 Caution'}
        </td>
        <td style="padding:10px;border:1px solid #ddd;">
          ${med.daysLeft <= 0 ? 'EXPIRED' :
            med.daysLeft + ' days left'}
        </td>
      </tr>
    `).join('');

    const mailOptions = {
      from: `"${process.env.PHARMACY_NAME}" 
             <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `⚠️ Medicine Expiry Alert — 
                ${medicines.length} medicines need attention!`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family:Arial,sans-serif;
                     background:#f5f5f5;padding:20px;">

          <div style="max-width:600px;margin:0 auto;
                      background:#ffffff;
                      border-radius:16px;
                      overflow:hidden;
                      box-shadow:0 4px 12px rgba(0,0,0,0.1);">

            <!-- Header -->
            <div style="background:#028090;padding:30px;
                        text-align:center;">
              <h1 style="color:#ffffff;margin:0;
                          font-size:24px;">
                💊 MedTracker Alert
              </h1>
              <p style="color:#E0F7FA;margin:8px 0 0;">
                ${process.env.PHARMACY_NAME}
              </p>
            </div>

            <!-- Alert Banner -->
            <div style="background:#FFF3CD;padding:16px;
                        text-align:center;
                        border-left:4px solid #FF9800;">
              <h2 style="color:#856404;margin:0;">
                ⚠️ ${medicines.length} Medicine(s) 
                Need Your Attention!
              </h2>
              <p style="color:#856404;margin:8px 0 0;">
                Please take immediate action
              </p>
            </div>

            <!-- Content -->
            <div style="padding:24px;">
              <p style="color:#333;font-size:15px;">
                Dear Pharmacist,
              </p>
              <p style="color:#555;font-size:14px;">
                The following medicines in your inventory 
                are expiring soon or have already expired. 
                Please take necessary action immediately.
              </p>

              <!-- Medicine Table -->
              <table style="width:100%;
                            border-collapse:collapse;
                            margin:20px 0;">
                <thead>
                  <tr style="background:#028090;">
                    <th style="padding:12px;color:#fff;
                               text-align:left;
                               border:1px solid #ddd;">
                      Medicine
                    </th>
                    <th style="padding:12px;color:#fff;
                               text-align:left;
                               border:1px solid #ddd;">
                      Batch
                    </th>
                    <th style="padding:12px;color:#fff;
                               text-align:left;
                               border:1px solid #ddd;">
                      Stock
                    </th>
                    <th style="padding:12px;color:#fff;
                               text-align:left;
                               border:1px solid #ddd;">
                      Status
                    </th>
                    <th style="padding:12px;color:#fff;
                               text-align:left;
                               border:1px solid #ddd;">
                      Expiry
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${medicineRows}
                </tbody>
              </table>

              <!-- Action Items -->
              <div style="background:#FEF0F0;
                          border-radius:10px;
                          padding:16px;
                          margin:20px 0;
                          border-left:4px solid #F96167;">
                <h3 style="color:#F96167;margin:0 0 10px;">
                  🚨 Action Required:
                </h3>
                <ul style="color:#555;
                           font-size:14px;
                           margin:0;
                           padding-left:20px;">
                  <li>Remove expired medicines from shelf</li>
                  <li>Contact supplier for return/replacement</li>
                  <li>Update stock in MedTracker system</li>
                  <li>Scan QR code to confirm removal</li>
                </ul>
              </div>

              <!-- Date -->
              <p style="color:#888;font-size:12px;
                        text-align:center;
                        margin-top:20px;">
                Alert generated on: 
                ${new Date().toLocaleString('en-IN')}
              </p>
            </div>

            <!-- Footer -->
            <div style="background:#F5F9FA;
                        padding:20px;
                        text-align:center;
                        border-top:1px solid #E2E8F0;">
              <p style="color:#888;font-size:12px;margin:0;">
                This is an automated alert from MedTracker
              </p>
              <p style="color:#028090;
                        font-size:13px;
                        font-weight:bold;
                        margin:8px 0 0;">
                💊 ${process.env.PHARMACY_NAME}
              </p>
            </div>

          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (err) {
    console.log('❌ Email error:', err);
    return { success: false, error: err.message };
  }
};

// Send low stock alert
const sendLowStockAlert = async (
  toEmail, medicines) => {
  try {
    const medicineRows = medicines.map(med => `
      <tr>
        <td style="padding:10px;border:1px solid #ddd;">
          ${med.name}
        </td>
        <td style="padding:10px;border:1px solid #ddd;
          color:#FF9800;font-weight:bold;">
          ${med.quantity} units
        </td>
        <td style="padding:10px;border:1px solid #ddd;">
          ${med.supplier || 'Unknown'}
        </td>
      </tr>
    `).join('');

    const mailOptions = {
      from: `"${process.env.PHARMACY_NAME}" 
             <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `📦 Low Stock Alert — 
                ${medicines.length} medicines need reorder!`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family:Arial,sans-serif;
                     background:#f5f5f5;padding:20px;">
          <div style="max-width:600px;margin:0 auto;
                      background:#ffffff;
                      border-radius:16px;
                      overflow:hidden;">

            <div style="background:#9C27B0;padding:30px;
                        text-align:center;">
              <h1 style="color:#ffffff;margin:0;">
                📦 Low Stock Alert
              </h1>
              <p style="color:#E1BEE7;margin:8px 0 0;">
                ${process.env.PHARMACY_NAME}
              </p>
            </div>

            <div style="padding:24px;">
              <p style="color:#333;">
                The following medicines are running low:
              </p>

              <table style="width:100%;
                            border-collapse:collapse;">
                <thead>
                  <tr style="background:#9C27B0;">
                    <th style="padding:12px;color:#fff;
                               border:1px solid #ddd;">
                      Medicine
                    </th>
                    <th style="padding:12px;color:#fff;
                               border:1px solid #ddd;">
                      Current Stock
                    </th>
                    <th style="padding:12px;color:#fff;
                               border:1px solid #ddd;">
                      Supplier
                    </th>
                  </tr>
                </thead>
                <tbody>${medicineRows}</tbody>
              </table>

              <p style="color:#888;font-size:12px;
                        margin-top:20px;text-align:center;">
                Alert generated: 
                ${new Date().toLocaleString('en-IN')}
              </p>
            </div>

          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Low stock email sent:', info.messageId);
    return { success: true };

  } catch (err) {
    console.log('❌ Low stock email error:', err);
    return { success: false, error: err.message };
  }
};

// Send registration welcome email
const sendWelcomeEmail = async (
  toEmail, name, role) => {
  try {
    const mailOptions = {
      from: `"MedTracker" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: '✅ Welcome to MedTracker!',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family:Arial,sans-serif;
                     background:#f5f5f5;padding:20px;">
          <div style="max-width:500px;margin:0 auto;
                      background:#ffffff;
                      border-radius:16px;
                      overflow:hidden;">

            <div style="background:#028090;padding:30px;
                        text-align:center;">
              <h1 style="color:#ffffff;margin:0;
                          font-size:28px;">
                💊 Welcome to MedTracker!
              </h1>
            </div>

            <div style="padding:24px;text-align:center;">
              <h2 style="color:#1A1A2E;">
                Hello, ${name}! 👋
              </h2>
              <p style="color:#555;font-size:15px;">
                Your account has been created successfully.
              </p>

              <div style="background:#E8F7F9;
                          border-radius:12px;
                          padding:20px;margin:20px 0;">
                <p style="margin:0;color:#028090;
                           font-size:16px;
                           font-weight:bold;">
                  Your Role: ${role.toUpperCase()}
                </p>
              </div>

              <p style="color:#555;font-size:14px;">
                You can now login to MedTracker and 
                start managing your pharmacy inventory.
              </p>

              <p style="color:#888;font-size:12px;
                        margin-top:20px;">
                Registered on: 
                ${new Date().toLocaleString('en-IN')}
              </p>
            </div>

          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent!');
    return { success: true };

  } catch (err) {
    console.log('❌ Welcome email error:', err);
    return { success: false };
  }
};

module.exports = {
  sendExpiryAlert,
  sendLowStockAlert,
  sendWelcomeEmail
};