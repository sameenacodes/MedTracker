const express = require('express');
const router = express.Router();

const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');
const auth = require('../middleware/auth');

const {
  pharmacyStaff,
} = require('../middleware/rolePermissions');


// =====================================================
// GET SALES ANALYTICS
// =====================================================

router.get(
  '/analytics',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      // -------------------------------------------------
      // GET ALL SALES
      // -------------------------------------------------

      const sales = await Sale.find()
        .sort({ createdAt: -1 });


      // -------------------------------------------------
      // BASIC SALES SUMMARY
      // -------------------------------------------------

      const totalBills = sales.length;

      let unitsSold = 0;
      let revenue = 0;
      let profit = 0;


      // -------------------------------------------------
      // CALCULATE TOTALS
      // -------------------------------------------------

      for (const sale of sales) {

        let saleSubtotal = 0;


        // -------------------------------------------------
        // CALCULATE ITEM TOTALS
        // -------------------------------------------------

        for (const item of sale.items || []) {

          const quantity =
            Number(item.quantity || 0);

          const price =
            Number(item.price || 0);

          // Use saved item total.
          // If missing/zero, calculate it.
          const itemTotal =
            Number(item.total || 0) ||
            (price * quantity);


          // Units sold
          unitsSold += quantity;


          // Subtotal for fallback revenue calculation
          saleSubtotal += itemTotal;


          // -------------------------------------------------
          // GET CURRENT MEDICINE PURCHASE PRICE
          // -------------------------------------------------

          let purchasePrice = 0;

          if (item.medicine) {

            const medicine =
              await Medicine.findById(item.medicine)
                .select('purchasePrice');

            purchasePrice =
              Number(
                medicine?.purchasePrice || 0
              );
          }


          // -------------------------------------------------
          // PROFIT
          // -------------------------------------------------

          profit +=
            (price - purchasePrice) * quantity;

        }


        // -------------------------------------------------
        // REVENUE
        // -------------------------------------------------

        const savedTotal =
          Number(sale.total || 0);

        const savedSubtotal =
          Number(sale.subtotal || 0);

        const savedGST =
          Number(sale.gst || 0);


        // -------------------------------------------------
        // NEW SALES
        // -------------------------------------------------

        if (savedTotal > 0) {

          revenue += savedTotal;

        }

        // -------------------------------------------------
        // OLD SALES WITH SUBTOTAL / GST
        // -------------------------------------------------

        else if (
          savedSubtotal > 0 ||
          savedGST > 0
        ) {

          revenue +=
            savedSubtotal + savedGST;

        }

        // -------------------------------------------------
        // VERY OLD SALES
        // -------------------------------------------------

        else {

          const calculatedGST =
            Math.round(
              saleSubtotal * 0.05
            );

          revenue +=
            saleSubtotal + calculatedGST;

        }

      }


      // =================================================
      // TOP SELLING MEDICINES
      // =================================================

      const topSelling =
        await Sale.aggregate([

          // ---------------------------------------------
          // SPLIT ITEMS
          // ---------------------------------------------

          {
            $unwind: '$items'
          },


          // ---------------------------------------------
          // GROUP BY MEDICINE
          // ---------------------------------------------

          {
            $group: {

              _id:
                '$items.medicine',

              medicineName: {
                $first:
                  '$items.medicineName'
              },

              unitsSold: {
                $sum: {
                  $ifNull: [
                    '$items.quantity',
                    0
                  ]
                }
              },

              // Use item.total if available.
              // Otherwise price × quantity.
              revenue: {
                $sum: {

                  $cond: [

                    {
                      $gt: [
                        {
                          $ifNull: [
                            '$items.total',
                            0
                          ]
                        },
                        0
                      ]
                    },

                    '$items.total',

                    {
                      $multiply: [

                        {
                          $ifNull: [
                            '$items.price',
                            0
                          ]
                        },

                        {
                          $ifNull: [
                            '$items.quantity',
                            0
                          ]
                        }

                      ]
                    }

                  ]

                }
              }

            }

          },


          // ---------------------------------------------
          // SORT BY UNITS SOLD
          // ---------------------------------------------

          {
            $sort: {
              unitsSold: -1
            }
          },


          // ---------------------------------------------
          // TOP 5
          // ---------------------------------------------

          {
            $limit: 5
          }

        ]);


      // =================================================
      // ADD RANK
      // =================================================

      const rankedTopSelling =
        topSelling.map(
          (item, index) => ({

            rank:
              index + 1,

            medicineId:
              item._id,

            medicineName:
              item.medicineName,

            unitsSold:
              Number(
                item.unitsSold || 0
              ),

            revenue:
              Number(
                (item.revenue || 0)
                  .toFixed(2)
              )

          })
        );


      // =================================================
      // SEND RESPONSE
      // =================================================

      res.json({

        success: true,

        summary: {

          totalBills:
            totalBills,

          unitsSold:
            unitsSold,

          revenue:
            Number(
              revenue.toFixed(2)
            ),

          profit:
            Number(
              profit.toFixed(2)
            )

        },

        topSelling:
          rankedTopSelling

      });


    } catch (err) {

      console.log(
        'Sales analytics error:',
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


// =====================================================
// GET ALL SALES
// =====================================================

router.get(
  '/',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const sales =
        await Sale.find()
          .sort({
            createdAt: -1
          });

      res.json(sales);

    } catch (err) {

      console.log(
        'Get sales error:',
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
// CREATE SALE
// =====================================================

router.post(
  '/',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const {
        customerName,
        items
      } = req.body;


      // -------------------------------------------------
      // CUSTOMER VALIDATION
      // -------------------------------------------------

      if (
        !customerName ||
        !customerName.trim()
      ) {

        return res.status(400).json({

          message:
            'Customer name is required'

        });

      }


      // -------------------------------------------------
      // ITEMS VALIDATION
      // -------------------------------------------------

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {

        return res.status(400).json({

          message:
            'No medicines added to bill'

        });

      }


      // -------------------------------------------------
      // VALIDATED ITEMS
      // -------------------------------------------------

      const validatedItems = [];

      let subtotal = 0;


      // =================================================
      // VALIDATE EACH MEDICINE
      // =================================================

      for (const item of items) {

        const quantity =
          Number(item.quantity);


        // -------------------------------------------------
        // MEDICINE ID
        // -------------------------------------------------

        if (!item.medicine) {

          return res.status(400).json({

            message:
              'Medicine ID is missing'

          });

        }


        // -------------------------------------------------
        // QUANTITY
        // -------------------------------------------------

        if (
          !Number.isInteger(quantity) ||
          quantity <= 0
        ) {

          return res.status(400).json({

            message:
              'Invalid medicine quantity'

          });

        }


        // -------------------------------------------------
        // FIND MEDICINE
        // -------------------------------------------------

        const medicine =
          await Medicine.findById(
            item.medicine
          );


        if (!medicine) {

          return res.status(404).json({

            message:
              'Medicine not found'

          });

        }


        // =================================================
        // BLOCK REMOVED MEDICINE
        // =================================================

        if (
          medicine.status === 'removed'
        ) {

          return res.status(400).json({

            message:
              `⛔ SALE BLOCKED: ${medicine.name} has been removed!`

          });

        }


        // =================================================
        // CHECK REAL EXPIRY DATE
        // =================================================

        const today =
          new Date();

        today.setHours(
          0,
          0,
          0,
          0
        );


        const expiry =
          new Date(
            medicine.expiryDate
          );

        expiry.setHours(
          0,
          0,
          0,
          0
        );


        if (
          expiry <= today
        ) {

          return res.status(400).json({

            message:
              `⛔ SALE BLOCKED: ${medicine.name} is expired!`

          });

        }


        // =================================================
        // CHECK STOCK
        // =================================================

        if (
          medicine.quantity < quantity
        ) {

          return res.status(400).json({

            message:
              `❌ Insufficient stock for ${medicine.name}.\n` +
              `Available: ${medicine.quantity}\n` +
              `Requested: ${quantity}`

          });

        }


        // =================================================
        // DATABASE SELLING PRICE
        // =================================================

        const price =
          Number(
            medicine.sellingPrice
          ) || 0;


        const itemTotal =
          price * quantity;


        subtotal +=
          itemTotal;


        // -------------------------------------------------
        // SAVE VALIDATED ITEM
        // -------------------------------------------------

        validatedItems.push({

          medicine:
            medicine._id,

          medicineName:
            medicine.name,

          batchNumber:
            medicine.batchNumber,

          quantity:
            quantity,

          price:
            price,

          total:
            itemTotal

        });

      }


      // =================================================
      // GST
      // =================================================

      const gst =
        Math.round(
          subtotal * 0.05
        );


      // =================================================
      // FINAL TOTAL
      // =================================================

      const total =
        subtotal + gst;


      // =================================================
      // DEDUCT STOCK
      // =================================================

      for (
        const item of validatedItems
      ) {

        const updatedMedicine =
          await Medicine.findOneAndUpdate(

            {
              _id:
                item.medicine,

              quantity: {
                $gte:
                  item.quantity
              }

            },

            {
              $inc: {
                quantity:
                  -item.quantity
              }

            },

            {
              new: true
            }

          );


        // -------------------------------------------------
        // STOCK CHANGED
        // -------------------------------------------------

        if (!updatedMedicine) {

          return res.status(400).json({

            message:
              '❌ Stock changed. Please refresh and try again.'

          });

        }

      }


      // =================================================
      // SAVE SALE
      // =================================================

      const sale =
        new Sale({

          customerName:
            customerName.trim(),

          items:
            validatedItems,

          subtotal:
            subtotal,

          gst:
            gst,

          total:
            total,

          soldBy:
            req.user.id

        });


      await sale.save();


      // =================================================
      // RESPONSE
      // =================================================

      res.status(201).json({

        message:
          '✅ Sale recorded successfully!',

        sale,

        subtotal:
          subtotal,

        gst:
          gst,

        total:
          total

      });


    } catch (err) {

      console.log(
        'Create sale error:',
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
// EXPORT ROUTER
// =====================================================

module.exports = router;