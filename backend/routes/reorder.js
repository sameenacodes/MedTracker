const express = require('express');

const router = express.Router();

const Medicine = require('../models/Medicine');

const Sale = require('../models/Sale');

const Reorder = require('../models/Reorder');

const auth = require('../middleware/auth');

const {
  pharmacyStaff
} = require('../middleware/rolePermissions');



// ═════════════════════════════════════════════
// HELPER — CALCULATE REORDER FOR MEDICINE
// ═════════════════════════════════════════════

async function calculateReorder(medicine) {
  const today = new Date();

  const ninetyDaysAgo = new Date();

  ninetyDaysAgo.setDate(today.getDate() - 90);



  // Get sales from the last 90 days.
  const sales = await Sale.find({
    createdAt: {
      $gte: ninetyDaysAgo,
    },
  });



  let soldLast90Days = 0;



  for (const sale of sales) {
    if (!sale.items) continue;



    for (const item of sale.items) {
      if (
        item.medicine &&
        item.medicine.toString() === medicine._id.toString()
      ) {
        soldLast90Days += Number(item.quantity) || 0;
      }
    }
  }



  // AI calculations.
  const dailyAverage = soldLast90Days / 90;

  const monthlyNeed = dailyAverage * 30;

  const currentStock = Number(medicine.quantity) || 0;



  // ═════════════════════════════════════════════
  // IMPORTANT
  // Count already placed orders as incoming stock.
  //
  // This prevents a medicine from appearing again
  // in AI Reorder when an order is already pending,
  // ordered, or partially received.
  // ═════════════════════════════════════════════

  const activeOrders = await Reorder.find({
    medicine: medicine._id,

    status: {
      $in: [
        'pending',
        'ordered',
        'partially_received'
      ],
    },

  }).select(
    'quantity receivedQuantity status'
  );



  // Calculate only the quantity that has
  // NOT yet been received.

  const outstandingOrderQuantity =
    activeOrders.reduce(
      (total, order) => {

        const ordered =
          Number(order.quantity) || 0;

        const received =
          Number(order.receivedQuantity) || 0;

        return (
          total +
          Math.max(
            0,
            ordered - received
          )
        );

      },
      0
    );



  // ═════════════════════════════════════════════
  // CURRENT STOCK + INCOMING STOCK
  // ═════════════════════════════════════════════

  const effectiveStock =
    currentStock +
    outstandingOrderQuantity;



  let stockLasts = 999;



  if (dailyAverage > 0) {
    stockLasts =
      effectiveStock /
      dailyAverage;
  }



  // ═════════════════════════════════════════════
  // REORDER QUANTITY
  // ═════════════════════════════════════════════

  const reorderQuantity =
    Math.max(
      0,
      Math.ceil(
        monthlyNeed -
        effectiveStock
      )
    );



  // ═════════════════════════════════════════════
  // PRIORITY
  // ═════════════════════════════════════════════

  let priority = 'LOW';



  if (stockLasts <= 7) {
    priority = 'HIGH';

  } else if (stockLasts <= 30) {
    priority = 'MEDIUM';
  }



  return {
    medicineId: medicine._id,

    name: medicine.name,

    brand: medicine.brand,

    category: medicine.category,

    batchNumber: medicine.batchNumber,

    currentStock,

    soldLast90Days,

    dailyAverage,

    monthlyNeed,

    stockLasts,

    reorderQuantity,

    priority,

    supplier: medicine.supplier,

    purchasePrice:
      medicine.purchasePrice,

    sellingPrice:
      medicine.sellingPrice,

    expiryDate:
      medicine.expiryDate,

    qrCode:
      medicine.qrCode,

    // Extra information for debugging
    // and UI if needed.

    outstandingOrderQuantity,

    effectiveStock,
  };
}



// ═════════════════════════════════════════════
// GET AI REORDER SUGGESTIONS
// GET /api/reorder/suggestions
// ═════════════════════════════════════════════

router.get(
  '/suggestions',

  auth,

  pharmacyStaff,

  async (req, res) => {

    try {

      // Get active medicines only.

      const medicines =
        await Medicine.find({

          status: {
            $nin: [
              'expired',
              'removed'
            ]
          }

        });



      const suggestions = [];



      // Calculate reorder for every medicine.

      for (
        const medicine of medicines
      ) {

        const result =
          await calculateReorder(
            medicine
          );



        // Only medicines that actually
        // need additional stock.

        if (
          result.reorderQuantity > 0
        ) {

          suggestions.push(
            result
          );

        }

      }



      // ═══════════════════════════════════════
      // SORT BY PRIORITY
      // ═══════════════════════════════════════

      const priorityOrder = {

        HIGH: 1,

        MEDIUM: 2,

        LOW: 3

      };



      suggestions.sort(
        (a, b) =>
          priorityOrder[a.priority] -
          priorityOrder[b.priority]
      );



      // ═══════════════════════════════════════
      // SUMMARY
      // ═══════════════════════════════════════

      const summary = {

        totalMedicines:
          medicines.length,

        needReorder:
          suggestions.length,

        highPriority:
          suggestions.filter(
            item =>
              item.priority === 'HIGH'
          ).length,

        mediumPriority:
          suggestions.filter(
            item =>
              item.priority === 'MEDIUM'
          ).length,

        lowPriority:
          suggestions.filter(
            item =>
              item.priority === 'LOW'
          ).length

      };



      res.json({

        success: true,

        summary,

        suggestions

      });



    }

    catch (err) {

      console.log(
        '❌ Reorder suggestion error:',
        err.message
      );



      res.status(500).json({

        success: false,

        message:
          'Failed to generate reorder suggestions',

        error:
          err.message

      });

    }

  }

);



// ═════════════════════════════════════════════
// GET SINGLE MEDICINE REORDER SUGGESTION
// GET /api/reorder/suggestions/:medicineId
// ═════════════════════════════════════════════

router.get(
  '/suggestions/:medicineId',

  auth,

  pharmacyStaff,

  async (req, res) => {

    try {

      const medicine =
        await Medicine.findById(
          req.params.medicineId
        );



      if (!medicine) {

        return res.status(404).json({

          success: false,

          message:
            'Medicine not found'

        });

      }



      const result =
        await calculateReorder(
          medicine
        );



      res.json({

        success: true,

        suggestion:
          result

      });



    }

    catch (err) {

      res.status(500).json({

        success: false,

        message:
          err.message

      });

    }

  }

);



// ═════════════════════════════════════════════
// PLACE REORDER
// POST /api/reorder/orders
// ═════════════════════════════════════════════

router.post(
  '/orders',

  auth,

  pharmacyStaff,

  async (req, res) => {

    try {

      const {
        medicineId,
        quantity,
        priority
      } = req.body;



      // ═══════════════════════════════════════
      // DEBUG LOGS
      // ═══════════════════════════════════════

      console.log(
        '================================'
      );

      console.log(
        '📦 PLACE REORDER REQUEST'
      );

      console.log(
        'Medicine ID:',
        medicineId
      );

      console.log(
        'Quantity:',
        quantity
      );

      console.log(
        'Priority:',
        priority
      );

      console.log(
        'User ID:',
        req.user?.id ||
        req.user?._id
      );

      console.log(
        'User Role:',
        req.user?.role
      );

      console.log(
        '================================'
      );



      // ═══════════════════════════════════════
      // VALIDATION
      // ═══════════════════════════════════════

      if (!medicineId) {

        return res.status(400).json({

          success: false,

          message:
            'Medicine ID is required'

        });

      }



      if (
        !quantity ||
        Number(quantity) <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Valid order quantity is required'

        });

      }



      // ═══════════════════════════════════════
      // FIND MEDICINE
      // ═══════════════════════════════════════

      const medicine =
        await Medicine.findById(
          medicineId
        );



      if (!medicine) {

        return res.status(404).json({

          success: false,

          message:
            'Medicine not found'

        });

      }



      // ═══════════════════════════════════════
      // PREVENT ORDER FOR EXPIRED / REMOVED
      // ═══════════════════════════════════════

      if (
        medicine.status === 'expired' ||
        medicine.status === 'removed'
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Cannot reorder expired or removed medicine'

        });

      }



      // ═══════════════════════════════════════
      // CREATE REORDER
      // ═══════════════════════════════════════

      const reorder =
        new Reorder({

          medicine:
            medicine._id,

          medicineName:
            medicine.name,

          supplier:
            medicine.supplier ||
            'Not specified',

          quantity:
            Number(quantity),

          currentStock:
            medicine.quantity,

          priority:
            priority ||
            'MEDIUM',

          status:
            'pending',

          orderedBy:
            req.user?.id ||
            req.user?._id

        });



      await reorder.save();



      console.log(
        `📦 Reorder created: ${medicine.name} × ${quantity}`
      );



      res.status(201).json({

        success: true,

        message:
          `✅ Order placed for ${quantity} units`,

        order:
          reorder

      });



    }

    catch (err) {

      console.log(
        '❌ Place reorder error:',
        err.message
      );

      console.log(
        '❌ Full error:',
        err
      );



      res.status(500).json({

        success: false,

        message:
          'Failed to place reorder',

        error:
          err.message

      });

    }

  }

);



// ═════════════════════════════════════════════
// GET REORDER HISTORY
// GET /api/reorder/orders
// ═════════════════════════════════════════════

router.get(
  '/orders',

  auth,

  pharmacyStaff,

  async (req, res) => {

    try {

      const orders =
        await Reorder.find()

          .populate(
            'medicine',
            'name brand batchNumber'
          )

          .populate(
            'orderedBy',
            'name email'
          )

          .sort({
            createdAt: -1
          });



      res.json({

        success: true,

        count:
          orders.length,

        orders

      });



    }

    catch (err) {

      console.log(
        '❌ Reorder history error:',
        err.message
      );



      res.status(500).json({

        success: false,

        message:
          'Failed to fetch reorder history',

        error:
          err.message

      });

    }

  }

);



// ═════════════════════════════════════════════
// UPDATE ORDER STATUS + RECEIVE STOCK
// PUT /api/reorder/orders/:id
// ═════════════════════════════════════════════

router.put(
  '/orders/:id',

  auth,

  pharmacyStaff,

  async (req, res) => {

    try {

      const {
        status,
        receivedQuantity
      } = req.body;



      // ═══════════════════════════════════════
      // ALLOWED STATUSES
      // ═══════════════════════════════════════

      const allowedStatuses = [
        'pending',
        'ordered',
        'partially_received',
        'received',
        'cancelled'
      ];



      if (
        !allowedStatuses.includes(
          status
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid order status'

        });

      }



      // ═══════════════════════════════════════
      // FIND REORDER
      // ═══════════════════════════════════════

      const order =
        await Reorder.findById(
          req.params.id
        );



      if (!order) {

        return res.status(404).json({

          success: false,

          message:
            'Reorder not found'

        });

      }



      // ═══════════════════════════════════════
      // CANCEL ORDER
      // ═══════════════════════════════════════

      if (
        status === 'cancelled'
      ) {

        if (
          order.status === 'received' ||
          order.status === 'partially_received'
        ) {

          return res.status(400).json({

            success: false,

            message:
              'Received orders cannot be cancelled'

          });

        }



        order.status =
          'cancelled';

        order.updatedAt =
          new Date();



        await order.save();



        return res.json({

          success: true,

          message:
            'Order cancelled successfully',

          order

        });

      }



      // ═══════════════════════════════════════
      // PENDING / ORDERED
      // ═══════════════════════════════════════

      if (
        status === 'pending' ||
        status === 'ordered'
      ) {

        if (
          order.status === 'received' ||
          order.status === 'partially_received'
        ) {

          return res.status(400).json({

            success: false,

            message:
              'Received order status cannot be moved backwards'

          });

        }



        order.status =
          status;

        order.updatedAt =
          new Date();



        await order.save();



        return res.json({

          success: true,

          message:
            `Order marked as ${status}`,

          order

        });

      }



      // ═══════════════════════════════════════
      // RECEIVE STOCK
      // ═══════════════════════════════════════

      if (
        status === 'partially_received' ||
        status === 'received'
      ) {

        const totalReceived =
          Number(
            receivedQuantity
          );



        // Validate received quantity

        if (
          !Number.isInteger(
            totalReceived
          ) ||
          totalReceived < 0
        ) {

          return res.status(400).json({

            success: false,

            message:
              'Valid received quantity is required'

          });

        }



        // Cannot receive more than ordered

        if (
          totalReceived >
          order.quantity
        ) {

          return res.status(400).json({

            success: false,

            message:
              `Cannot receive more than ordered quantity (${order.quantity})`

          });

        }



        const oldReceivedQuantity =
          Number(
            order.receivedQuantity
          ) || 0;



        // Cannot decrease received quantity

        if (
          totalReceived <
          oldReceivedQuantity
        ) {

          return res.status(400).json({

            success: false,

            message:
              'Received quantity cannot be decreased'

          });

        }



        // Calculate newly received stock

        const receivedNow =
          totalReceived -
          oldReceivedQuantity;



        // Received status requires full quantity

        if (
          status === 'received' &&
          totalReceived !==
            order.quantity
        ) {

          return res.status(400).json({

            success: false,

            message:
              `To mark as received, receive all ${order.quantity} units`

          });

        }



        // Partial status cannot equal full quantity

        if (
          status ===
            'partially_received' &&
          totalReceived >=
            order.quantity
        ) {

          return res.status(400).json({

            success: false,

            message:
              'Use received status when all units are received'

          });

        }



        // ═══════════════════════════════════
        // FIND MEDICINE
        // ═══════════════════════════════════

        const medicine =
          await Medicine.findById(
            order.medicine
          );



        if (!medicine) {

          return res.status(404).json({

            success: false,

            message:
              'Medicine associated with this order was not found'

          });

        }



        // Prevent stock receiving for removed/expired medicine

        if (
          medicine.status ===
            'expired' ||
          medicine.status ===
            'removed'
        ) {

          return res.status(400).json({

            success: false,

            message:
              'Cannot receive stock for expired or removed medicine'

          });

        }



        // ═══════════════════════════════════
        // UPDATE MEDICINE STOCK
        // ═══════════════════════════════════

        if (
          receivedNow > 0
        ) {

          const oldStock =
            Number(
              medicine.quantity
            ) || 0;



          medicine.quantity =
            oldStock +
            receivedNow;



          await medicine.save();



          console.log(
            `📦 Stock received: ${medicine.name} +${receivedNow}`
          );



          console.log(
            `📊 New stock: ${medicine.quantity}`
          );

        }



        // ═══════════════════════════════════
        // UPDATE REORDER
        // ═══════════════════════════════════

        order.receivedQuantity =
          totalReceived;



        order.status =
          status;



        order.updatedAt =
          new Date();



        await order.save();



        // ═══════════════════════════════════
        // RESPONSE
        // ═══════════════════════════════════

        return res.json({

          success: true,

          message:
            status === 'received'

              ? `✅ ${receivedNow} units received. Order completed.`

              : `📦 ${receivedNow} units received. Order partially received.`,

          receivedNow,

          totalReceived,

          orderedQuantity:
            order.quantity,

          newStock:
            medicine.quantity,

          order

        });

      }

    }

    catch (err) {

      console.log(
        '❌ Update reorder error:',
        err.message
      );



      console.log(
        '❌ Full error:',
        err
      );



      return res.status(500).json({

        success: false,

        message:
          'Failed to update reorder',

        error:
          err.message

      });

    }

  }

);



module.exports = router;