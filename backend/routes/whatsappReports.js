const express = require('express');
const router = express.Router();

const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');

const auth = require('../middleware/auth');

const {
  pharmacyStaff,
} = require('../middleware/rolePermissions');

const {
  sendWhatsAppInventoryReport,
} = require('../services/whatsappService');


// =====================================================
// SEND WHATSAPP INVENTORY REPORT
// =====================================================

router.post(
  '/inventory',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const {
        toNumber,
      } = req.body;


      // -------------------------------------------------
      // VALIDATE PHONE NUMBER
      // -------------------------------------------------

      if (!toNumber) {

        return res.status(400).json({
          success: false,
          message: 'WhatsApp number is required',
        });

      }


      // -------------------------------------------------
      // INVENTORY DATA
      // -------------------------------------------------

      const medicines = await Medicine.find({
        status: {
          $ne: 'removed',
        },
      });


      const totalMedicines =
        medicines.length;


      const totalUnits =
        medicines.reduce(
          (sum, medicine) =>
            sum +
            Number(medicine.quantity || 0),
          0
        );


      const inventoryValue =
        medicines.reduce(
          (sum, medicine) =>
            sum +
            (
              Number(medicine.quantity || 0) *
              Number(medicine.purchasePrice || 0)
            ),
          0
        );


      const lowStockCount =
        medicines.filter(
          (medicine) =>
            Number(medicine.quantity || 0) > 0 &&
            Number(medicine.quantity || 0) <= 10
        ).length;


      const outOfStockCount =
        medicines.filter(
          (medicine) =>
            Number(medicine.quantity || 0) === 0
        ).length;


      // -------------------------------------------------
      // EXPIRY DATA
      // -------------------------------------------------

      const today = new Date();

      const thirtyDaysFromNow =
        new Date();

      thirtyDaysFromNow.setDate(
        today.getDate() + 30
      );


      const expired =
        medicines.filter(
          (medicine) =>
            medicine.expiryDate &&
            new Date(medicine.expiryDate) < today
        ).length;


      const expiringSoon =
        medicines.filter(
          (medicine) => {

            if (!medicine.expiryDate) {
              return false;
            }

            const expiry =
              new Date(
                medicine.expiryDate
              );

            return (
              expiry >= today &&
              expiry <= thirtyDaysFromNow
            );
          }
        ).length;


      // -------------------------------------------------
      // DEAD STOCK
      // -------------------------------------------------

      const ninetyDaysAgo =
        new Date();

      ninetyDaysAgo.setDate(
        ninetyDaysAgo.getDate() - 90
      );


      const sales =
        await Sale.find({
          createdAt: {
            $gte: ninetyDaysAgo,
          },
        });


      const soldMedicineIds =
        new Set();


      sales.forEach(
        (sale) => {

          if (
            !Array.isArray(
              sale.items
            )
          ) {
            return;
          }


          sale.items.forEach(
            (item) => {

              if (
                item.medicine
              ) {
                soldMedicineIds.add(
                  String(
                    item.medicine
                  )
                );
              }

            }
          );

        }
      );


      const deadStockCount =
        medicines.filter(
          (medicine) => {

            const quantity =
              Number(
                medicine.quantity || 0
              );

            if (quantity <= 0) {
              return false;
            }

            return !soldMedicineIds.has(
              String(medicine._id)
            );

          }
        ).length;


      // -------------------------------------------------
      // SALES SUMMARY
      // -------------------------------------------------

      const totalBills =
        sales.length;


      let totalUnitsSold = 0;
      let totalRevenue = 0;
      let totalProfit = 0;


      sales.forEach(
        (sale) => {

          if (
            !Array.isArray(
              sale.items
            )
          ) {
            return;
          }


          sale.items.forEach(
            (item) => {

              const quantity =
                Number(
                  item.quantity || 0
                );

              const price =
                Number(
                  item.price || 0
                );

              const total =
                Number(
                  item.total ||
                  quantity * price
                );


              totalUnitsSold +=
                quantity;

              totalRevenue +=
                total;


              const medicine =
                medicines.find(
                  (med) =>
                    String(
                      med._id
                    ) ===
                    String(
                      item.medicine
                    )
                );


              if (medicine) {

                const purchasePrice =
                  Number(
                    medicine.purchasePrice ||
                    0
                  );

                totalProfit +=
                  (
                    price -
                    purchasePrice
                  ) * quantity;

              }

            }
          );

        }
      );


      // -------------------------------------------------
      // REPORT OBJECT
      // -------------------------------------------------

      const report = {

        totalMedicines,

        totalUnits,

        inventoryValue,

        lowStockCount,

        outOfStockCount,

        totalBills,

        totalUnitsSold,

        totalRevenue,

        totalProfit,

        expiringSoon,

        expired,

        deadStockCount,

      };


      // -------------------------------------------------
      // SEND WHATSAPP
      // -------------------------------------------------

      const result =
        await sendWhatsAppInventoryReport(
          toNumber,
          report
        );


      if (!result.success) {

        return res.status(500).json({
          success: false,
          message:
            result.error ||
            'Failed to send WhatsApp report',
        });

      }


      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      return res.json({

        success: true,

        message:
          'Inventory report sent successfully',

        report,

        sid: result.sid,

      });

    } catch (error) {

      console.log(
        'WhatsApp report error:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Failed to generate WhatsApp report',

      });

    }

  }
);


module.exports = router;