const express = require("express");
const router = express.Router();

const Medicine = require("../models/Medicine");
const Sale = require("../models/Sale");
const Reorder = require("../models/Reorder");

const auth = require("../middleware/auth");

const { pharmacyStaff } = require("../middleware/rolePermissions");

// ======================================================
// CONSTANTS
// ======================================================

const LOW_STOCK_THRESHOLD = 20;
const SALES_DAYS = 90;
const DAY_MS = 1000 * 60 * 60 * 24;

// ======================================================
// DATE HELPERS
// ======================================================

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfToday = () => {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const daysBetween = (date1, date2) => {
  return Math.ceil((date2 - date1) / DAY_MS);
};

// ======================================================
// ACTIVE MEDICINES
// ======================================================

const getActiveMedicines = async () => {
  return await Medicine.find({
    status: {
      $ne: "removed",
    },
  }).sort({
    name: 1,
  });
};

// ======================================================
// LAST 90 DAYS SALES
// ======================================================

const getSalesData = async () => {
  const ninetyDaysAgo = new Date();

  ninetyDaysAgo.setDate(
    ninetyDaysAgo.getDate() - SALES_DAYS
  );

  return await Sale.find({
    createdAt: {
      $gte: ninetyDaysAgo,
    },
  }).sort({
    createdAt: -1,
  });
};

// ======================================================
// CALCULATE MEDICINE SALES
// ======================================================

const calculateMedicineSales = (medicine, sales) => {
  let totalSold = 0;

  const medicineName = String(
    medicine.name || ""
  ).trim().toLowerCase();

  for (const sale of sales) {
    if (!Array.isArray(sale.items)) {
      continue;
    }

    for (const item of sale.items) {
      const itemName = String(
        item.medicineName ||
        item.name ||
        ""
      ).trim().toLowerCase();

      if (
        itemName === medicineName
      ) {
        totalSold +=
          Number(item.quantity) || 0;
      }
    }
  }

  const dailyAverage =
    totalSold / SALES_DAYS;

  return {
    totalSold,
    dailyAverage: Number(
      dailyAverage.toFixed(2)
    ),
  };
};

// ======================================================
// OUTSTANDING REORDERS
// ======================================================

const getOutstandingReorders = async () => {
  const activeReorders =
    await Reorder.find({
      status: {
        $in: [
          "pending",
          "ordered",
          "partially_received",
        ],
      },
    });

  const incomingByMedicine = {};

  for (const reorder of activeReorders) {
    if (!reorder.medicine) {
      continue;
    }

    const medicineId =
      String(reorder.medicine);

    const ordered =
      Number(reorder.quantity) || 0;

    const received =
      Number(reorder.receivedQuantity) || 0;

    const outstanding =
      Math.max(
        ordered - received,
        0
      );

    incomingByMedicine[medicineId] =
      (incomingByMedicine[medicineId] || 0) +
      outstanding;
  }

  return incomingByMedicine;
};

// ======================================================
// REORDER SUGGESTIONS
// ======================================================

const getReorderSuggestions = async () => {
  const medicines =
    await Medicine.find({
      status: {
        $nin: [
          "expired",
          "removed",
        ],
      },
    });

  const sales =
    await getSalesData();

  const incomingByMedicine =
    await getOutstandingReorders();

  const suggestions = [];

  for (const medicine of medicines) {
    const salesData =
      calculateMedicineSales(
        medicine,
        sales
      );

    const totalSold =
      salesData.totalSold;

    const dailyAverage =
      salesData.dailyAverage;

    const monthlyDemand =
      Math.ceil(
        dailyAverage * 30
      );

    const currentStock =
      Number(medicine.quantity) || 0;

    const incomingStock =
      incomingByMedicine[
        String(medicine._id)
      ] || 0;

    const effectiveStock =
      currentStock +
      incomingStock;

    const reorderQuantity =
      Math.max(
        monthlyDemand -
          effectiveStock,
        0
      );

    let stockLasts = null;

    if (dailyAverage > 0) {
      stockLasts = Number(
        (
          currentStock /
          dailyAverage
        ).toFixed(1)
      );
    }

    let priority = "LOW";

    if (
      currentStock < 10 ||
      (
        stockLasts !== null &&
        stockLasts <= 7
      )
    ) {
      priority = "HIGH";
    } else if (
      currentStock < LOW_STOCK_THRESHOLD ||
      (
        stockLasts !== null &&
        stockLasts <= 14
      )
    ) {
      priority = "MEDIUM";
    }

    // Only suggest if actual reorder is required
    // OR stock is below threshold.
    if (
      reorderQuantity > 0 ||
      currentStock < LOW_STOCK_THRESHOLD
    ) {
      suggestions.push({
        medicineId:
          medicine._id,

        name:
          medicine.name,

        brand:
          medicine.brand,

        category:
          medicine.category,

        supplier:
          medicine.supplier,

        currentStock,

        incomingStock,

        effectiveStock,

        soldLast90Days:
          totalSold,

        dailyAverage,

        monthlyDemand,

        reorderQuantity,

        stockLasts,

        priority,
      });
    }
  }

  const priorityOrder = {
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };

  suggestions.sort(
    (a, b) =>
      priorityOrder[a.priority] -
      priorityOrder[b.priority]
  );

  return suggestions;
};

// ======================================================
// EXPIRY RISK
// ======================================================

const getExpiryRiskData = async () => {
  const today =
    startOfToday();

  const riskEndDate =
    addDays(today, 90);

  const medicines =
    await Medicine.find({
      expiryDate: {
        $lte: riskEndDate,
      },

      status: {
        $nin: [
          "removed",
        ],
      },

      quantity: {
        $gt: 0,
      },
    }).sort({
      expiryDate: 1,
    });

  const sales =
    await getSalesData();

  const riskList = [];

  for (const medicine of medicines) {
    const salesData =
      calculateMedicineSales(
        medicine,
        sales
      );

    const totalSold =
      salesData.totalSold;

    const dailyAverage =
      salesData.dailyAverage;

    const currentStock =
      Number(medicine.quantity) || 0;

    const expiryDate =
      new Date(
        medicine.expiryDate
      );

    const daysUntilExpiry =
      daysBetween(
        today,
        expiryDate
      );

    // Already expired
    if (
      daysUntilExpiry < 0
    ) {
      riskList.push({
        medicineId:
          medicine._id,

        medicineName:
          medicine.name,

        brand:
          medicine.brand,

        batchNumber:
          medicine.batchNumber,

        currentStock,

        expiryDate:
          medicine.expiryDate,

        daysUntilExpiry,

        soldLast90Days:
          totalSold,

        dailyAverage,

        expectedSalesBeforeExpiry:
          0,

        potentialLeftover:
          currentStock,

        risk: "EXPIRED",
      });

      continue;
    }

    const expectedSalesBeforeExpiry =
      Math.floor(
        dailyAverage *
          daysUntilExpiry
      );

    const potentialLeftover =
      Math.max(
        currentStock -
          expectedSalesBeforeExpiry,
        0
      );

    let risk = "LOW";

    if (
      daysUntilExpiry <= 7 &&
      currentStock > 0
    ) {
      risk = "HIGH";
    } else if (
      daysUntilExpiry <= 30 &&
      potentialLeftover > 0
    ) {
      risk = "HIGH";
    } else if (
      daysUntilExpiry <= 60 &&
      potentialLeftover > 0
    ) {
      risk = "MEDIUM";
    }

    if (
      totalSold === 0 &&
      daysUntilExpiry <= 30
    ) {
      risk = "HIGH";
    }

    riskList.push({
      medicineId:
        medicine._id,

      medicineName:
        medicine.name,

      brand:
        medicine.brand,

      category:
        medicine.category,

      batchNumber:
        medicine.batchNumber,

      supplier:
        medicine.supplier,

      currentStock,

      expiryDate:
        medicine.expiryDate,

      daysUntilExpiry,

      soldLast90Days:
        totalSold,

      dailyAverage,

      expectedSalesBeforeExpiry,

      potentialLeftover,

      risk,
    });
  }

  const riskOrder = {
    EXPIRED: 1,
    HIGH: 2,
    MEDIUM: 3,
    LOW: 4,
  };

  riskList.sort(
    (a, b) =>
      riskOrder[a.risk] -
      riskOrder[b.risk]
  );

  return riskList;
};

// ======================================================
// SMART INVENTORY RECOMMENDATIONS
// ======================================================

const getSmartRecommendations = async () => {
  const medicines =
    await Medicine.find({
      status: {
        $nin: [
          "expired",
          "removed",
        ],
      },
    });

  const sales =
    await getSalesData();

  const incomingByMedicine =
    await getOutstandingReorders();

  const today =
    startOfToday();

  const recommendations = [];

  for (const medicine of medicines) {
    const salesData =
      calculateMedicineSales(
        medicine,
        sales
      );

    const totalSold =
      salesData.totalSold;

    const dailyAverage =
      salesData.dailyAverage;

    const currentStock =
      Number(medicine.quantity) || 0;

    const incomingStock =
      incomingByMedicine[
        String(medicine._id)
      ] || 0;

    const effectiveStock =
      currentStock +
      incomingStock;

    const monthlyDemand =
      Math.ceil(
        dailyAverage * 30
      );

    const reorderQuantity =
      Math.max(
        monthlyDemand -
          effectiveStock,
        0
      );

    let stockLasts = null;

    if (dailyAverage > 0) {
      stockLasts = Number(
        (
          currentStock /
          dailyAverage
        ).toFixed(1)
      );
    }

    let daysUntilExpiry = null;
    let expectedSalesBeforeExpiry =
      null;
    let potentialLeftover =
      null;

    let expiryRisk =
      "NONE";

    if (
      medicine.expiryDate
    ) {
      const expiryDate =
        new Date(
          medicine.expiryDate
        );

      daysUntilExpiry =
        daysBetween(
          today,
          expiryDate
        );

      if (
        daysUntilExpiry > 0
      ) {
        expectedSalesBeforeExpiry =
          Math.floor(
            dailyAverage *
              daysUntilExpiry
          );

        potentialLeftover =
          Math.max(
            currentStock -
              expectedSalesBeforeExpiry,
            0
          );

        if (
          daysUntilExpiry <= 7 &&
          currentStock > 0
        ) {
          expiryRisk = "HIGH";
        } else if (
          daysUntilExpiry <= 30 &&
          potentialLeftover > 0
        ) {
          expiryRisk = "HIGH";
        } else if (
          daysUntilExpiry <= 60 &&
          potentialLeftover > 0
        ) {
          expiryRisk = "MEDIUM";
        }

        if (
          totalSold === 0 &&
          daysUntilExpiry <= 30
        ) {
          expiryRisk = "HIGH";
        }
      }
    }

    let priority = "LOW";
    let action = "MONITOR";

    let recommendation =
      "Stock level looks healthy. No immediate action required.";

    // -----------------------------------------------
    // HIGH EXPIRY RISK
    // -----------------------------------------------

    if (
      expiryRisk === "HIGH" &&
      potentialLeftover > 0
    ) {
      priority = "HIGH";

      action =
        "PRIORITIZE_SALE";

      recommendation =
        "Prioritize this batch for sale. Avoid unnecessary reordering because stock may remain unsold until expiry.";
    }

    // -----------------------------------------------
    // LOW STOCK
    // -----------------------------------------------

    else if (
      currentStock < 10 &&
      expiryRisk !== "HIGH"
    ) {
      priority = "HIGH";

      action = "REORDER";

      if (
        reorderQuantity > 0
      ) {
        recommendation =
          `Reorder ${reorderQuantity} units. Current stock is critically low.`;
      } else if (
        incomingStock > 0
      ) {
        recommendation =
          `Current stock is low, but ${incomingStock} units are already incoming.`;
      } else {
        recommendation =
          "Current stock is critically low. Review supplier availability.";
      }
    }

    // -----------------------------------------------
    // STOCK RUNNING OUT
    // -----------------------------------------------

    else if (
      stockLasts !== null &&
      stockLasts <= 7 &&
      expiryRisk !== "HIGH"
    ) {
      priority = "HIGH";

      action = "REORDER";

      if (
        reorderQuantity > 0
      ) {
        recommendation =
          `Current stock may last only ${stockLasts} days. Reorder ${reorderQuantity} units.`;
      } else {
        recommendation =
          `Current stock may last only ${stockLasts} days, but incoming stock is already considered.`;
      }
    }

    // -----------------------------------------------
    // MEDIUM EXPIRY RISK
    // -----------------------------------------------

    else if (
      expiryRisk === "MEDIUM" &&
      potentialLeftover > 0
    ) {
      priority = "MEDIUM";

      action =
        "MONITOR_EXPIRY";

      recommendation =
        "Monitor this batch closely and prioritize sales before expiry.";
    }

    // -----------------------------------------------
    // LOW STOCK
    // -----------------------------------------------

    else if (
      currentStock <
      LOW_STOCK_THRESHOLD
    ) {
      priority = "MEDIUM";

      action =
        "PLAN_REORDER";

      if (
        reorderQuantity > 0
      ) {
        recommendation =
          `Stock is low. Plan a reorder of ${reorderQuantity} units.`;
      } else {
        recommendation =
          "Stock is low, but existing incoming stock is sufficient for the current demand estimate.";
      }
    }

    if (
      action !== "MONITOR"
    ) {
      recommendations.push({
        medicineId:
          medicine._id,

        medicineName:
          medicine.name,

        brand:
          medicine.brand,

        category:
          medicine.category,

        supplier:
          medicine.supplier,

        currentStock,

        incomingStock,

        effectiveStock,

        soldLast90Days:
          totalSold,

        dailyAverage,

        monthlyDemand,

        stockLasts,

        daysUntilExpiry,

        expectedSalesBeforeExpiry,

        potentialLeftover,

        expiryRisk,

        reorderQuantity,

        priority,

        action,

        recommendation,
      });
    }
  }

  const priorityOrder = {
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };

  recommendations.sort(
    (a, b) =>
      priorityOrder[a.priority] -
      priorityOrder[b.priority]
  );

  return recommendations;
};

// ======================================================
// MEDICINE SEARCH
// ======================================================

const searchMedicine = async (
  query
) => {
  const cleanQuery =
    String(query || "")
      .trim();

  if (!cleanQuery) {
    return [];
  }

  return await Medicine.find({
    name: {
      $regex: cleanQuery,
      $options: "i",
    },

    status: {
      $ne: "removed",
    },
  }).sort({
    name: 1,
  });
};

// ======================================================
// AI CHAT
// ======================================================

router.post(
  "/",
  auth,
  pharmacyStaff,
  async (req, res) => {
    try {
      const userMessage =
        req.body.message;

      if (
        !userMessage ||
        typeof userMessage !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a message.",
        });
      }

      const text =
        userMessage
          .toLowerCase()
          .trim();

      // ==================================================
      // 1. HELP
      // ==================================================

      if (
        text === "help" ||
        text.includes("what can you do") ||
        text.includes("what can i ask") ||
        text.includes("questions")
      ) {
        return res.json({
          success: true,

          reply:
            `🤖 I can help you with your MedTracker pharmacy.

📦 INVENTORY
• Give me inventory summary
• How many medicines do I have?
• How many total units?
• Show low stock medicines
• Which medicines have zero stock?
• Which medicines have healthy stock?
• Which medicine has the highest stock?

💊 MEDICINES
• How much Paracetamol is available?
• Do I have Amoxicillin?
• Show stock of Dolo
• Which medicines are available?
• Search for a medicine

⏰ EXPIRY
• What expires today?
• What expires tomorrow?
• Which medicines expire this week?
• Which medicines expire this month?
• Which medicines are at risk of expiring?
• Show expired medicines
• How many medicines are expired?
• What should I do about expiring medicines?

📦 REORDER
• What should I reorder?
• Which medicines need restocking?
• Which medicines are critically low?
• Show pending reorders
• What medicines are running out soon?
• Do I already have incoming stock?

💰 SALES
• What are today's sales?
• How many bills today?
• How many units were sold today?
• What is today's revenue?
• Show recent sales
• Which medicine sold the most?

🏪 PHARMACY
• Give me smart recommendations
• What needs my attention?
• What should I do with my inventory?
• Give me today's pharmacy status
• What are the urgent issues?

Ask me any pharmacy inventory question and I will check the current MedTracker data.`,
        });
      }

      // ==================================================
      // 2. SMART RECOMMENDATIONS
      // ==================================================

      if (
        text.includes(
          "smart recommendations"
        ) ||
        text.includes(
          "what should i do with my inventory"
        ) ||
        text.includes(
          "what needs my attention"
        ) ||
        text.includes(
          "immediate action"
        ) ||
        text.includes(
          "inventory recommendations"
        ) ||
        text.includes(
          "smart inventory"
        ) ||
        text.includes(
          "urgent issues"
        ) ||
        text.includes(
          "pharmacy status"
        )
      ) {
        const recommendations =
          await getSmartRecommendations();

        if (
          recommendations.length === 0
        ) {
          return res.json({
            success: true,

            reply:
              "✅ Your current inventory looks healthy. I don't see any medicines requiring immediate action.",

            data: [],
          });
        }

        const top =
          recommendations.slice(
            0,
            10
          );

        const list =
          top
            .map((item) => {
              const icon =
                item.priority ===
                "HIGH"
                  ? "🔴"
                  : "🟠";

              let result =
                `${icon} ${item.medicineName}
Stock: ${item.currentStock} units`;

              if (
                item.incomingStock > 0
              ) {
                result +=
                  `\nIncoming: ${item.incomingStock} units`;
              }

              if (
                item.dailyAverage > 0
              ) {
                result +=
                  `\nSales/day: ${item.dailyAverage}`;
              }

              if (
                item.stockLasts !== null
              ) {
                result +=
                  `\nStock may last: ${item.stockLasts} days`;
              }

              if (
                item.daysUntilExpiry !== null
              ) {
                result +=
                  `\nExpiry: ${item.daysUntilExpiry} days`;
              }

              if (
                item.reorderQuantity > 0
              ) {
                result +=
                  `\nSuggested reorder: ${item.reorderQuantity} units`;
              }

              result +=
                `\n\nRecommendation: ${item.recommendation}`;

              return result;
            })
            .join(
              "\n\n━━━━━━━━━━━━━━\n\n"
            );

        return res.json({
          success: true,

          reply:
            `🤖 Smart Inventory Recommendations

${list}`,

          data: top,
        });
      }

      // ==================================================
      // 3. TODAY'S SALES
      // ==================================================

      if (
        text.includes("today's sales") ||
        text.includes("todays sales") ||
        text.includes("today sales") ||
        text.includes("sales today") ||
        text.includes("today revenue") ||
        text.includes("bills today") ||
        text.includes("units sold today")
      ) {
        const sales =
          await Sale.find({
            createdAt: {
              $gte:
                startOfToday(),

              $lte:
                endOfToday(),
            },
          });

        let revenue = 0;
        let unitsSold = 0;

        for (
          const sale of sales
        ) {
          revenue +=
            Number(
              sale.total
            ) || 0;

          if (
            Array.isArray(
              sale.items
            )
          ) {
            for (
              const item of sale.items
            ) {
              unitsSold +=
                Number(
                  item.quantity
                ) || 0;
            }
          }
        }

        return res.json({
          success: true,

          reply:
            `📊 Today's Sales

Bills: ${sales.length}
Units sold: ${unitsSold}
Revenue: ₹${revenue.toFixed(2)}`,

          data: {
            totalBills:
              sales.length,

            unitsSold,

            revenue,
          },
        });
      }

      // ==================================================
      // 4. RECENT SALES
      // ==================================================

      if (
        text.includes(
          "recent sales"
        ) ||
        text.includes(
          "latest sales"
        ) ||
        text.includes(
          "recent bills"
        )
      ) {
        const sales =
          await Sale.find()
            .sort({
              createdAt: -1,
            })
            .limit(10);

        if (
          sales.length === 0
        ) {
          return res.json({
            success: true,
            reply:
              "There are no recent sales.",
            data: [],
          });
        }

        const list =
          sales
            .map(
              (sale) => {
                const date =
                  new Date(
                    sale.createdAt
                  ).toLocaleDateString();

                return (
                  `• ${date} — ` +
                  `₹${(
                    Number(
                      sale.total
                    ) || 0
                  ).toFixed(2)}`
                );
              }
            )
            .join("\n");

        return res.json({
          success: true,

          reply:
            `🧾 Recent Sales

${list}`,

          data: sales,
        });
      }

      // ==================================================
      // 5. REORDER
      // ==================================================

      if (
        text.includes(
          "what should i reorder"
        ) ||
        text.includes(
          "what to reorder"
        ) ||
        text.includes(
          "what should i restock"
        ) ||
        text.includes(
          "which medicines need restocking"
        ) ||
        text.includes(
          "restock"
        ) ||
        text.includes(
          "reorder"
        )
      ) {
        const suggestions =
          await getReorderSuggestions();

        if (
          suggestions.length === 0
        ) {
          return res.json({
            success: true,

            reply:
              "✅ Current stock is sufficient. No immediate reorder is required.",

            data: [],
          });
        }

        const top =
          suggestions.slice(
            0,
            10
          );

        const list =
          top
            .map(
              (item) => {
                const icon =
                  item.priority ===
                  "HIGH"
                    ? "🔴"
                    : item.priority ===
                      "MEDIUM"
                    ? "🟠"
                    : "🟢";

                return (
                  `${icon} ${item.name}` +
                  `\nStock: ${item.currentStock}` +
                  `\nIncoming: ${item.incomingStock}` +
                  `\nMonthly demand: ${item.monthlyDemand}` +
                  `\nReorder: ${item.reorderQuantity} units`
                );
              }
            )
            .join(
              "\n\n━━━━━━━━━━━━━━\n\n"
            );

        return res.json({
          success: true,

          reply:
            `📦 Reorder Suggestions

${list}`,

          data: top,
        });
      }

      // ==================================================
      // 6. PENDING REORDERS
      // ==================================================

      if (
        text.includes(
          "pending reorders"
        ) ||
        text.includes(
          "incoming stock"
        ) ||
        text.includes(
          "already ordered"
        ) ||
        text.includes(
          "already have incoming"
        )
      ) {
        const reorders =
          await Reorder.find({
            status: {
              $in: [
                "pending",
                "ordered",
                "partially_received",
              ],
            },
          })
            .populate(
              "medicine"
            )
            .sort({
              createdAt: -1,
            });

        if (
          reorders.length === 0
        ) {
          return res.json({
            success: true,

            reply:
              "There are no pending or incoming medicine orders.",

            data: [],
          });
        }

        const list =
          reorders
            .map((order) => {
              const ordered =
                Number(
                  order.quantity
                ) || 0;

              const received =
                Number(
                  order.receivedQuantity
                ) || 0;

              const pending =
                Math.max(
                  ordered -
                    received,
                  0
                );

              return (
                `• ${order.medicineName}` +
                `\nOrdered: ${ordered}` +
                `\nReceived: ${received}` +
                `\nIncoming: ${pending}` +
                `\nStatus: ${order.status}`
              );
            })
            .join(
              "\n\n━━━━━━━━━━━━━━\n\n"
            );

        return res.json({
          success: true,

          reply:
            `📦 Pending / Incoming Reorders

${list}`,

          data: reorders,
        });
      }

      // ==================================================
      // 7. EXPIRED MEDICINES
      // ==================================================

      if (
        text.includes("expired") ||
        text.includes(
          "how many expired"
        ) ||
        text.includes(
          "expired medicines"
        )
      ) {
        const medicines =
          await Medicine.find({
            status: "expired",
          }).sort({
            expiryDate: 1,
          });

        if (
          medicines.length === 0
        ) {
          return res.json({
            success: true,

            reply:
              "✅ There are no expired medicines in the inventory.",

            data: [],
          });
        }

        const list =
          medicines
            .slice(0, 15)
            .map(
              (medicine) =>
                `• ${medicine.name} — Stock: ${medicine.quantity} — Batch: ${medicine.batchNumber || "N/A"}`
            )
            .join("\n");

        return res.json({
          success: true,

          reply:
            `⚠️ ${medicines.length} expired medicine(s)

${list}`,

          data: medicines,
        });
      }

      // ==================================================
      // 8. EXPIRES TODAY
      // ==================================================

      if (
        text.includes(
          "expires today"
        ) ||
        text.includes(
          "expire today"
        ) ||
        text.includes(
          "expiring today"
        )
      ) {
        const today =
          startOfToday();

        const tomorrow =
          addDays(today, 1);

        const medicines =
          await Medicine.find({
            expiryDate: {
              $gte: today,
              $lt: tomorrow,
            },

            status: {
              $ne: "removed",
            },
          });

        if (
          medicines.length === 0
        ) {
          return res.json({
            success: true,

            reply:
              "✅ No medicines expire today.",

            data: [],
          });
        }

        const list =
          medicines
            .map(
              (medicine) =>
                `• ${medicine.name} — Stock: ${medicine.quantity}`
            )
            .join("\n");

        return res.json({
          success: true,

          reply:
            `⚠️ ${medicines.length} medicine(s) expire today:

${list}`,

          data: medicines,
        });
      }

      // ==================================================
      // 9. EXPIRES TOMORROW
      // ==================================================

      if (
        text.includes(
          "expires tomorrow"
        ) ||
        text.includes(
          "expire tomorrow"
        ) ||
        text.includes(
          "expiring tomorrow"
        )
      ) {
        const tomorrow =
          addDays(
            startOfToday(),
            1
          );

        const dayAfter =
          addDays(
            tomorrow,
            1
          );

        const medicines =
          await Medicine.find({
            expiryDate: {
              $gte: tomorrow,
              $lt: dayAfter,
            },

            status: {
              $ne: "removed",
            },
          }).sort({
            expiryDate: 1,
          });

        if (
          medicines.length === 0
        ) {
          return res.json({
            success: true,

            reply:
              "✅ No medicines expire tomorrow.",

            data: [],
          });
        }

        const list =
          medicines
            .map(
              (medicine) =>
                `• ${medicine.name} — Stock: ${medicine.quantity}`
            )
            .join("\n");

        return res.json({
          success: true,

          reply:
            `${medicines.length} medicine(s) expire tomorrow:

${list}`,

          data: medicines,
        });
      }

      // ==================================================
      // 10. EXPIRES THIS WEEK
      // ==================================================

      if (
        text.includes(
          "expire this week"
        ) ||
        text.includes(
          "expires this week"
        ) ||
        text.includes(
          "expiring this week"
        ) ||
        text.includes(
          "next 7 days"
        )
      ) {
        const today =
          startOfToday();

        const weekEnd =
          addDays(
            today,
            7
          );

        const medicines =
          await Medicine.find({
            expiryDate: {
              $gte: today,
              $lte: weekEnd,
            },

            status: {
              $ne: "removed",
            },
          }).sort({
            expiryDate: 1,
          });

        if (
          medicines.length === 0
        ) {
          return res.json({
            success: true,

            reply:
              "✅ No medicines are expiring within the next 7 days.",

            data: [],
          });
        }

        const list =
          medicines
            .map(
              (medicine) => {
                const daysLeft =
                  daysBetween(
                    today,
                    new Date(
                      medicine.expiryDate
                    )
                  );

                return (
                  `• ${medicine.name}` +
                  ` — Stock: ${medicine.quantity}` +
                  ` — ${daysLeft} day(s) left`
                );
              }
            )
            .join("\n");

        return res.json({
          success: true,

          reply:
            `${medicines.length} medicine(s) expire within the next 7 days:

${list}`,

          data: medicines,
        });
      }

      // ==================================================
      // 11. EXPIRES THIS MONTH
      // ==================================================

      if (
        text.includes(
          "expire this month"
        ) ||
        text.includes(
          "expires this month"
        ) ||
        text.includes(
          "expiring this month"
        )
      ) {
        const today =
          startOfToday();

        const monthEnd =
          new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
          );

        const medicines =
          await Medicine.find({
            expiryDate: {
              $gte: today,
              $lte: monthEnd,
            },

            status: {
              $ne: "removed",
            },
          }).sort({
            expiryDate: 1,
          });

        if (
          medicines.length === 0
        ) {
          return res.json({
            success: true,

            reply:
              "✅ No medicines expire during this month.",

            data: [],
          });
        }

        const list =
          medicines
            .map(
              (medicine) => {
                const daysLeft =
                  daysBetween(
                    today,
                    new Date(
                      medicine.expiryDate
                    )
                  );

                return (
                  `• ${medicine.name}` +
                  ` — ${daysLeft} day(s) left` +
                  ` — Stock: ${medicine.quantity}`
                );
              }
            )
            .join("\n");

        return res.json({
          success: true,

          reply:
            `📅 ${medicines.length} medicine(s) expire this month:

${list}`,

          data: medicines,
        });
      }

      // ==================================================
      // 12. LOW STOCK
      // ==================================================

      if (
        text.includes(
          "low stock"
        ) ||
        text.includes(
          "low-stock"
        ) ||
        text.includes(
          "low inventory"
        ) ||
        text.includes(
          "short stock"
        ) ||
        text.includes(
          "critically low"
        ) ||
        text.includes(
          "running out"
        )
      ) {
        const medicines =
          await Medicine.find({
            quantity: {
              $lt:
                LOW_STOCK_THRESHOLD,
            },

            status: {
              $nin: [
                "expired",
                "removed",
              ],
            },
          }).sort({
            quantity: 1,
          });

        if (
          medicines.length === 0
        ) {
          return res.json({
            success: true,

            reply:
              "✅ No medicines are currently below the low-stock threshold.",

            data: [],
          });
        }

        const list =
          medicines
            .map(
              (medicine) =>
                `• ${medicine.name} — ${medicine.quantity} units`
            )
            .join("\n");

        return res.json({
          success: true,

          reply:
            `${medicines.length} medicine(s) have low stock:

${list}`,

          data: medicines,
        });
      }

      // ==================================================
      // 13. ZERO STOCK
      // ==================================================

      if (
        text.includes(
          "zero stock"
        ) ||
        text.includes(
          "out of stock"
        ) ||
        text.includes(
          "no stock"
        )
      ) {
        const medicines =
          await Medicine.find({
            quantity: 0,

            status: {
              $ne: "removed",
            },
          });

        if (
          medicines.length === 0
        ) {
          return res.json({
            success: true,

            reply:
              "✅ No medicines are currently out of stock.",

            data: [],
          });
        }

        const list =
          medicines
            .map(
              (medicine) =>
                `• ${medicine.name}`
            )
            .join("\n");

        return res.json({
          success: true,

          reply:
            `🔴 ${medicines.length} medicine(s) are out of stock:

${list}`,

          data: medicines,
        });
      }

      // ==================================================
      // 14. MEDICINE COUNT
      // ==================================================

      if (
        text.includes(
          "how many medicines"
        ) ||
        text.includes(
          "medicine count"
        ) ||
        text.includes(
          "total medicines"
        ) ||
        text.includes(
          "how many medicine"
        )
      ) {
        const count =
          await Medicine.countDocuments({
            status: {
              $ne: "removed",
            },
          });

        return res.json({
          success: true,

          reply:
            `You currently have ${count} medicine(s) in your inventory.`,

          data: {
            count,
          },
        });
      }

      // ==================================================
      // 15. TOTAL UNITS
      // ==================================================

      if (
        text.includes(
          "total units"
        ) ||
        text.includes(
          "how many units"
        ) ||
        text.includes(
          "total stock"
        ) ||
        text.includes(
          "total quantity"
        )
      ) {
        const medicines =
          await getActiveMedicines();

        const totalUnits =
          medicines.reduce(
            (sum, medicine) =>
              sum +
              (
                Number(
                  medicine.quantity
                ) || 0
              ),
            0
          );

        return res.json({
          success: true,

          reply:
            `📦 Total available stock: ${totalUnits} units.`,

          data: {
            totalUnits,
          },
        });
      }

      // ==================================================
      // 16. INVENTORY SUMMARY
      // ==================================================

      if (
        text.includes(
          "inventory summary"
        ) ||
        text.includes(
          "stock summary"
        ) ||
        text.includes(
          "inventory status"
        ) ||
        text.includes(
          "pharmacy summary"
        )
      ) {
        const medicines =
          await getActiveMedicines();

        const totalMedicines =
          medicines.length;

        const totalUnits =
          medicines.reduce(
            (sum, medicine) =>
              sum +
              (
                Number(
                  medicine.quantity
                ) || 0
              ),
            0
          );

        const lowStock =
          medicines.filter(
            (medicine) =>
              medicine.quantity <
                LOW_STOCK_THRESHOLD &&
              medicine.status !==
                "expired"
          ).length;

        const expired =
          medicines.filter(
            (medicine) =>
              medicine.status ===
              "expired"
          ).length;

        const critical =
          medicines.filter(
            (medicine) =>
              medicine.status ===
              "critical"
          ).length;

        return res.json({
          success: true,

          reply:
            `📊 Inventory Summary

Total medicines: ${totalMedicines}
Total units: ${totalUnits}
Low stock medicines: ${lowStock}
Expiring soon: ${critical}
Expired medicines: ${expired}`,

          data: {
            totalMedicines,
            totalUnits,
            lowStock,
            critical,
            expired,
          },
        });
      }

      // ==================================================
      // 17. EXPIRY RISK
      // ==================================================

      if (
        text.includes(
          "expiry risk"
        ) ||
        text.includes(
          "expiry-risk"
        ) ||
        text.includes(
          "expiring risk"
        ) ||
        text.includes(
          "at risk of expiring"
        ) ||
        text.includes(
          "risk of expiry"
        ) ||
        text.includes(
          "which medicines are at risk"
        ) ||
        text.includes(
          "show expiry risk"
        )
      ) {
        const riskList =
          await getExpiryRiskData();

        const riskyMedicines =
          riskList.filter(
            (item) =>
              item.risk ===
                "HIGH" ||
              item.risk ===
                "MEDIUM"
          );

        if (
          riskyMedicines.length ===
          0
        ) {
          return res.json({
            success: true,

            reply:
              "✅ No medicines currently have a significant expiry risk.",

            data: [],
          });
        }

        const list =
          riskyMedicines
            .slice(0, 10)
            .map((item) => {
              const icon =
                item.risk ===
                "HIGH"
                  ? "🔴"
                  : "🟠";

              return (
                `${icon} ${item.medicineName}` +
                ` — Stock: ${item.currentStock}` +
                ` — ${item.daysUntilExpiry} days left` +
                ` — Expected sales: ${item.expectedSalesBeforeExpiry}` +
                ` — Potential leftover: ${item.potentialLeftover}`
              );
            })
            .join("\n");

        return res.json({
          success: true,

          reply:
            `⚠️ ${riskyMedicines.length} medicine(s) have expiry risk:

${list}`,

          data:
            riskyMedicines,
        });
      }

      // ==================================================
      // 18. SEARCH MEDICINE
      // ==================================================

      const searchPatterns = [
        "stock of",
        "quantity of",
        "how many",
        "how much",
        "available",
        "do i have",
        "is there",
        "availability of",
      ];

      const isMedicineSearch =
        searchPatterns.some(
          (pattern) =>
            text.includes(pattern)
        );

      if (
        isMedicineSearch
      ) {
        let query = "";

        if (
          text.includes(
            "stock of"
          )
        ) {
          query =
            text.split(
              "stock of"
            )[1];
        } else if (
          text.includes(
            "quantity of"
          )
        ) {
          query =
            text.split(
              "quantity of"
            )[1];
        } else if (
          text.includes(
            "availability of"
          )
        ) {
          query =
            text.split(
              "availability of"
            )[1];
        } else if (
          text.includes(
            "how many"
          )
        ) {
          query =
            text.split(
              "how many"
            )[1];
        } else if (
          text.includes(
            "how much"
          )
        ) {
          query =
            text.split(
              "how much"
            )[1];
        } else if (
          text.includes(
            "do i have"
          )
        ) {
          query =
            text.split(
              "do i have"
            )[1];
        } else if (
          text.includes(
            "is there"
          )
        ) {
          query =
            text.split(
              "is there"
            )[1];
        } else if (
          text.includes(
            "available"
          )
        ) {
          query =
            text.split(
              "available"
            )[0];
        }

        query =
          query
            .replace(
              /medicine/gi,
              ""
            )
            .replace(
              /medicines/gi,
              ""
            )
            .replace(
              /available/gi,
              ""
            )
            .replace(
              /in my inventory/gi,
              ""
            )
            .replace(
              /\?/g,
              ""
            )
            .trim();

        if (query) {
          const medicines =
            await searchMedicine(
              query
            );

          if (
            medicines.length === 0
          ) {
            return res.json({
              success: true,

              reply:
                `I couldn't find "${query}" in your inventory.`,

              data: [],
            });
          }

          const list =
            medicines
              .map(
                (medicine) =>
                  `• ${medicine.name} — ${medicine.quantity} units`
              )
              .join("\n");

          return res.json({
            success: true,

            reply:
              `💊 Available Stock

${list}`,

            data:
              medicines,
          });
        }
      }

      // ==================================================
      // 19. CATEGORY SUMMARY
      // ==================================================

      if (
        text.includes(
          "category"
        ) ||
        text.includes(
          "categories"
        )
      ) {
        const medicines =
          await getActiveMedicines();

        const categoryMap = {};

        for (
          const medicine of medicines
        ) {
          const category =
            medicine.category ||
            "Uncategorized";

          categoryMap[category] =
            (categoryMap[category] ||
              0) +
            1;
        }

        const list =
          Object.entries(
            categoryMap
          )
            .map(
              ([category, count]) =>
                `• ${category}: ${count} medicine(s)`
            )
            .join("\n");

        return res.json({
          success: true,

          reply:
            `🏷️ Medicine Categories

${list}`,

          data:
            categoryMap,
        });
      }

      // ==================================================
      // 20. SUPPLIER INFORMATION
      // ==================================================

      if (
        text.includes(
          "supplier"
        ) ||
        text.includes(
          "suppliers"
        )
      ) {
        const medicines =
          await getActiveMedicines();

        const supplierMap = {};

        for (
          const medicine of medicines
        ) {
          const supplier =
            medicine.supplier ||
            "Not specified";

          if (
            !supplierMap[supplier]
          ) {
            supplierMap[supplier] =
              [];
          }

          supplierMap[supplier].push(
            medicine.name
          );
        }

        const list =
          Object.entries(
            supplierMap
          )
            .map(
              ([supplier, medicines]) =>
                `• ${supplier}: ${medicines.join(", ")}`
            )
            .join("\n");

        return res.json({
          success: true,

          reply:
            `🏪 Supplier Information

${list}`,

          data:
            supplierMap,
        });
      }

      // ==================================================
      // 21. BATCH INFORMATION
      // ==================================================

      if (
        text.includes(
          "batch"
        ) ||
        text.includes(
          "batch number"
        )
      ) {
        const medicines =
          await getActiveMedicines();

        const list =
          medicines
            .slice(0, 20)
            .map(
              (medicine) =>
                `• ${medicine.name} — Batch: ${medicine.batchNumber || "N/A"}`
            )
            .join("\n");

        return res.json({
          success: true,

          reply:
            `📦 Medicine Batch Information

${list}`,

          data:
            medicines,
        });
      }

      // ==================================================
      // 22. DEFAULT RESPONSE
      // ==================================================

      return res.json({
        success: true,

        reply:
          `I can help with your MedTracker pharmacy inventory.

Try asking:

📦 Inventory
• Give me inventory summary
• Show low stock medicines
• How many total units?

💊 Medicines
• How much Paracetamol is available?
• Do I have Amoxicillin?
• Show stock of Dolo

⏰ Expiry
• What expires today?
• What expires tomorrow?
• Which medicines expire this week?
• Which medicines expire this month?
• Which medicines are at risk of expiring?
• Show expired medicines

📦 Reorder
• What should I reorder?
• Which medicines need restocking?
• Show pending reorders
• What medicines are running out soon?

💰 Sales
• What are today's sales?
• How many bills today?
• How many units were sold today?
• What is today's revenue?
• Show recent sales

🏪 Pharmacy
• Give me smart recommendations
• What needs my attention?
• Give me pharmacy status
• Show supplier information
• Show batch information`,
      });
    } catch (error) {
      console.error(
        "AI Chat Error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to process your request.",

        error:
          error.message,
      });
    }
  }
);

module.exports = router;