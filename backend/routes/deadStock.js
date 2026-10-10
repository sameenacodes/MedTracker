const express = require('express');
const router = express.Router();

const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');
const auth = require('../middleware/auth');
const {
  pharmacyStaff
} = require('../middleware/rolePermissions');
// =====================================================
// DEAD STOCK DETECTION
//
// DEAD STOCK = no units sold in the last 90 days.
// SLOW MOVING = has sales, but current stock is expected
// to last more than 90 days at the 90-day average demand.
// =====================================================

router.get(
  '/',
  auth,
  pharmacyStaff,
  async (req, res) => {
  try {
    // =================================================
    // GET ACTIVE MEDICINES
    // =================================================

    const medicines = await Medicine.find({
      status: { $ne: 'removed' },
    }).sort({ createdAt: -1 });

    // =================================================
    // DATE RANGE — LAST 90 DAYS
    // =================================================

    const today = new Date();

    const ninetyDaysAgo = new Date(today);

    ninetyDaysAgo.setDate(
      ninetyDaysAgo.getDate() - 90
    );

    // =================================================
    // GET SALES FROM LAST 90 DAYS
    // =================================================

    const sales = await Sale.find({
      createdAt: {
        $gte: ninetyDaysAgo,
      },
    }).sort({
      createdAt: 1,
    });

    // =================================================
    // SALES CALCULATION MAPS
    // =================================================

    const salesByMedicine = new Map();

    const lastSaleByMedicine = new Map();

    // =================================================
    // PROCESS SALES
    // =================================================

    for (const sale of sales) {
      const saleDate = sale.createdAt
        ? new Date(sale.createdAt)
        : null;

      if (
        !saleDate ||
        Number.isNaN(saleDate.getTime())
      ) {
        continue;
      }

      for (const item of sale.items || []) {
        if (!item.medicine) {
          continue;
        }

        const medicineId =
          item.medicine.toString();

        const quantity =
          Number(item.quantity) || 0;

        // ---------------------------------------------
        // TOTAL SOLD QUANTITY
        // ---------------------------------------------

        salesByMedicine.set(
          medicineId,
          (
            salesByMedicine.get(medicineId) || 0
          ) + quantity
        );

        // ---------------------------------------------
        // LAST SALE DATE
        // ---------------------------------------------

        const previousDate =
          lastSaleByMedicine.get(
            medicineId
          );

        if (
          !previousDate ||
          saleDate > previousDate
        ) {
          lastSaleByMedicine.set(
            medicineId,
            saleDate
          );
        }
      }
    }

    // =================================================
    // ANALYZE EACH MEDICINE
    // =================================================

    const result = [];

    for (const medicine of medicines) {
      const medicineId =
        medicine._id.toString();

      const currentStock =
        Number(medicine.quantity) || 0;

      const soldLast90Days =
        salesByMedicine.get(medicineId) || 0;

      // ---------------------------------------------
      // DAILY AVERAGE SALES
      // ---------------------------------------------

      const dailyAverage =
        soldLast90Days / 90;

      // ---------------------------------------------
      // STOCK COVER DAYS
      // ---------------------------------------------

      let stockCoverDays = null;

      if (dailyAverage > 0) {
        stockCoverDays =
          currentStock / dailyAverage;
      }

      // ---------------------------------------------
      // LAST SALE
      // ---------------------------------------------

      const lastSaleDate =
        lastSaleByMedicine.get(
          medicineId
        ) || null;

      // ---------------------------------------------
      // DAYS SINCE LAST SALE
      // ---------------------------------------------

      let daysSinceLastSale = null;

      if (lastSaleDate) {
        daysSinceLastSale =
          Math.max(
            0,
            Math.floor(
              (today - lastSaleDate) /
                (1000 * 60 * 60 * 24)
            )
          );
      }

      // ---------------------------------------------
      // CLASSIFICATION
      // ---------------------------------------------

      let type = 'NORMAL';

      // No sales during last 90 days
      if (
        currentStock > 0 &&
        soldLast90Days === 0
      ) {
        type = 'DEAD';
      }

      // Sales exist, but stock will last > 90 days
      else if (
        currentStock > 0 &&
        soldLast90Days > 0 &&
        stockCoverDays > 90
      ) {
        type = 'SLOW';
      }

      // Normal medicines are not included
      if (type === 'NORMAL') {
        continue;
      }

      // ---------------------------------------------
      // STOCK VALUE
      // ---------------------------------------------

      const stockValue =
        currentStock *
        (
          Number(
            medicine.purchasePrice
          ) || 0
        );

      const sellingValue =
        currentStock *
        (
          Number(
            medicine.sellingPrice
          ) || 0
        );

      // ---------------------------------------------
      // RESULT OBJECT
      // ---------------------------------------------

      result.push({
        id: medicine._id,

        medicineId: medicine._id,

        name:
          medicine.name,

        brand:
          medicine.brand || '',

        category:
          medicine.category || '',

        batchNumber:
          medicine.batchNumber || '',

        supplier:
          medicine.supplier || '',

        rackNumber:
          medicine.rackNumber || '',

        shelfNumber:
          medicine.shelfNumber || '',

        boxNumber:
          medicine.boxNumber || '',

        currentStock,

        soldLast90Days,

        dailyAverage:
          Number(
            dailyAverage.toFixed(2)
          ),

        stockCoverDays:
          stockCoverDays === null
            ? null
            : Number(
                stockCoverDays.toFixed(1)
              ),

        lastSaleDate,

        daysSinceLastSale,

        purchasePrice:
          Number(
            medicine.purchasePrice
          ) || 0,

        sellingPrice:
          Number(
            medicine.sellingPrice
          ) || 0,

        stockValue:
          Number(
            stockValue.toFixed(2)
          ),

        sellingValue:
          Number(
            sellingValue.toFixed(2)
          ),

        expiryDate:
          medicine.expiryDate,

        status:
          medicine.status,

        type,
      });
    }

    // =================================================
    // SORT
    // DEAD → SLOW
    // HIGH VALUE FIRST
    // =================================================

    result.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'DEAD'
          ? -1
          : 1;
      }

      return (
        b.stockValue -
        a.stockValue
      );
    });

    // =================================================
    // SEPARATE DEAD / SLOW
    // =================================================

    const deadStock =
      result.filter(
        (item) =>
          item.type === 'DEAD'
      );

    const slowMoving =
      result.filter(
        (item) =>
          item.type === 'SLOW'
      );

    // =================================================
    // DEAD STOCK VALUE
    // =================================================

    const deadStockValue =
      deadStock.reduce(
        (sum, item) =>
          sum + item.stockValue,
        0
      );

    // =================================================
    // SLOW MOVING VALUE
    // =================================================

    const slowMovingValue =
      slowMoving.reduce(
        (sum, item) =>
          sum + item.stockValue,
        0
      );

    // =================================================
    // DEAD STOCK UNITS
    // =================================================

    const totalDeadUnits =
      deadStock.reduce(
        (sum, item) =>
          sum + item.currentStock,
        0
      );

    // =================================================
    // SLOW MOVING UNITS
    // =================================================

    const totalSlowUnits =
      slowMoving.reduce(
        (sum, item) =>
          sum + item.currentStock,
        0
      );

    // =================================================
    // FINAL RESPONSE
    // =================================================

    const response = {
      success: true,

      criteria: {
        deadStock:
          'No units sold in the last 90 days',

        slowMoving:
          'Stock is expected to last more than 90 days at the 90-day average demand',
      },

      summary: {
        totalItems:
          result.length,

        deadStockCount:
          deadStock.length,

        slowMovingCount:
          slowMoving.length,

        totalDeadUnits,

        totalSlowUnits,

        deadStockValue:
          Number(
            deadStockValue.toFixed(2)
          ),

        slowMovingValue:
          Number(
            slowMovingValue.toFixed(2)
          ),

        totalAtRiskValue:
          Number(
            (
              deadStockValue +
              slowMovingValue
            ).toFixed(2)
          ),
      },

      items: result,
    };

    return res.json(
      response
    );

  } catch (error) {
    console.error(
      'Dead stock error:',
      error
    );

    return res.status(500).json({
      success: false,

      message:
        'Failed to detect dead stock',

      error:
        error.message,
    });
  }
});

module.exports = router;