const express = require('express');

const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');
const auth = require('../middleware/auth');
const {
  pharmacyStaff
} = require('../middleware/rolePermissions');

const router = express.Router();

// =====================================================
// HELPERS
// =====================================================

const roundMoney = (value) => {
  return Math.round(
    (Number(value || 0) + Number.EPSILON) * 100
  ) / 100;
};

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const startOfMonth = (date = new Date()) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfYear = (date = new Date()) => {
  const d = new Date(date);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
};


// =====================================================
// BUSINESS ANALYTICS
// =====================================================

router.get(
  '/',
  auth,
  pharmacyStaff,
  async (req, res) => {
    try {
      const now = new Date();

    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    // -------------------------------------------------
    // GET SALES
    // -------------------------------------------------

    const sales = await Sale.find({
      createdAt: {
        $gte: yearStart,
        $lte: now,
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    // -------------------------------------------------
    // GET MEDICINES
    // -------------------------------------------------

    const medicines = await Medicine.find({
      status: { $ne: 'removed' },
    }).lean();

    // =================================================
    // OVERALL SALES
    // =================================================

    let totalRevenue = 0;
    let totalProfit = 0;
    let totalBills = 0;
    let totalUnitsSold = 0;

    let todayRevenue = 0;
    let todayProfit = 0;
    let todayBills = 0;
    let todayUnitsSold = 0;

    let monthRevenue = 0;
    let monthProfit = 0;
    let monthBills = 0;
    let monthUnitsSold = 0;

    // =================================================
    // TOP SELLING MEDICINES
    // =================================================

    const medicineSalesMap = {};

    // =================================================
    // CATEGORY SALES
    // =================================================

    const categorySalesMap = {};

    // =================================================
    // DAILY SALES
    // =================================================

    const dailySalesMap = {};

    // =================================================
    // PROCESS SALES
    // =================================================

    for (const sale of sales) {
      const saleDate = new Date(sale.createdAt);

      const isToday =
        saleDate >= todayStart &&
        saleDate <= todayEnd;

      const isThisMonth =
        saleDate >= monthStart &&
        saleDate <= now;

      let saleRevenue = 0;
      let saleProfit = 0;
      let saleUnits = 0;

      // -----------------------------------------------
      // PROCESS SALE ITEMS
      // -----------------------------------------------

      if (Array.isArray(sale.items)) {
        for (const item of sale.items) {
          const quantity =
            Number(item.quantity) || 0;

          const price =
            Number(item.price) || 0;

          const itemTotal =
            Number(item.total) ||
            price * quantity;

          totalUnitsSold += quantity;

          saleUnits += quantity;

          totalRevenue += itemTotal;

          saleRevenue += itemTotal;

          // ---------------------------------------------
          // FIND MEDICINE FOR PROFIT / CATEGORY
          // ---------------------------------------------

          let medicine = null;

          if (item.medicine) {
            medicine = medicines.find(
              (medicineItem) =>
                medicineItem._id?.toString() ===
                item.medicine?.toString()
            );
          }

          const purchasePrice =
            Number(
              medicine?.purchasePrice || 0
            );

          const itemProfit =
            (price - purchasePrice) *
            quantity;

          totalProfit += itemProfit;

          saleProfit += itemProfit;

          // ---------------------------------------------
          // MEDICINE SALES
          // ---------------------------------------------

          const medicineName =
            item.medicineName ||
            medicine?.name ||
            'Unknown Medicine';

          if (!medicineSalesMap[medicineName]) {
            medicineSalesMap[medicineName] = {
              name: medicineName,
              unitsSold: 0,
              revenue: 0,
              profit: 0,
            };
          }

          medicineSalesMap[medicineName].unitsSold +=
            quantity;

          medicineSalesMap[medicineName].revenue +=
            itemTotal;

          medicineSalesMap[medicineName].profit +=
            itemProfit;

          // ---------------------------------------------
          // CATEGORY SALES
          // ---------------------------------------------

          const category =
            medicine?.category ||
            'Other';

          if (!categorySalesMap[category]) {
            categorySalesMap[category] = {
              category,
              unitsSold: 0,
              revenue: 0,
              profit: 0,
            };
          }

          categorySalesMap[category].unitsSold +=
            quantity;

          categorySalesMap[category].revenue +=
            itemTotal;

          categorySalesMap[category].profit +=
            itemProfit;
        }
      }

      // ------------------------------------------------
      // BILL COUNT
      // ------------------------------------------------

      totalBills += 1;

      // ------------------------------------------------
      // TODAY
      // ------------------------------------------------

      if (isToday) {
        todayBills += 1;

        todayRevenue += saleRevenue;

        todayProfit += saleProfit;

        todayUnitsSold += saleUnits;
      }

      // ------------------------------------------------
      // THIS MONTH
      // ------------------------------------------------

      if (isThisMonth) {
        monthBills += 1;

        monthRevenue += saleRevenue;

        monthProfit += saleProfit;

        monthUnitsSold += saleUnits;
      }

      // ------------------------------------------------
      // DAILY TREND
      // ------------------------------------------------

      const dateKey =
        saleDate.toISOString().split('T')[0];

      if (!dailySalesMap[dateKey]) {
        dailySalesMap[dateKey] = {
          date: dateKey,
          revenue: 0,
          profit: 0,
          bills: 0,
          unitsSold: 0,
        };
      }

      dailySalesMap[dateKey].revenue +=
        saleRevenue;

      dailySalesMap[dateKey].profit +=
        saleProfit;

      dailySalesMap[dateKey].bills += 1;

      dailySalesMap[dateKey].unitsSold +=
        saleUnits;
    }

    // =================================================
    // INVENTORY ANALYTICS
    // =================================================

    let inventoryUnits = 0;
    let inventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const LOW_STOCK_LIMIT = 10;

    for (const medicine of medicines) {
      const quantity =
        Number(medicine.quantity) || 0;

      const purchasePrice =
        Number(medicine.purchasePrice) || 0;

      inventoryUnits += quantity;

      inventoryValue +=
        quantity * purchasePrice;

      if (quantity <= 0) {
        outOfStockCount += 1;
      } else if (quantity <= LOW_STOCK_LIMIT) {
        lowStockCount += 1;
      }
    }

    // =================================================
    // TOP SELLING
    // =================================================

    const topSelling = Object.values(
      medicineSalesMap
    )
      .sort(
        (a, b) =>
          b.unitsSold - a.unitsSold
      )
      .slice(0, 10)
      .map((item) => ({
        ...item,
        revenue: roundMoney(item.revenue),
        profit: roundMoney(item.profit),
      }));

    // =================================================
    // CATEGORY ANALYTICS
    // =================================================

    const categorySales = Object.values(
      categorySalesMap
    )
      .sort(
        (a, b) =>
          b.revenue - a.revenue
      )
      .map((item) => ({
        ...item,
        revenue: roundMoney(item.revenue),
        profit: roundMoney(item.profit),
      }));

    // =================================================
    // DAILY TREND
    // =================================================

    const dailySales = Object.values(
      dailySalesMap
    )
      .sort(
        (a, b) =>
          new Date(a.date) -
          new Date(b.date)
      )
      .slice(-30)
      .map((item) => ({
        ...item,
        revenue: roundMoney(item.revenue),
        profit: roundMoney(item.profit),
      }));

    // =================================================
    // AVERAGE BILL VALUE
    // =================================================

    const averageBillValue =
      totalBills > 0
        ? totalRevenue / totalBills
        : 0;

    const monthlyAverageBillValue =
      monthBills > 0
        ? monthRevenue / monthBills
        : 0;

    // =================================================
    // PROFIT MARGIN
    // =================================================

    const profitMargin =
      totalRevenue > 0
        ? (totalProfit / totalRevenue) * 100
        : 0;

    // =================================================
    // RESPONSE
    // =================================================

    return res.json({
      success: true,

      period: {
        from: yearStart,
        to: now,
      },

      summary: {
        totalRevenue: roundMoney(totalRevenue),

        totalProfit: roundMoney(totalProfit),

        totalBills,

        totalUnitsSold,

        averageBillValue:
          roundMoney(averageBillValue),

        profitMargin:
          roundMoney(profitMargin),
      },

      today: {
        revenue: roundMoney(todayRevenue),

        profit: roundMoney(todayProfit),

        bills: todayBills,

        unitsSold: todayUnitsSold,
      },

      thisMonth: {
        revenue: roundMoney(monthRevenue),

        profit: roundMoney(monthProfit),

        bills: monthBills,

        unitsSold: monthUnitsSold,

        averageBillValue:
          roundMoney(monthlyAverageBillValue),
      },

      inventory: {
        totalMedicines: medicines.length,

        totalUnits: inventoryUnits,

        inventoryValue:
          roundMoney(inventoryValue),

        lowStockCount,

        outOfStockCount,
      },

      topSelling,

      categorySales,

      dailySales,
    });

  } catch (error) {
    console.error(
      'Business analytics error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Failed to load business analytics',
    });
  }
});


// =====================================================
// EXPORT
// =====================================================

module.exports = router;