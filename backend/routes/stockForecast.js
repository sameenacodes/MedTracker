const express = require('express');
const router = express.Router();

const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');
const auth = require('../middleware/auth');
const {
  pharmacyStaff
} = require('../middleware/rolePermissions');


// =====================================================
// HELPER — START OF DAY
// =====================================================

const startOfDay = (date = new Date()) => {

  const value = new Date(date);

  value.setHours(
    0,
    0,
    0,
    0
  );

  return value;
};


// =====================================================
// HELPER — END OF DAY
// =====================================================

const endOfDay = (date = new Date()) => {

  const value = new Date(date);

  value.setHours(
    23,
    59,
    59,
    999
  );

  return value;
};


// =====================================================
// HELPER — DATE AFTER N DAYS
// =====================================================

const addDays = (
  date,
  days
) => {

  const value =
    new Date(date);

  value.setDate(
    value.getDate() + days
  );

  return value;
};


// =====================================================
// HELPER — GET SALE MEDICINE NAME
// =====================================================

const getSaleMedicineName = (
  item
) => {

  return String(
    item?.medicineName ||
    item?.name ||
    ''
  )
    .trim()
    .toLowerCase();

};


// =====================================================
// HELPER — GET SALE QUANTITY
// =====================================================

const getSaleQuantity = (
  item
) => {

  const quantity =
    Number(
      item?.quantity || 0
    );

  return Number.isFinite(
    quantity
  )
    ? quantity
    : 0;

};


// =====================================================
// HELPER — FORECAST ONE MEDICINE
// =====================================================

const calculateForecast = (
  medicine,
  sales
) => {

  const medicineName =
    String(
      medicine.name || ''
    )
      .trim()
      .toLowerCase();


  // ---------------------------------------------------
  // Calculate total sales for this medicine
  // ---------------------------------------------------

  let totalSold30 = 0;

  let totalSold90 = 0;


  for (
    const sale of sales
  ) {

    if (
      !Array.isArray(
        sale.items
      )
    ) {
      continue;
    }


    for (
      const item of sale.items
    ) {

      const saleMedicineName =
        getSaleMedicineName(
          item
        );


      if (
        saleMedicineName !==
        medicineName
      ) {
        continue;
      }


      const quantity =
        getSaleQuantity(
          item
        );


      const saleDate =
        new Date(
          sale.createdAt
        );


      const now =
        new Date();


      const daysAgo =
        (
          now - saleDate
        ) /
        (
          1000 *
          60 *
          60 *
          24
        );


      if (
        daysAgo <= 30
      ) {

        totalSold30 +=
          quantity;

      }


      if (
        daysAgo <= 90
      ) {

        totalSold90 +=
          quantity;

      }

    }

  }


  // ---------------------------------------------------
  // Daily average
  // ---------------------------------------------------

  const dailyAverage30 =
    totalSold30 / 30;


  const dailyAverage90 =
    totalSold90 / 90;


  // ---------------------------------------------------
  // Use 30-day data when available.
  // Otherwise use 90-day data.
  // ---------------------------------------------------

  let dailyAverage =
    dailyAverage30 > 0
      ? dailyAverage30
      : dailyAverage90;


  // ---------------------------------------------------
  // Current stock
  // ---------------------------------------------------

  const currentStock =
    Number(
      medicine.quantity || 0
    );


  // ---------------------------------------------------
  // Forecast demand
  // ---------------------------------------------------

  const forecast7Days =
    Math.ceil(
      dailyAverage * 7
    );


  const forecast30Days =
    Math.ceil(
      dailyAverage * 30
    );


  // ---------------------------------------------------
  // Stock coverage
  // ---------------------------------------------------

  let stockLastsDays =
    null;


  if (
    dailyAverage > 0
  ) {

    stockLastsDays =
      Number(
        (
          currentStock /
          dailyAverage
        ).toFixed(1)
      );

  }


  // ---------------------------------------------------
  // Estimated stock-out date
  // ---------------------------------------------------

  let estimatedStockOutDate =
    null;


  if (
    stockLastsDays !== null
  ) {

    estimatedStockOutDate =
      addDays(
        new Date(),
        Math.ceil(
          stockLastsDays
        )
      );

  }


  // ---------------------------------------------------
  // 30-day shortage
  // ---------------------------------------------------

  const shortage30Days =
    Math.max(
      forecast30Days -
        currentStock,
      0
    );


  // ---------------------------------------------------
  // Demand level
  // ---------------------------------------------------

  let demandLevel =
    'LOW';


  if (
    dailyAverage >= 5
  ) {

    demandLevel =
      'HIGH';

  } else if (
    dailyAverage >= 2
  ) {

    demandLevel =
      'MEDIUM';

  }


  // ---------------------------------------------------
  // Forecast status
  // ---------------------------------------------------

  let forecastStatus =
    'HEALTHY';


  if (
    currentStock <= 0
  ) {

    forecastStatus =
      'OUT_OF_STOCK';

  } else if (
    stockLastsDays !== null &&
    stockLastsDays <= 7
  ) {

    forecastStatus =
      'RUNNING_OUT';

  } else if (
    shortage30Days > 0
  ) {

    forecastStatus =
      'SHORTAGE_EXPECTED';

  } else if (
    stockLastsDays !== null &&
    stockLastsDays <= 30
  ) {

    forecastStatus =
      'MONITOR';

  }


  // ---------------------------------------------------
  // Suggested reorder
  // ---------------------------------------------------
  //
  // Maintain approximately 30 days of stock.
  // ---------------------------------------------------

  const suggestedReorder =
    shortage30Days;


  // ---------------------------------------------------
  // Priority
  // ---------------------------------------------------

  let priority =
    'LOW';


  if (
    forecastStatus ===
      'OUT_OF_STOCK' ||
    forecastStatus ===
      'RUNNING_OUT'
  ) {

    priority =
      'HIGH';

  } else if (
    forecastStatus ===
    'SHORTAGE_EXPECTED'
  ) {

    priority =
      'MEDIUM';

  }


  // ---------------------------------------------------
  // Recommendation
  // ---------------------------------------------------

  let recommendation =
    'Stock level looks healthy.';


  if (
    forecastStatus ===
    'OUT_OF_STOCK'
  ) {

    recommendation =
      'Medicine is out of stock. Reorder immediately.';

  } else if (
    forecastStatus ===
    'RUNNING_OUT'
  ) {

    recommendation =
      'Stock may run out soon. Reorder immediately.';

  } else if (
    forecastStatus ===
    'SHORTAGE_EXPECTED'
  ) {

    recommendation =
      `Expected shortage in the next 30 days. Consider ordering ${suggestedReorder} units.`;

  } else if (
    forecastStatus ===
    'MONITOR'
  ) {

    recommendation =
      'Stock is limited. Monitor sales and inventory closely.';

  }


  // ---------------------------------------------------
  // Return forecast
  // ---------------------------------------------------

  return {

    medicineId:
      medicine._id,

    name:
      medicine.name,

    brand:
      medicine.brand || '',

    category:
      medicine.category || '',

    batchNumber:
      medicine.batchNumber || '',

    currentStock,

    totalSold30Days:
      totalSold30,

    totalSold90Days:
      totalSold90,

    dailyAverage:
      Number(
        dailyAverage.toFixed(2)
      ),

    forecast7Days,

    forecast30Days,

    stockLastsDays,

    estimatedStockOutDate,

    suggestedReorder,

    demandLevel,

    forecastStatus,

    priority,

    recommendation,

  };

};


// =====================================================
// GET STOCK FORECAST
// GET /api/stock-forecast
// =====================================================

router.get(
  '/',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      console.log(
        '📊 Generating AI stock forecast...'
      );


      // =================================================
      // GET ACTIVE MEDICINES
      // =================================================

      const medicines =
        await Medicine.find({

          status: {
            $ne: 'removed',
          },

        })
        .sort({
          name: 1,
        });


      // =================================================
      // GET LAST 90 DAYS SALES
      // =================================================

      const ninetyDaysAgo =
        startOfDay(
          addDays(
            new Date(),
            -90
          )
        );


      const sales =
        await Sale.find({

          createdAt: {
            $gte:
              ninetyDaysAgo,

            $lte:
              endOfDay(),
          },

        });


      // =================================================
      // CALCULATE FORECAST
      // =================================================

      const forecasts =
        medicines.map(
          (medicine) =>
            calculateForecast(
              medicine,
              sales
            )
        );


      // =================================================
      // SORT
      // HIGH → MEDIUM → LOW
      // =================================================

      const priorityOrder = {

        HIGH: 1,

        MEDIUM: 2,

        LOW: 3,

      };


      forecasts.sort(
        (a, b) => {

          const priorityDifference =
            (
              priorityOrder[
                a.priority
              ] || 99
            ) -
            (
              priorityOrder[
                b.priority
              ] || 99
            );


          if (
            priorityDifference !== 0
          ) {

            return priorityDifference;

          }


          return (
            b.dailyAverage -
            a.dailyAverage
          );

        }
      );


      // =================================================
      // SUMMARY
      // =================================================

      const totalMedicines =
        forecasts.length;


      const highPriority =
        forecasts.filter(
          (item) =>
            item.priority ===
            'HIGH'
        ).length;


      const mediumPriority =
        forecasts.filter(
          (item) =>
            item.priority ===
            'MEDIUM'
        ).length;


      const runningOut =
        forecasts.filter(
          (item) =>
            item.forecastStatus ===
              'RUNNING_OUT' ||
            item.forecastStatus ===
              'OUT_OF_STOCK'
        ).length;


      const expectedShortage =
        forecasts.filter(
          (item) =>
            item.forecastStatus ===
            'SHORTAGE_EXPECTED'
        ).length;


      const totalSuggestedReorder =
        forecasts.reduce(
          (
            total,
            item
          ) =>
            total +
            (
              Number(
                item.suggestedReorder
              ) || 0
            ),

          0
        );


      // =================================================
      // RESPONSE
      // =================================================

      res.json({

        success: true,

        generatedAt:
          new Date(),

        analysisPeriodDays:
          90,

        forecast: {

          days7: 7,

          days30: 30,

        },

        summary: {

          totalMedicines,

          highPriority,

          mediumPriority,

          runningOut,

          expectedShortage,

          totalSuggestedReorder,

        },

        data:
          forecasts,

      });


    } catch (error) {

      console.log(
        '❌ Stock forecast error:',
        error
      );


      res.status(500).json({

        success: false,

        message:
          'Failed to generate stock forecast',

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// GET HIGH PRIORITY FORECAST
// GET /api/stock-forecast/attention
// =====================================================

router.get(
  '/attention',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      // -------------------------------------------------
      // Get active medicines
      // -------------------------------------------------

      const medicines =
        await Medicine.find({

          status: {
            $ne: 'removed',
          },

        });


      // -------------------------------------------------
      // Get last 90 days sales
      // -------------------------------------------------

      const ninetyDaysAgo =
        startOfDay(
          addDays(
            new Date(),
            -90
          )
        );


      const sales =
        await Sale.find({

          createdAt: {
            $gte:
              ninetyDaysAgo,

            $lte:
              endOfDay(),
          },

        });


      // -------------------------------------------------
      // Calculate
      // -------------------------------------------------

      const forecasts =
        medicines.map(
          (medicine) =>
            calculateForecast(
              medicine,
              sales
            )
        );


      // -------------------------------------------------
      // Only medicines requiring attention
      // -------------------------------------------------

      const attention =
        forecasts.filter(
          (item) =>

            item.priority ===
              'HIGH' ||

            item.priority ===
              'MEDIUM'
        );


      // -------------------------------------------------
      // Sort
      // -------------------------------------------------

      attention.sort(
        (a, b) => {

          const priorityOrder = {

            HIGH: 1,

            MEDIUM: 2,

            LOW: 3,

          };


          return (
            (
              priorityOrder[
                a.priority
              ] || 99
            ) -
            (
              priorityOrder[
                b.priority
              ] || 99
            )
          );

        }
      );


      // -------------------------------------------------
      // Response
      // -------------------------------------------------

      res.json({

        success: true,

        count:
          attention.length,

        data:
          attention,

      });


    } catch (error) {

      console.log(
        '❌ Forecast attention error:',
        error
      );


      res.status(500).json({

        success: false,

        message:
          'Failed to fetch stock attention data',

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// EXPORT
// =====================================================

module.exports = router;