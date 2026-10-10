const express = require('express');
const router = express.Router();

const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');
const auth = require('../middleware/auth');
const {
  pharmacyStaff
} = require('../middleware/rolePermissions');

// =====================================================
// EXPIRY RISK PREDICTION
//
// Checks:
// - Current stock
// - Sales in last 90 days
// - Daily average sales
// - Days remaining until expiry
// - Expected sales before expiry
// - Expected leftover quantity
// - Potential stock value at risk
//
// Risk levels:
// LOW
// MEDIUM
// HIGH
// CRITICAL
// =====================================================


// =====================================================
// GET EXPIRY RISK
// GET /api/expiry-risk
// =====================================================

router.get(
  '/',
  auth,
  pharmacyStaff,
  async (req, res) => {

    try {

      // =================================================
      // DATE SETUP
      // =================================================

      const today = new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );


      const ninetyDaysAgo =
        new Date(today);

      ninetyDaysAgo.setDate(
        ninetyDaysAgo.getDate() - 90
      );


      // =================================================
      // GET ACTIVE MEDICINES
      // =================================================

      const medicines =
        await Medicine.find({
          status: {
            $ne: 'removed'
          }
        }).sort({
          expiryDate: 1
        });


      // =================================================
      // GET SALES — LAST 90 DAYS
      // =================================================

      const sales =
        await Sale.find({
          createdAt: {
            $gte: ninetyDaysAgo
          }
        });


      // =================================================
      // CALCULATE SOLD QUANTITY
      // =================================================

      const salesByMedicine =
        new Map();


      for (const sale of sales) {

        for (
          const item of sale.items || []
        ) {

          if (!item.medicine) {
            continue;
          }


          const medicineId =
            item.medicine.toString();


          const quantity =
            Number(
              item.quantity
            ) || 0;


          salesByMedicine.set(
            medicineId,
            (
              salesByMedicine.get(
                medicineId
              ) || 0
            ) + quantity
          );

        }

      }


      // =================================================
      // ANALYZE MEDICINES
      // =================================================

      const risks = [];


      for (
        const medicine of medicines
      ) {

        // -------------------------------------------------
        // EXPIRY DATE
        // -------------------------------------------------

        if (!medicine.expiryDate) {
          continue;
        }


        const expiryDate =
          new Date(
            medicine.expiryDate
          );


        expiryDate.setHours(
          0,
          0,
          0,
          0
        );


        // -------------------------------------------------
        // DAYS LEFT
        // -------------------------------------------------

        const daysLeft =
          Math.ceil(
            (
              expiryDate -
              today
            ) /
            (
              1000 *
              60 *
              60 *
              24
            )
          );


        // -------------------------------------------------
        // CURRENT STOCK
        // -------------------------------------------------

        const currentStock =
          Number(
            medicine.quantity
          ) || 0;


        // -------------------------------------------------
        // SOLD LAST 90 DAYS
        // -------------------------------------------------

        const medicineId =
          medicine._id.toString();


        const soldLast90Days =
          salesByMedicine.get(
            medicineId
          ) || 0;


        // -------------------------------------------------
        // DAILY AVERAGE
        // -------------------------------------------------

        const dailyAverage =
          soldLast90Days / 90;


        // -------------------------------------------------
        // EXPECTED SALES BEFORE EXPIRY
        // -------------------------------------------------

        const expectedSalesBeforeExpiry =
          Math.floor(
            dailyAverage *
            Math.max(
              daysLeft,
              0
            )
          );


        // -------------------------------------------------
        // EXPECTED LEFTOVER
        // -------------------------------------------------

        const expectedLeftover =
          Math.max(
            currentStock -
            expectedSalesBeforeExpiry,
            0
          );


        // -------------------------------------------------
        // LEFTOVER PERCENTAGE
        // -------------------------------------------------

        let leftoverPercentage = 0;


        if (
          currentStock > 0
        ) {

          leftoverPercentage =
            (
              expectedLeftover /
              currentStock
            ) * 100;

        }


        // -------------------------------------------------
        // STOCK VALUE AT RISK
        // -------------------------------------------------

        const purchasePrice =
          Number(
            medicine.purchasePrice
          ) || 0;


        const stockValueAtRisk =
          expectedLeftover *
          purchasePrice;


        // -------------------------------------------------
        // RISK CALCULATION
        // -------------------------------------------------

        let riskLevel =
          'LOW';


        let riskScore = 0;


        // Already expired
        if (
          daysLeft <= 0 &&
          currentStock > 0
        ) {

          riskLevel =
            'CRITICAL';

          riskScore = 100;

        }

        // Expires within 7 days
        else if (
          daysLeft <= 7 &&
          currentStock > 0
        ) {

          riskLevel =
            'CRITICAL';

          riskScore = 95;

        }

        // Expires within 14 days
        else if (
          daysLeft <= 14 &&
          leftoverPercentage >= 50
        ) {

          riskLevel =
            'CRITICAL';

          riskScore = 90;

        }

        // Expires within 30 days
        else if (
          daysLeft <= 30 &&
          leftoverPercentage >= 50
        ) {

          riskLevel =
            'HIGH';

          riskScore = 80;

        }

        // Expires within 30 days
        else if (
          daysLeft <= 30 &&
          leftoverPercentage >= 25
        ) {

          riskLevel =
            'HIGH';

          riskScore = 70;

        }

        // Expires within 60 days
        else if (
          daysLeft <= 60 &&
          leftoverPercentage >= 50
        ) {

          riskLevel =
            'HIGH';

          riskScore = 65;

        }

        // Expires within 60 days
        else if (
          daysLeft <= 60 &&
          leftoverPercentage >= 25
        ) {

          riskLevel =
            'MEDIUM';

          riskScore = 50;

        }

        // Expires within 90 days
        else if (
          daysLeft <= 90 &&
          leftoverPercentage >= 50
        ) {

          riskLevel =
            'MEDIUM';

          riskScore = 40;

        }

        // Low leftover
        else if (
          daysLeft <= 90 &&
          leftoverPercentage >= 25
        ) {

          riskLevel =
            'LOW';

          riskScore = 25;

        }

        // Plenty of time / enough demand
        else {

          riskLevel =
            'LOW';

          riskScore = 10;

        }


        // -------------------------------------------------
        // SKIP ZERO STOCK
        // -------------------------------------------------

        if (
          currentStock <= 0
        ) {
          continue;
        }


        // -------------------------------------------------
        // RECOMMENDATION
        // -------------------------------------------------

        let recommendation =
          'Monitor stock normally.';


        if (
          riskLevel ===
          'CRITICAL'
        ) {

          recommendation =
            'Take immediate action. Stop over-ordering and prioritize selling or transferring this stock.';

        }

        else if (
          riskLevel ===
          'HIGH'
        ) {

          recommendation =
            'Prioritize this medicine for sale and avoid purchasing additional stock until the risk decreases.';

        }

        else if (
          riskLevel ===
          'MEDIUM'
        ) {

          recommendation =
            'Monitor sales closely and consider promotional or stock rotation actions.';

        }


        // -------------------------------------------------
        // RISK ITEM
        // -------------------------------------------------

        risks.push({

          id:
            medicine._id,

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

          expiryDate:
            medicine.expiryDate,

          daysLeft,

          expectedSalesBeforeExpiry,

          expectedLeftover,

          leftoverPercentage:
            Number(
              leftoverPercentage.toFixed(1)
            ),

          purchasePrice,

          sellingPrice:
            Number(
              medicine.sellingPrice
            ) || 0,

          stockValueAtRisk:
            Number(
              stockValueAtRisk.toFixed(2)
            ),

          riskLevel,

          riskScore,

          recommendation,

          status:
            medicine.status,

        });

      }


      // =================================================
      // SORT BY RISK
      // CRITICAL → HIGH → MEDIUM → LOW
      // =================================================

      const riskOrder = {
        CRITICAL: 1,
        HIGH: 2,
        MEDIUM: 3,
        LOW: 4,
      };


      risks.sort(
        (a, b) => {

          if (
            riskOrder[a.riskLevel] !==
            riskOrder[b.riskLevel]
          ) {

            return (
              riskOrder[a.riskLevel] -
              riskOrder[b.riskLevel]
            );

          }


          return (
            a.daysLeft -
            b.daysLeft
          );

        }
      );


      // =================================================
      // SUMMARY
      // =================================================

      const critical =
        risks.filter(
          item =>
            item.riskLevel ===
            'CRITICAL'
        );


      const high =
        risks.filter(
          item =>
            item.riskLevel ===
            'HIGH'
        );


      const medium =
        risks.filter(
          item =>
            item.riskLevel ===
            'MEDIUM'
        );


      const low =
        risks.filter(
          item =>
            item.riskLevel ===
            'LOW'
        );


      // =================================================
      // TOTAL STOCK AT RISK
      // =================================================

      const totalUnitsAtRisk =
        risks.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.expectedLeftover,
          0
        );


      const totalValueAtRisk =
        risks.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.stockValueAtRisk,
          0
        );


      // =================================================
      // RESPONSE
      // =================================================

      return res.json({

        success: true,

        criteria: {

          salesPeriod:
            'Last 90 days',

          prediction:
            'Expected sales before expiry are calculated using the average daily sales from the last 90 days.',

        },

        summary: {

          totalRiskItems:
            risks.length,

          criticalCount:
            critical.length,

          highCount:
            high.length,

          mediumCount:
            medium.length,

          lowCount:
            low.length,

          totalUnitsAtRisk,

          totalValueAtRisk:
            Number(
              totalValueAtRisk.toFixed(2)
            ),

        },

        items:
          risks,

      });


    } catch (error) {

      console.error(
        'Expiry risk error:',
        error
      );


      return res.status(500).json({

        success: false,

        message:
          'Failed to calculate expiry risk',

        error:
          error.message,

      });

    }

  }
);


module.exports = router;