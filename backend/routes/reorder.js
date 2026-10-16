const express = require('express');
const router = express.Router();

const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');
const Reorder = require('../models/Reorder');

const auth = require('../middleware/auth');

const {
  pharmacyStaff
} = require('../middleware/rolePermissions');


// ============================================================
// REORDER SETTINGS
// ============================================================

// Physical stock <= 5 means low stock.
const LOW_STOCK_THRESHOLD = 5;

// When there is little/no sales history,
// maintain at least 10 units.
const MIN_TARGET_STOCK = 10;


// ============================================================
// HELPER — CHECK WHETHER MEDICINE IS EXPIRED
// ============================================================

function isExpiredMedicine(medicine) {
  if (!medicine) return false;

  // Explicit database status
  if (
    medicine.status === 'expired' ||
    medicine.status === 'removed'
  ) {
    return true;
  }

  // Also check expiryDate directly.
  // This protects against stale status values.
  if (medicine.expiryDate) {
    const expiry = new Date(medicine.expiryDate);

    if (!Number.isNaN(expiry.getTime())) {
      const today = new Date();

      today.setHours(0, 0, 0, 0);
      expiry.setHours(0, 0, 0, 0);

      if (expiry < today) {
        return true;
      }
    }
  }

  return false;
}


// ============================================================
// HELPER — CALCULATE REORDER FOR ONE MEDICINE
// ============================================================

async function calculateReorder(medicine) {
  const today = new Date();

  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(
    ninetyDaysAgo.getDate() - 90
  );


  // ==========================================================
  // 1. CURRENT PHYSICAL STOCK
  // ==========================================================

  const currentStock =
    Math.max(
      0,
      Number(medicine.quantity) || 0
    );


  // ==========================================================
  // 2. GET LAST 90 DAYS SALES
  // ==========================================================

  const sales = await Sale.find({
    createdAt: {
      $gte: ninetyDaysAgo
    }
  }).select('items createdAt');


  let soldLast90Days = 0;


  for (const sale of sales) {

    if (!Array.isArray(sale.items)) {
      continue;
    }


    for (const item of sale.items) {

      if (!item) {
        continue;
      }


      if (
        item.medicine &&
        item.medicine.toString() ===
          medicine._id.toString()
      ) {

        soldLast90Days +=
          Number(item.quantity) || 0;

      }
    }
  }


  // ==========================================================
  // 3. DEMAND CALCULATION
  // ==========================================================

  const dailyAverage =
    soldLast90Days / 90;


  const monthlyNeed =
    dailyAverage * 30;


  // ==========================================================
  // 4. FIND ACTIVE / INCOMING REORDER ORDERS
  // ==========================================================

  const activeOrders =
    await Reorder.find({

      medicine: medicine._id,

      status: {
        $in: [
          'pending',
          'ordered',
          'partially_received'
        ]
      }

    }).select(
      'quantity receivedQuantity status'
    );


  // ==========================================================
  // 5. CALCULATE OUTSTANDING INCOMING STOCK
  // ==========================================================

  const outstandingOrderQuantity =
    activeOrders.reduce(
      (total, order) => {

        const ordered =
          Number(order.quantity) || 0;

        const received =
          Number(order.receivedQuantity) || 0;


        const remaining =
          Math.max(
            0,
            ordered - received
          );


        return total + remaining;

      },
      0
    );


  // ==========================================================
  // 6. EFFECTIVE STOCK
  // ==========================================================
  //
  // Physical stock + stock already ordered
  // but not yet received.
  //
  // Example:
  //
  // Physical = 4
  // Incoming = 6
  //
  // Effective stock = 10
  //
  // Therefore no additional reorder is required.
  // ==========================================================

  const effectiveStock =
    currentStock +
    outstandingOrderQuantity;


  // ==========================================================
  // 7. STOCK COVERAGE
  // ==========================================================

  let stockLasts = 999;


  if (dailyAverage > 0) {

    stockLasts =
      effectiveStock /
      dailyAverage;

  }


  // ==========================================================
  // 8. TARGET STOCK
  // ==========================================================
  //
  // If there is sales history:
  //
  //     target = monthly demand
  //
  // But never allow target below 10.
  //
  // This is important for newly added medicines
  // which have zero sales history.
  // ==========================================================

  const targetStock =
    Math.max(
      Math.ceil(monthlyNeed),
      MIN_TARGET_STOCK
    );


  // ==========================================================
  // 9. NORMAL REORDER CALCULATION
  // ==========================================================

  let reorderQuantity =
    Math.max(
      0,
      Math.ceil(
        targetStock -
        effectiveStock
      )
    );


  // ==========================================================
  // 10. LOW STOCK FALLBACK
  // ==========================================================
  //
  // This is the important fix.
  //
  // Even when:
  //
  //     soldLast90Days = 0
  //     monthlyNeed = 0
  //
  // low stock still triggers reorder.
  //
  // Example:
  //
  // Montelukast:
  // stock = 4
  // incoming = 0
  //
  // target = 10
  // reorder = 10 - 4 = 6
  //
  // Pantoprazole:
  // stock = 3
  // incoming = 0
  //
  // target = 10
  // reorder = 10 - 3 = 7
  //
  // If enough stock is already incoming,
  // we don't create another low-stock fallback order.
  // ==========================================================

  if (
    currentStock <= LOW_STOCK_THRESHOLD &&
    outstandingOrderQuantity === 0
  ) {

    const lowStockReorder =
      Math.max(
        0,
        MIN_TARGET_STOCK -
        currentStock
      );


    reorderQuantity =
      Math.max(
        reorderQuantity,
        lowStockReorder
      );
  }


  // ==========================================================
  // 11. PRIORITY
  // ==========================================================

  let priority = 'LOW';


  // Critical
  if (
    currentStock <= 2 ||
    stockLasts <= 7
  ) {

    priority = 'HIGH';

  }

  // Low stock / running out soon
  else if (
    currentStock <= LOW_STOCK_THRESHOLD ||
    stockLasts <= 30
  ) {

    priority = 'MEDIUM';

  }


  // ==========================================================
  // 12. RETURN RESULT
  // ==========================================================

  return {

    medicineId:
      medicine._id,

    name:
      medicine.name,

    brand:
      medicine.brand,

    category:
      medicine.category,

    batchNumber:
      medicine.batchNumber,

    currentStock,

    soldLast90Days,

    dailyAverage,

    monthlyNeed,

    targetStock,

    stockLasts,

    reorderQuantity,

    priority,

    supplier:
      medicine.supplier,

    purchasePrice:
      Number(medicine.purchasePrice) || 0,

    sellingPrice:
      Number(medicine.sellingPrice) || 0,

    expiryDate:
      medicine.expiryDate,

    qrCode:
      medicine.qrCode,

    outstandingOrderQuantity,

    effectiveStock
  };
}


// ============================================================
// GET AI REORDER SUGGESTIONS
// GET /api/reorder/suggestions
// ============================================================

router.get(
  '/suggestions',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      // ======================================================
      // GET ACTIVE MEDICINES
      // ======================================================

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


      // ======================================================
      // CALCULATE EVERY MEDICINE
      // ======================================================

      for (
        const medicine of medicines
      ) {

        // Safety check using expiryDate too.
        if (
          isExpiredMedicine(medicine)
        ) {
          continue;
        }


        const result =
          await calculateReorder(
            medicine
          );


        // Only medicines requiring
        // additional stock.
        if (
          result.reorderQuantity > 0
        ) {

          suggestions.push(
            result
          );

        }
      }


      // ======================================================
      // SORT BY PRIORITY
      // ======================================================

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


      // ======================================================
      // SUMMARY
      // ======================================================

      const summary = {

        totalMedicines:
          medicines.filter(
            medicine =>
              !isExpiredMedicine(
                medicine
              )
          ).length,

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


      // ======================================================
      // RESPONSE
      // ======================================================

      return res.json({

        success: true,

        summary,

        suggestions

      });

    }

    catch (err) {

      console.error(
        '❌ Reorder suggestion error:',
        err
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to generate reorder suggestions',

        error:
          err.message

      });

    }

  }
);


// ============================================================
// GET SINGLE MEDICINE REORDER SUGGESTION
// GET /api/reorder/suggestions/:medicineId
// ============================================================

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


      // ======================================================
      // EXPIRED / REMOVED CHECK
      // ======================================================

      if (
        isExpiredMedicine(medicine)
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Expired or removed medicine cannot be reordered'

        });

      }


      const result =
        await calculateReorder(
          medicine
        );


      return res.json({

        success: true,

        suggestion:
          result

      });

    }

    catch (err) {

      console.error(
        '❌ Single reorder error:',
        err
      );


      return res.status(500).json({

        success: false,

        message:
          err.message

      });

    }

  }
);


// ============================================================
// PLACE REORDER
// POST /api/reorder/orders
// ============================================================

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


      // ======================================================
      // VALIDATION
      // ======================================================

      if (!medicineId) {

        return res.status(400).json({

          success: false,

          message:
            'Medicine ID is required'

        });

      }


      const orderQuantity =
        Number(quantity);


      if (
        !Number.isInteger(
          orderQuantity
        ) ||
        orderQuantity <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Valid order quantity is required'

        });

      }


      // ======================================================
      // FIND MEDICINE
      // ======================================================

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


      // ======================================================
      // PREVENT EXPIRED / REMOVED ORDER
      // ======================================================

      if (
        isExpiredMedicine(medicine)
      ) {

        return res.status(400).json({

          success: false,

          message:
            'Cannot reorder expired or removed medicine'

        });

      }


      // ======================================================
      // PREVENT DUPLICATE FULL ORDER
      // ======================================================
      //
      // If there is already enough incoming stock to
      // reach the target, don't create another order.
      // ======================================================

      const calculation =
        await calculateReorder(
          medicine
        );


      if (
        calculation.outstandingOrderQuantity > 0 &&
        orderQuantity >
          calculation.reorderQuantity
      ) {

        return res.status(400).json({

          success: false,

          message:
            `Only ${calculation.reorderQuantity} additional units are currently recommended`,
          
          suggestion:
            calculation

        });

      }


      // ======================================================
      // CREATE REORDER
      // ======================================================

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
            orderQuantity,

          receivedQuantity:
            0,

          currentStock:
            Number(
              medicine.quantity
            ) || 0,

          priority:
            priority ||
            calculation.priority ||
            'MEDIUM',

          status:
            'pending',

          orderedBy:
            req.user?.id ||
            req.user?._id

        });


      await reorder.save();


      console.log(
        `📦 Reorder created: ${medicine.name} × ${orderQuantity}`
      );


      return res.status(201).json({

        success: true,

        message:
          `Order placed for ${orderQuantity} units`,

        order:
          reorder

      });

    }

    catch (err) {

      console.error(
        '❌ Place reorder error:',
        err
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to place reorder',

        error:
          err.message

      });

    }

  }
);


// ============================================================
// GET REORDER HISTORY
// GET /api/reorder/orders
// ============================================================

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


      return res.json({

        success: true,

        count:
          orders.length,

        orders

      });

    }

    catch (err) {

      console.error(
        '❌ Reorder history error:',
        err
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to fetch reorder history',

        error:
          err.message

      });

    }

  }
);


// ============================================================
// CLEAR REORDER HISTORY
// DELETE /api/reorder/orders/history
// ============================================================
//
// Deletes ONLY Reorder documents.
// Medicines and their stock are NOT deleted.
// ============================================================

router.delete(
  '/orders/history',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      const result =
        await Reorder.deleteMany({});


      console.log(
        `🗑️ Reorder history cleared: ${result.deletedCount} records`
      );


      return res.json({

        success: true,

        message:
          'Reorder history cleared successfully',

        deletedCount:
          result.deletedCount

      });

    }

    catch (err) {

      console.error(
        '❌ Clear reorder history error:',
        err
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to clear reorder history',

        error:
          err.message

      });

    }

  }
);


// ============================================================
// UPDATE ORDER STATUS + RECEIVE STOCK
// PUT /api/reorder/orders/:id
// ============================================================

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


      // ======================================================
      // ALLOWED STATUSES
      // ======================================================

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


      // ======================================================
      // FIND ORDER
      // ======================================================

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


      // ======================================================
      // CANCEL ORDER
      // ======================================================

      if (
        status === 'cancelled'
      ) {

        if (
          order.status === 'received' ||
          order.status ===
            'partially_received'
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


      // ======================================================
      // PENDING / ORDERED
      // ======================================================

      if (
        status === 'pending' ||
        status === 'ordered'
      ) {

        if (
          order.status === 'received' ||
          order.status ===
            'partially_received'
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


      // ======================================================
      // RECEIVE STOCK
      // ======================================================

      if (
        status ===
          'partially_received' ||
        status === 'received'
      ) {

        const totalReceived =
          Number(
            receivedQuantity
          );


        // ====================================================
        // VALIDATE RECEIVED QUANTITY
        // ====================================================

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


        // ====================================================
        // CANNOT RECEIVE MORE THAN ORDERED
        // ====================================================

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


        // ====================================================
        // RECEIVED QUANTITY CANNOT DECREASE
        // ====================================================

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


        // ====================================================
        // NEWLY RECEIVED STOCK
        // ====================================================

        const receivedNow =
          totalReceived -
          oldReceivedQuantity;


        // ====================================================
        // RECEIVED = FULL QUANTITY
        // ====================================================

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


        // ====================================================
        // PARTIALLY RECEIVED
        // ====================================================

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


        // ====================================================
        // FIND MEDICINE
        // ====================================================

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


        // ====================================================
        // DO NOT RECEIVE EXPIRED / REMOVED MEDICINE
        // ====================================================

        if (
          isExpiredMedicine(
            medicine
          )
        ) {

          return res.status(400).json({

            success: false,

            message:
              'Cannot receive stock for expired or removed medicine'

          });

        }


        // ====================================================
        // ADD ONLY NEWLY RECEIVED STOCK
        // ====================================================

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


        // ====================================================
        // UPDATE REORDER
        // ====================================================

        order.receivedQuantity =
          totalReceived;

        order.status =
          status;

        order.updatedAt =
          new Date();


        await order.save();


        // ====================================================
        // RESPONSE
        // ====================================================

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

      console.error(
        '❌ Update reorder error:',
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


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;