const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// ============================================================
// MEDTRACKER AI DECISION SUPPORT
// ============================================================
//
// Combines:
// 1. Demand Forecasting
// 2. Expiry Risk Analysis
// 3. Smart Reorder Recommendations
//
// Endpoint:
// GET /api/ai-decision-support
//
// ============================================================


// ============================================================
// FILE PATHS
// ============================================================

const PROJECT_ROOT = path.join(
  __dirname,
  '..',
  '..'
);

const ML_EVALUATION_DIR = path.join(
  PROJECT_ROOT,
  'ml',
  'evaluation'
);

const EXPIRY_FILE = path.join(
  ML_EVALUATION_DIR,
  'expiry_risk_analysis.csv'
);

const REORDER_FILE = path.join(
  ML_EVALUATION_DIR,
  'smart_reorder_recommendations.csv'
);

const FORECAST_FILE = path.join(
  ML_EVALUATION_DIR,
  'xgboost_predictions.csv'
);


// ============================================================
// CSV PARSER
// ============================================================

function parseCSV(content) {
  const lines = content
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCSVLine(lines[0]);

  return lines
    .slice(1)
    .map((line) => {

      const values = parseCSVLine(line);

      const row = {};

      headers.forEach((header, index) => {
        row[header] =
          values[index] !== undefined
            ? values[index]
            : '';
      });

      return row;
    });
}


// ============================================================
// HANDLE CSV QUOTED VALUES
// ============================================================

function parseCSVLine(line) {

  const result = [];

  let current = '';

  let insideQuotes = false;


  for (let i = 0; i < line.length; i++) {

    const char = line[i];

    if (char === '"') {

      if (
        insideQuotes &&
        line[i + 1] === '"'
      ) {

        current += '"';

        i++;

      } else {

        insideQuotes =
          !insideQuotes;

      }

    } else if (
      char === ',' &&
      !insideQuotes
    ) {

      result.push(
        current.trim()
      );

      current = '';

    } else {

      current += char;
    }
  }


  result.push(
    current.trim()
  );

  return result;
}


// ============================================================
// READ CSV SAFELY
// ============================================================

function readCSVFile(filePath) {

  if (!fs.existsSync(filePath)) {

    return {
      exists: false,
      data: []
    };
  }


  try {

    const content =
      fs.readFileSync(
        filePath,
        'utf8'
      );

    return {
      exists: true,
      data: parseCSV(content)
    };

  } catch (error) {

    console.error(
      `❌ Failed to read CSV: ${filePath}`,
      error.message
    );

    return {
      exists: false,
      data: []
    };
  }
}


// ============================================================
// NUMBER HELPER
// ============================================================

function toNumber(value) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}


// ============================================================
// GET AI DECISION SUPPORT
// ============================================================

router.get(
  '/',
  async (req, res) => {

    try {

      console.log(
        '\n🤖 AI Decision Support request received'
      );


      // ======================================================
      // LOAD AI OUTPUTS
      // ======================================================

      const expiryResult =
        readCSVFile(
          EXPIRY_FILE
        );

      const reorderResult =
        readCSVFile(
          REORDER_FILE
        );

      const forecastResult =
        readCSVFile(
          FORECAST_FILE
        );


      // ======================================================
      // EXPIRY DATA
      // ======================================================

      const expiryData =
        expiryResult.data;


      // Remove duplicate records
      // using medicine + batch.

      const uniqueExpiryMap =
        new Map();

      expiryData.forEach(
        (item) => {

          const key =
            `${item.medicine_name || ''}`
            + '::'
            + `${item.batch_number || ''}`;

          if (
            !uniqueExpiryMap.has(key)
          ) {

            uniqueExpiryMap.set(
              key,
              item
            );
          }
        }
      );


      const uniqueExpiryData =
        Array.from(
          uniqueExpiryMap.values()
        );


      // ======================================================
      // EXPIRY SUMMARY
      // ======================================================

      const expiredCount =
        uniqueExpiryData.filter(
          (item) =>
            String(
              item.risk_level
            ).toUpperCase() ===
            'EXPIRED'
        ).length;


      const criticalCount =
        uniqueExpiryData.filter(
          (item) =>
            String(
              item.risk_level
            ).toUpperCase() ===
            'CRITICAL'
        ).length;


      const highRiskCount =
        uniqueExpiryData.filter(
          (item) =>
            String(
              item.risk_level
            ).toUpperCase() ===
            'HIGH'
        ).length;


      const mediumRiskCount =
        uniqueExpiryData.filter(
          (item) =>
            String(
              item.risk_level
            ).toUpperCase() ===
            'MEDIUM'
        ).length;


      const lowRiskCount =
        uniqueExpiryData.filter(
          (item) =>
            String(
              item.risk_level
            ).toUpperCase() ===
            'LOW'
        ).length;


      const totalPotentialWaste =
        uniqueExpiryData.reduce(
          (sum, item) =>
            sum +
            toNumber(
              item.potential_waste_value
            ),
          0
        );


      // ======================================================
      // PRIORITY EXPIRY MEDICINES
      // ======================================================

      const priorityExpiry =
        uniqueExpiryData
          .filter(
            (item) => {

              const risk =
                String(
                  item.risk_level
                ).toUpperCase();

              return [
                'EXPIRED',
                'CRITICAL',
                'HIGH'
              ].includes(risk);
            }
          )
          .sort(
            (a, b) =>
              toNumber(
                b.expiry_risk_score
              )
              -
              toNumber(
                a.expiry_risk_score
              )
          )
          .slice(0, 10)
          .map(
            (item) => ({

              medicineName:
                item.medicine_name,

              batchNumber:
                item.batch_number,

              currentStock:
                toNumber(
                  item.current_stock
                ),

              daysToExpiry:
                toNumber(
                  item.days_to_expiry
                ),

              riskScore:
                toNumber(
                  item.expiry_risk_score
                ),

              riskLevel:
                item.risk_level,

              potentialWasteValue:
                toNumber(
                  item.potential_waste_value
                )
            })
          );


      // ======================================================
      // REORDER DATA
      // ======================================================

      const reorderData =
        reorderResult.data;


      // Only actual reorder recommendations
      // are considered here.

      const actualReorders =
        reorderData.filter(
          (item) =>
            toNumber(
              item.reorder_quantity
            ) > 0
            &&
            String(
              item.risk_level
            ).toUpperCase() !==
            'EXPIRED'
        );


      const totalReorderUnits =
        actualReorders.reduce(
          (sum, item) =>
            sum +
            toNumber(
              item.reorder_quantity
            ),
          0
        );


      // ======================================================
      // REORDER PRIORITY
      // ======================================================

      const priorityReorders =
        actualReorders
          .sort(
            (a, b) =>
              toNumber(
                b.reorder_priority_score
              )
              -
              toNumber(
                a.reorder_priority_score
              )
          )
          .slice(0, 10)
          .map(
            (item) => ({

              medicineName:
                item.medicine_name,

              batchNumber:
                item.batch_number,

              currentStock:
                toNumber(
                  item.current_stock
                ),

              estimatedDailyDemand:
                toNumber(
                  item.estimated_daily_demand
                ),

              stockCoverDays:
                toNumber(
                  item.stock_cover_days
                ),

              reorderQuantity:
                toNumber(
                  item.reorder_quantity
                ),

              priority:
                item.priority,

              priorityScore:
                toNumber(
                  item.reorder_priority_score
                ),

              riskLevel:
                item.risk_level,

              recommendation:
                item.recommendation
            })
          );


      // ======================================================
      // FORECAST DATA
      // ======================================================

      const forecastData =
        forecastResult.data;


      const forecastSummary = {

        records:
          forecastData.length,

        averageActualDemand:
          forecastData.length > 0
            ? (
                forecastData.reduce(
                  (sum, item) =>
                    sum +
                    toNumber(
                      item.actual
                    ),
                  0
                )
                /
                forecastData.length
              ).toFixed(2)
            : '0.00',

        averagePredictedDemand:
          forecastData.length > 0
            ? (
                forecastData.reduce(
                  (sum, item) =>
                    sum +
                    toNumber(
                      item.predicted
                    ),
                  0
                )
                /
                forecastData.length
              ).toFixed(2)
            : '0.00'
      };


      // ======================================================
      // FORECAST PREVIEW
      // ======================================================

      const forecastPreview =
        forecastData
          .slice(-10)
          .map(
            (item) => ({

              date:
                item.date,

              medicineName:
                item.medicine_group ||
                item.medicine_name ||
                '',

              actual:
                toNumber(
                  item.actual
                ),

              predicted:
                toNumber(
                  item.predicted
                )
            })
          );


      // ======================================================
      // OVERALL PRIORITY ACTIONS
      // ======================================================

      const actions = [];


      if (expiredCount > 0) {

        actions.push({

          type: 'EXPIRY',

          priority: 'CRITICAL',

          message:
            `${expiredCount} medicine batch(es) `
            +
            `are expired and require immediate removal.`
        });
      }


      if (highRiskCount > 0) {

        actions.push({

          type: 'EXPIRY',

          priority: 'HIGH',

          message:
            `${highRiskCount} medicine batch(es) `
            +
            `have high expiry risk.`
        });
      }


      if (
        actualReorders.length > 0
      ) {

        actions.push({

          type: 'REORDER',

          priority:
            actualReorders.some(
              (item) =>
                String(
                  item.priority
                ).toUpperCase() ===
                'CRITICAL'
            )
              ? 'CRITICAL'
              : 'HIGH',

          message:
            `${actualReorders.length} medicine `
            +
            `batch(es) need replenishment `
            +
            `(${totalReorderUnits} units).`
        });
      }


      if (
        actions.length === 0
      ) {

        actions.push({

          type: 'SYSTEM',

          priority: 'LOW',

          message:
            'No immediate AI-driven action is required.'
        });
      }


      // ======================================================
      // RESPONSE
      // ======================================================

      const response = {

        success: true,

        generatedAt:
          new Date().toISOString(),

        module:
          'AI Decision Support',

        summary: {

          totalMedicineBatches:
            uniqueExpiryData.length,

          expiredCount,

          criticalCount,

          highRiskCount,

          mediumRiskCount,

          lowRiskCount,

          totalPotentialWasteValue:
            Number(
              totalPotentialWaste.toFixed(2)
            ),

          reorderRecommendationCount:
            actualReorders.length,

          totalSuggestedReorderUnits:
            totalReorderUnits
        },

        expiryRisk: {

          summary: {

            expired:
              expiredCount,

            critical:
              criticalCount,

            high:
              highRiskCount,

            medium:
              mediumRiskCount,

            low:
              lowRiskCount
          },

          priorityMedicines:
            priorityExpiry
        },

        smartReorder: {

          totalRecommendations:
            actualReorders.length,

          totalUnits:
            totalReorderUnits,

          recommendations:
            priorityReorders
        },

        demandForecast: {

          model:
            'XGBoost',

          evaluation: {

            mae: 2.1462,

            rmse: 2.4096,

            mape: 79.19
          },

          summary:
            forecastSummary,

          recentPredictions:
            forecastPreview
        },

        actions
      };


      console.log(
        '✅ AI Decision Support generated successfully'
      );


      res.json(
        response
      );


    } catch (error) {

      console.error(
        '❌ AI Decision Support error:',
        error
      );


      res.status(500).json({

        success: false,

        message:
          'Failed to generate AI decision support',

        error:
          error.message
      });
    }
  }
);


module.exports = router;