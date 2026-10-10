const express = require("express");
const router = express.Router();

const Medicine = require("../models/Medicine");
const Sale = require("../models/Sale");
const auth = require("../middleware/auth");
const {
  pharmacyStaff
} = require("../middleware/rolePermissions");


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


// ======================================================
// GET SALES DATA
// LAST 90 DAYS
// ======================================================

const getSalesData = async () => {

  const ninetyDaysAgo = new Date();

  ninetyDaysAgo.setDate(
    ninetyDaysAgo.getDate() - 90
  );


  return await Sale.find({

    createdAt: {
      $gte: ninetyDaysAgo,
    },

  });

};


// ======================================================
// CALCULATE MEDICINE SALES
// ======================================================

const calculateMedicineSales = (
  medicine,
  sales
) => {

  let totalSold = 0;


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

      const itemName =
        item.medicineName ||
        item.name ||
        "";


      if (
        itemName.toLowerCase() ===
        medicine.name.toLowerCase()
      ) {

        totalSold +=
          Number(
            item.quantity
          ) || 0;

      }

    }

  }


  const dailyAverage =
    totalSold / 90;


  return {

    totalSold,

    dailyAverage:
      Number(
        dailyAverage.toFixed(2)
      ),

  };

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


  const suggestions = [];


  for (
    const medicine of medicines
  ) {

    const salesData =
      calculateMedicineSales(
        medicine,
        sales
      );


    const totalSold =
      salesData.totalSold;


    const dailyAverage =
      salesData.dailyAverage;


    const monthlyNeed =
      Math.ceil(
        dailyAverage * 30
      );


    const currentStock =
      Number(
        medicine.quantity
      ) || 0;


    let reorderQuantity =
      Math.max(
        monthlyNeed -
        currentStock,
        0
      );


    // Very low stock fallback
    if (
      currentStock < 20 &&
      reorderQuantity === 0
    ) {

      reorderQuantity = 50;

    }


    let stockLasts = 0;


    if (
      dailyAverage > 0
    ) {

      stockLasts =
        currentStock /
        dailyAverage;

    }


    let priority = "LOW";


    if (
      currentStock < 10
    ) {

      priority = "HIGH";

    } else if (
      currentStock < 20
    ) {

      priority = "MEDIUM";

    }


    if (
      currentStock < 20 ||
      reorderQuantity > 0
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

        soldLast90Days:
          totalSold,

        dailyAverage,

        monthlyNeed,

        reorderQuantity,

        stockLasts:
          Number(
            stockLasts.toFixed(1)
          ),

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
// EXPIRY RISK DATA
// ======================================================

const getExpiryRiskData = async () => {

  const today =
    startOfToday();


  const riskEndDate =
    new Date(today);


  riskEndDate.setDate(
    riskEndDate.getDate() + 90
  );


  const medicines =
    await Medicine.find({

      expiryDate: {
        $gte: today,
        $lte: riskEndDate,
      },

      status: {
        $nin: [
          "expired",
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


  for (
    const medicine of medicines
  ) {

    const salesData =
      calculateMedicineSales(
        medicine,
        sales
      );


    const totalSold =
      salesData.totalSold;


    const dailyAverage =
      salesData.dailyAverage;


    const expiryDate =
      new Date(
        medicine.expiryDate
      );


    const daysUntilExpiry =
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


    const expectedSalesBeforeExpiry =
      Math.floor(

        dailyAverage *
        daysUntilExpiry

      );


    const currentStock =
      Number(
        medicine.quantity
      ) || 0;


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

    }

    else if (
      daysUntilExpiry <= 30 &&
      potentialLeftover > 0
    ) {

      risk = "HIGH";

    }

    else if (
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

    HIGH: 1,

    MEDIUM: 2,

    LOW: 3,

  };


  riskList.sort(
    (a, b) =>
      riskOrder[a.risk] -
      riskOrder[b.risk]
  );


  return riskList;

};


// ======================================================
// STEP 7
// AI SMART INVENTORY RECOMMENDATIONS
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


  const today =
    startOfToday();


  const recommendations = [];


  for (
    const medicine of medicines
  ) {

    // -----------------------------------------------
    // SALES
    // -----------------------------------------------

    const salesData =
      calculateMedicineSales(
        medicine,
        sales
      );


    const totalSold =
      salesData.totalSold;


    const dailyAverage =
      salesData.dailyAverage;


    // -----------------------------------------------
    // STOCK
    // -----------------------------------------------

    const currentStock =
      Number(
        medicine.quantity
      ) || 0;


    let stockLasts =
      null;


    if (
      dailyAverage > 0
    ) {

      stockLasts =
        currentStock /
        dailyAverage;

    }


    // -----------------------------------------------
    // MONTHLY DEMAND
    // -----------------------------------------------

    const monthlyDemand =
      Math.ceil(
        dailyAverage * 30
      );


    // -----------------------------------------------
    // REORDER QUANTITY
    // -----------------------------------------------

    let reorderQuantity =
      Math.max(
        monthlyDemand -
        currentStock,
        0
      );


    // -----------------------------------------------
    // EXPIRY ANALYSIS
    // -----------------------------------------------

    let daysUntilExpiry =
      null;


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

          expiryRisk =
            "HIGH";

        }

        else if (
          daysUntilExpiry <= 30 &&
          potentialLeftover > 0
        ) {

          expiryRisk =
            "HIGH";

        }

        else if (
          daysUntilExpiry <= 60 &&
          potentialLeftover > 0
        ) {

          expiryRisk =
            "MEDIUM";

        }


        if (
          totalSold === 0 &&
          daysUntilExpiry <= 30
        ) {

          expiryRisk =
            "HIGH";

        }

      }

    }


    // -----------------------------------------------
    // SMART DECISION
    // -----------------------------------------------

    let priority =
      "LOW";


    let action =
      "MONITOR";


    let recommendation =
      "Stock level looks healthy. No immediate action required.";


    // =================================================
    // CASE 1
    // HIGH EXPIRY RISK
    // =================================================

    if (
      expiryRisk === "HIGH" &&
      potentialLeftover > 0
    ) {

      priority =
        "HIGH";


      action =
        "PRIORITIZE_SALE";


      recommendation =
        "Prioritize this batch for sale. Avoid unnecessary reordering because stock may remain unsold until expiry.";

    }


    // =================================================
    // CASE 2
    // LOW STOCK + NO EXPIRY RISK
    // =================================================

    else if (
      currentStock < 10 &&
      expiryRisk !== "HIGH"
    ) {

      priority =
        "HIGH";


      action =
        "REORDER";


      if (
        reorderQuantity <= 0
      ) {

        reorderQuantity =
          Math.max(
            50,
            monthlyDemand -
            currentStock
          );

      }


      recommendation =
        `Reorder soon. Suggested reorder quantity: ${reorderQuantity} units.`;

    }


    // =================================================
    // CASE 3
    // STOCK RUNNING OUT SOON
    // =================================================

    else if (
      stockLasts !== null &&
      stockLasts <= 7 &&
      expiryRisk !== "HIGH"
    ) {

      priority =
        "HIGH";


      action =
        "REORDER";


      if (
        reorderQuantity <= 0
      ) {

        reorderQuantity =
          Math.max(
            50,
            monthlyDemand -
            currentStock
          );

      }


      recommendation =
        `Current stock may last only ${stockLasts.toFixed(1)} days. Reorder approximately ${reorderQuantity} units.`;

    }


    // =================================================
    // CASE 4
    // MEDIUM EXPIRY RISK
    // =================================================

    else if (
      expiryRisk === "MEDIUM" &&
      potentialLeftover > 0
    ) {

      priority =
        "MEDIUM";


      action =
        "MONITOR_EXPIRY";


      recommendation =
        "Monitor this batch closely and prioritize sales before expiry.";

    }


    // =================================================
    // CASE 5
    // LOW STOCK
    // =================================================

    else if (
      currentStock < 20
    ) {

      priority =
        "MEDIUM";


      action =
        "PLAN_REORDER";


      if (
        reorderQuantity <= 0
      ) {

        reorderQuantity =
          Math.max(
            50,
            monthlyDemand -
            currentStock
          );

      }


      recommendation =
        `Stock is low. Plan a reorder of approximately ${reorderQuantity} units.`;

    }


    // =================================================
    // CASE 6
    // HEALTHY STOCK
    // =================================================

    else {

      priority =
        "LOW";


      action =
        "MONITOR";


      recommendation =
        "Stock level looks healthy. No immediate action required.";

    }


    // =================================================
    // ADD ONLY RELEVANT ITEMS
    // =================================================

    if (
      action !== "MONITOR" ||
      priority !== "LOW"
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

        soldLast90Days:
          totalSold,

        dailyAverage,

        monthlyDemand,

        stockLasts:
          stockLasts !== null
            ? Number(
                stockLasts.toFixed(1)
              )
            : null,

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


  // =================================================
  // PRIORITY SORT
  // =================================================

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
        text.includes("what can i ask")
      ) {

        return res.json({

          success: true,

          reply:
            `I can help you with your pharmacy inventory.

You can ask:

• What are today's sales?
• What expires today?
• What expires tomorrow?
• Which medicines expire this week?
• Show low stock medicines
• What should I reorder?
• How many expired medicines?
• How many Dolo are available?
• Which medicines are at risk of expiring?
• Give me smart recommendations
• What should I do with my inventory?
• What needs my attention?
• Which medicines need immediate action?
• Give me inventory summary`,

        });

      }


      // ==================================================
      // 2. SMART INVENTORY RECOMMENDATIONS
      // ==================================================

      if (
        text.includes(
          "what should i do with my inventory"
        ) ||

        text.includes(
          "give me smart recommendations"
        ) ||

        text.includes(
          "smart recommendations"
        ) ||

        text.includes(
          "what needs my attention"
        ) ||

        text.includes(
          "which medicines need immediate action"
        ) ||

        text.includes(
          "immediate action"
        ) ||

        text.includes(
          "inventory recommendations"
        ) ||

        text.includes(
          "smart inventory"
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
              "Your inventory looks healthy. I don't see any medicines requiring immediate action.",

            data: [],

          });

        }


        const topRecommendations =
          recommendations.slice(
            0,
            10
          );


        const list =
          topRecommendations
            .map(
              (item) => {

                let icon =
                  "🟢";


                if (
                  item.priority ===
                  "HIGH"
                ) {

                  icon =
                    "🔴";

                }

                else if (
                  item.priority ===
                  "MEDIUM"
                ) {

                  icon =
                    "🟠";

                }


                let details =
                  `${icon} ${item.medicineName}

Stock: ${item.currentStock} units
Sales/day: ${item.dailyAverage}`;


                if (
                  item.stockLasts !== null
                ) {

                  details +=
                    `\nStock may last: ${item.stockLasts} days`;

                }


                if (
                  item.daysUntilExpiry !== null &&
                  item.daysUntilExpiry >= 0
                ) {

                  details +=
                    `\nExpiry: ${item.daysUntilExpiry} days`;

                }


                if (
                  item.expectedSalesBeforeExpiry !== null
                ) {

                  details +=
                    `\nExpected sales before expiry: ${item.expectedSalesBeforeExpiry}`;

                }


                if (
                  item.potentialLeftover !== null
                ) {

                  details +=
                    `\nPotential leftover: ${item.potentialLeftover}`;

                }


                if (
                  item.reorderQuantity > 0
                ) {

                  details +=
                    `\nSuggested reorder: ${item.reorderQuantity} units`;

                }


                details +=
                  `\n\nRecommendation: ${item.recommendation}`;


                return details;

              }
            )
            .join("\n\n━━━━━━━━━━━━━━\n\n");


        return res.json({

          success: true,

          reply:
            `🤖 Smart Inventory Recommendations

${list}`,

          data:
            topRecommendations,

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
        text.includes("today revenue")
      ) {

        const sales =
          await Sale.find({

            createdAt: {
              $gte: startOfToday(),
              $lte: endOfToday(),
            },

          });


        let revenue = 0;

        let profit = 0;

        let unitsSold = 0;


        for (
          const sale of sales
        ) {

          revenue +=
            Number(
              sale.total
            ) || 0;


          profit +=
            Number(
              sale.profit
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
            `Today's sales:

Bills: ${sales.length}
Units sold: ${unitsSold}
Revenue: ₹${revenue.toFixed(2)}
Profit: ₹${profit.toFixed(2)}`,

          data: {

            totalBills:
              sales.length,

            unitsSold,

            revenue,

            profit,

          },

        });

      }


      // ==================================================
      // 4. REORDER SUGGESTIONS
      // ==================================================

      if (
        text.includes("what should i reorder") ||
        text.includes("what to reorder") ||
        text.includes("reorder") ||
        text.includes("restock") ||
        text.includes("what should i restock")
      ) {

        const suggestions =
          await getReorderSuggestions();


        if (
          suggestions.length === 0
        ) {

          return res.json({

            success: true,

            reply:
              "Your current stock looks sufficient. No immediate reorder is required.",

            data: [],

          });

        }


        const topSuggestions =
          suggestions.slice(
            0,
            10
          );


        const list =
          topSuggestions
            .map(
              (item) =>
                `${item.priority === "HIGH"
                  ? "🔴"
                  : item.priority === "MEDIUM"
                  ? "🟠"
                  : "🟢"
                } ${item.name} — Stock: ${item.currentStock} — Reorder: ${item.reorderQuantity} units`
            )
            .join("\n");


        return res.json({

          success: true,

          reply:
            `Here are the medicines that may need reordering:

${list}`,

          data:
            topSuggestions,

        });

      }


      // ==================================================
      // 5. EXPIRED MEDICINES
      // ==================================================

      if (
        text.includes("expired") ||
        text.includes("how many expired") ||
        text.includes("expired medicines")
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
              "There are no expired medicines in the inventory.",

            data: [],

          });

        }


        const list =
          medicines
            .slice(0, 10)
            .map(
              (medicine) =>
                `• ${medicine.name} — Stock: ${medicine.quantity}`
            )
            .join("\n");


        return res.json({

          success: true,

          reply:
            `There are ${medicines.length} expired medicine(s).

${list}`,

          data:
            medicines,

        });

      }


      // ==================================================
      // 6. EXPIRES TODAY
      // ==================================================

      if (
        text.includes("expires today") ||
        text.includes("expire today") ||
        text.includes("expiring today")
      ) {

        const today =
          startOfToday();


        const tomorrow =
          new Date(today);


        tomorrow.setDate(
          tomorrow.getDate() + 1
        );


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
              "No medicines expire today.",

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
            `${medicines.length} medicine(s) expire today:

${list}`,

          data:
            medicines,

        });

      }


      // ==================================================
      // 7. EXPIRES TOMORROW
      // ==================================================

      if (
        text.includes("expires tomorrow") ||
        text.includes("expire tomorrow") ||
        text.includes("expiring tomorrow")
      ) {

        const tomorrow =
          new Date(
            startOfToday()
          );


        tomorrow.setDate(
          tomorrow.getDate() + 1
        );


        const dayAfterTomorrow =
          new Date(tomorrow);


        dayAfterTomorrow.setDate(
          dayAfterTomorrow.getDate() + 1
        );


        const medicines =
          await Medicine.find({

            expiryDate: {

              $gte: tomorrow,

              $lt:
                dayAfterTomorrow,

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
              "No medicines expire tomorrow.",

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

          data:
            medicines,

        });

      }


      // ==================================================
      // 8. EXPIRES THIS WEEK
      // ==================================================

      if (
        text.includes("expire this week") ||
        text.includes("expires this week") ||
        text.includes("expiring this week")
      ) {

        const today =
          startOfToday();


        const weekEnd =
          new Date(today);


        weekEnd.setDate(
          weekEnd.getDate() + 7
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
              "No medicines are expiring within the next 7 days.",

            data: [],

          });

        }


        const list =
          medicines
            .map(
              (medicine) => {

                const expiry =
                  new Date(
                    medicine.expiryDate
                  );


                const daysLeft =
                  Math.ceil(

                    (
                      expiry -
                      today
                    ) /

                    (
                      1000 *
                      60 *
                      60 *
                      24
                    )

                  );


                return (
                  `• ${medicine.name} — ` +
                  `Stock: ${medicine.quantity} — ` +
                  `${daysLeft} day(s) left`
                );

              }
            )
            .join("\n");


        return res.json({

          success: true,

          reply:
            `${medicines.length} medicine(s) expire within the next 7 days:

${list}`,

          data:
            medicines,

        });

      }


      // ==================================================
      // 9. LOW STOCK
      // ==================================================

      if (
        text.includes("low stock") ||
        text.includes("low-stock") ||
        text.includes("low inventory") ||
        text.includes("short stock")
      ) {

        const medicines =
          await Medicine.find({

            quantity: {
              $lt: 20,
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
              "No medicines are currently below the low-stock threshold.",

            data: [],

          });

        }


        const list =
          medicines
            .slice(0, 15)
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

          data:
            medicines,

        });

      }


      // ==================================================
      // 10. MEDICINE COUNT
      // ==================================================

      if (
        text.includes("how many medicines") ||
        text.includes("medicine count") ||
        text.includes("how many medicine") ||
        text.includes("total medicines")
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
      // 11. MEDICINE SEARCH
      // ==================================================

      const searchPatterns = [

        "how many",

        "how much",

        "available",

        "stock of",

        "quantity of",

        "do i have",

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
          text.includes("stock of")
        ) {

          query =
            text.split(
              "stock of"
            )[1];

        }

        else if (
          text.includes("quantity of")
        ) {

          query =
            text.split(
              "quantity of"
            )[1];

        }

        else if (
          text.includes("how many")
        ) {

          query =
            text.split(
              "how many"
            )[1];

        }

        else if (
          text.includes("how much")
        ) {

          query =
            text.split(
              "how much"
            )[1];

        }

        else if (
          text.includes("available")
        ) {

          query =
            text.split(
              "available"
            )[0];

        }

        else if (
          text.includes("do i have")
        ) {

          query =
            text.split(
              "do i have"
            )[1];

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
              /\?/g,
              ""
            )
            .trim();


        if (
          query
        ) {

          const medicines =
            await Medicine.find({

              name: {

                $regex:
                  query,

                $options:
                  "i",

              },

              status: {

                $ne:
                  "removed",

              },

            });


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
              `Here is the available stock:

${list}`,

            data:
              medicines,

          });

        }

      }


      // ==================================================
      // 12. EXPIRY RISK
      // ==================================================

      if (
        text.includes("expiry risk") ||
        text.includes("expiry-risk") ||
        text.includes("expiring risk") ||
        text.includes("at risk of expiring") ||
        text.includes("risk of expiry") ||
        text.includes("which medicines are at risk") ||
        text.includes("show expiry risk")
      ) {

        const riskList =
          await getExpiryRiskData();


        const riskyMedicines =
          riskList.filter(
            (item) =>
              item.risk === "HIGH" ||
              item.risk === "MEDIUM"
          );


        if (
          riskyMedicines.length === 0
        ) {

          return res.json({

            success: true,

            reply:
              "Good news! No medicines currently have a significant expiry risk.",

            data: [],

          });

        }


        const list =
          riskyMedicines
            .slice(0, 10)
            .map(
              (item) => {

                const icon =
                  item.risk === "HIGH"
                    ? "🔴"
                    : "🟠";


                return (
                  `${icon} ${item.medicineName}` +
                  ` — Stock: ${item.currentStock}` +
                  ` — ${item.daysUntilExpiry} days left` +
                  ` — Expected sales: ${item.expectedSalesBeforeExpiry}` +
                  ` — Potential leftover: ${item.potentialLeftover}`
                );

              }
            )
            .join("\n");


        return res.json({

          success: true,

          reply:
            `I found ${riskyMedicines.length} medicine(s) with expiry risk:

${list}`,

          data:
            riskyMedicines,

        });

      }


      // ==================================================
      // 13. INVENTORY SUMMARY
      // ==================================================

      if (
        text.includes("inventory summary") ||
        text.includes("stock summary") ||
        text.includes("inventory status") ||
        text.includes("pharmacy summary")
      ) {

        const medicines =
          await Medicine.find({

            status: {
              $ne: "removed",
            },

          });


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


        const expired =
          medicines.filter(
            (medicine) =>
              medicine.status ===
              "expired"
          ).length;


        const lowStock =
          medicines.filter(
            (medicine) =>
              medicine.quantity < 20 &&
              medicine.status !==
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
            `Inventory Summary:

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
      // 14. DEFAULT RESPONSE
      // ==================================================

      return res.json({

        success: true,

        reply:
          `I can help with your MedTracker inventory.

Try asking:

• What are today's sales?
• What expires today?
• What expires tomorrow?
• Which medicines expire this week?
• Show low stock medicines
• What should I reorder?
• Which medicines are at risk of expiring?
• Give me smart recommendations
• What should I do with my inventory?
• What needs my attention?
• Which medicines need immediate action?
• Give me inventory summary`,

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