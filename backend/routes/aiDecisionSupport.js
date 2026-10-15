const express = require("express");
const path = require("path");
const { spawn } = require("child_process");

const router = express.Router();

const Medicine = require("../models/Medicine");
const Sale = require("../models/Sale");
const Reorder = require("../models/Reorder");


// ============================================================
// PATHS
// ============================================================

const PROJECT_ROOT = path.join(
    __dirname,
    "..",
    ".."
);

const PREDICTOR_FILE = path.join(
    PROJECT_ROOT,
    "ml",
    "prediction",
    "predict_demand.py"
);


// ============================================================
// PYTHON
// ============================================================

const VENV_PYTHON =
    process.platform === "win32"
        ? path.join(
            PROJECT_ROOT,
            "ml",
            "venv",
            "Scripts",
            "python.exe"
        )
        : path.join(
            PROJECT_ROOT,
            "ml",
            "venv",
            "bin",
            "python"
        );

const SYSTEM_PYTHON =
    process.platform === "win32"
        ? "python"
        : "python3";


// ============================================================
// CONSTANTS
// ============================================================

const ACTIVE_REORDER_STATUSES = [
    "pending",
    "ordered",
    "partially_received"
];

const LEAD_TIME_DAYS = 7;

const SAFETY_STOCK_FACTOR = 0.50;

const DEFAULT_MINIMUM_STOCK = 5;


// ============================================================
// BASIC HELPERS
// ============================================================

function toNumber(value) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}


function normalizeMedicineName(name) {

    return String(name || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}


function dateKey(value) {

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function startOfDay(value) {

    const date = new Date(value);

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date;
}


function addDays(date, days) {

    const result = new Date(date);

    result.setDate(
        result.getDate() + days
    );

    return result;
}


function average(values) {

    if (!values.length) {
        return 0;
    }

    return values.reduce(
        (sum, value) =>
            sum + toNumber(value),
        0
    ) / values.length;
}


// ============================================================
// ISO WEEK
// ============================================================

function getISOWeek(date) {

    const target =
        new Date(date.valueOf());

    const dayNumber =
        (date.getDay() + 6) % 7;

    target.setDate(
        target.getDate()
        - dayNumber
        + 3
    );

    const firstThursday =
        new Date(
            target.getFullYear(),
            0,
            4
        );

    return (
        1 +
        Math.round(
            (
                target -
                firstThursday
            ) /
            86400000 /
            7
        )
    );
}


// ============================================================
// RUN PYTHON XGBOOST
// ============================================================

function runXGBoost(records) {

    return new Promise(
        (resolve, reject) => {

            const pythonCommands = [
                VENV_PYTHON,
                SYSTEM_PYTHON
            ];

            let index = 0;

            function runNext() {

                if (
                    index >=
                    pythonCommands.length
                ) {

                    reject(
                        new Error(
                            "Python interpreter not found."
                        )
                    );

                    return;
                }

                const python =
                    pythonCommands[index++];

                const process =
                    spawn(
                        python,
                        [PREDICTOR_FILE],
                        {
                            cwd:
                                PROJECT_ROOT,

                            windowsHide:
                                true
                        }
                    );

                let stdout = "";
                let stderr = "";

                process.stdout.on(
                    "data",
                    data => {
                        stdout +=
                            data.toString();
                    }
                );

                process.stderr.on(
                    "data",
                    data => {
                        stderr +=
                            data.toString();
                    }
                );

                process.on(
                    "error",
                    error => {

                        if (
                            error.code ===
                            "ENOENT"
                        ) {

                            runNext();

                            return;
                        }

                        reject(error);
                    }
                );

                process.on(
                    "close",
                    code => {

                        if (code !== 0) {

                            if (
                                index <
                                pythonCommands.length
                            ) {

                                runNext();

                                return;
                            }

                            reject(
                                new Error(
                                    stderr ||
                                    `Python exited with code ${code}`
                                )
                            );

                            return;
                        }

                        try {

                            const result =
                                JSON.parse(
                                    stdout.trim()
                                );

                            if (
                                result.success ===
                                false
                            ) {

                                throw new Error(
                                    result.message
                                );
                            }

                            resolve(result);

                        } catch (error) {

                            reject(
                                new Error(
                                    `Invalid XGBoost response: ${error.message}`
                                )
                            );
                        }
                    }
                );

                process.stdin.write(
                    JSON.stringify({
                        records
                    })
                );

                process.stdin.end();
            }

            runNext();
        }
    );
}


// ============================================================
// BUILD SALES HISTORY
// ============================================================

function buildSalesHistory(
    sales,
    medicines
) {

    const medicineMap =
        new Map();

    for (
        const medicine of medicines
    ) {

        medicineMap.set(
            String(medicine._id),
            normalizeMedicineName(
                medicine.name
            )
        );
    }


    const dailySales =
        new Map();


    for (
        const sale of sales
    ) {

        const saleDate =
            dateKey(
                sale.createdAt
            );

        if (!saleDate) {
            continue;
        }


        for (
            const item of (
                sale.items || []
            )
        ) {

            let group = "";


            // Prefer Medicine ObjectId
            if (item.medicine) {

                group =
                    medicineMap.get(
                        String(
                            item.medicine
                        )
                    ) || "";
            }


            // Fallback to medicineName
            if (!group) {

                group =
                    normalizeMedicineName(
                        item.medicineName
                    );
            }


            if (!group) {
                continue;
            }


            const quantity =
                Math.max(
                    0,
                    toNumber(
                        item.quantity
                    )
                );


            if (
                !dailySales.has(group)
            ) {

                dailySales.set(
                    group,
                    new Map()
                );
            }


            const medicineDaily =
                dailySales.get(
                    group
                );


            medicineDaily.set(
                saleDate,
                (
                    medicineDaily.get(
                        saleDate
                    ) || 0
                ) + quantity
            );
        }
    }


    return dailySales;
}


// ============================================================
// BUILD XGBOOST FEATURES
// ============================================================

function buildForecastRecords(
    medicines,
    dailySales
) {

    const today =
        startOfDay(
            new Date()
        );


    /*
       Need enough history for:

       lag 1
       lag 7
       rolling 7
       rolling 14
       rolling 30
    */

    const historyStart =
        addDays(
            today,
            -60
        );


    const dates = [];


    for (
        let date =
            new Date(historyStart);

        date < today;

        date =
            addDays(
                date,
                1
            )
    ) {

        dates.push(
            dateKey(date)
        );
    }


    const records = [];


    for (
        const medicine of medicines
    ) {

        const group =
            normalizeMedicineName(
                medicine.name
            );


        const groupSales =
            dailySales.get(group) ||
            new Map();


        const series =
            dates.map(
                date =>
                    toNumber(
                        groupSales.get(
                            date
                        )
                    )
            );


        const last7 =
            series.slice(-7);

        const last14 =
            series.slice(-14);

        const last30 =
            series.slice(-30);


        const dayOfWeek =
            today.getDay() === 0
                ? 6
                : today.getDay() - 1;


        records.push({

            medicineGroup:
                group,

            medicineName:
                medicine.name,

            date:
                dateKey(today),


            day_of_week:
                dayOfWeek,

            day_of_month:
                today.getDate(),

            month:
                today.getMonth() + 1,

            week_of_year:
                getISOWeek(today),


            lag_1:
                series.length >= 1
                    ? series[
                        series.length - 1
                    ]
                    : 0,


            lag_7:
                series.length >= 7
                    ? series[
                        series.length - 7
                    ]
                    : 0,


            rolling_7:
                average(last7),


            rolling_14:
                average(last14),


            rolling_30:
                average(last30),


            actual:
                series.length >= 1
                    ? series[
                        series.length - 1
                    ]
                    : 0,


            averageDailyDemand:
                average(last30)
        });
    }


    return records;
}


// ============================================================
// EXPIRY RISK
// ============================================================

function calculateExpiryRisk(
    medicine,
    averageDemand
) {

    const today =
        startOfDay(
            new Date()
        );


    const expiryDate =
        startOfDay(
            medicine.expiryDate
        );


    const daysToExpiry =
        Math.floor(
            (
                expiryDate -
                today
            ) /
            86400000
        );


    const currentStock =
        Math.max(
            0,
            toNumber(
                medicine.quantity
            )
        );


    const purchasePrice =
        Math.max(
            0,
            toNumber(
                medicine.purchasePrice
            )
        );


    const demand =
        Math.max(
            0,
            toNumber(
                averageDemand
            )
        );


    // --------------------------------------------------
    // EXPIRED
    // --------------------------------------------------

    if (
        daysToExpiry <= 0
    ) {

        return {

            medicineName:
                medicine.name,

            batchNumber:
                medicine.batchNumber,

            currentStock,

            daysToExpiry,

            riskScore: 100,

            riskLevel:
                "EXPIRED",

            potentialWasteValue:
                currentStock *
                purchasePrice
        };
    }


    // --------------------------------------------------
    // No demand + long expiry
    // --------------------------------------------------

    if (
        demand === 0 &&
        daysToExpiry > 60
    ) {

        return {

            medicineName:
                medicine.name,

            batchNumber:
                medicine.batchNumber,

            currentStock,

            daysToExpiry,

            riskScore: 0,

            riskLevel:
                "LOW",

            potentialWasteValue: 0
        };
    }


    const expectedDemand =
        demand *
        Math.max(
            daysToExpiry,
            0
        );


    const excessStock =
        Math.max(
            0,
            currentStock -
            expectedDemand
        );


    const wasteValue =
        excessStock *
        purchasePrice;


    const stockCoverDays =
        demand > 0
            ? currentStock /
              demand
            : Infinity;


    // --------------------------------------------------
    // TIME SCORE
    // --------------------------------------------------

    let timeScore = 10;

    if (
        daysToExpiry <= 7
    ) {

        timeScore = 100;

    } else if (
        daysToExpiry <= 15
    ) {

        timeScore = 85;

    } else if (
        daysToExpiry <= 30
    ) {

        timeScore = 70;

    } else if (
        daysToExpiry <= 60
    ) {

        timeScore = 50;

    } else if (
        daysToExpiry <= 90
    ) {

        timeScore = 30;
    }


    // --------------------------------------------------
    // EXCESS STOCK SCORE
    // --------------------------------------------------

    const excessRatio =
        currentStock > 0
            ? excessStock /
              currentStock
            : 0;


    let excessScore = 0;

    if (
        excessRatio >= 0.75
    ) {

        excessScore = 100;

    } else if (
        excessRatio >= 0.50
    ) {

        excessScore = 80;

    } else if (
        excessRatio >= 0.25
    ) {

        excessScore = 60;

    } else if (
        excessRatio > 0
    ) {

        excessScore = 35;
    }


    // --------------------------------------------------
    // COVER SCORE
    // --------------------------------------------------

    let coverageScore = 10;


    if (
        !Number.isFinite(
            stockCoverDays
        )
    ) {

        coverageScore = 80;

    } else if (
        stockCoverDays >
        daysToExpiry
    ) {

        const ratio =
            stockCoverDays /
            Math.max(
                daysToExpiry,
                1
            );


        if (ratio >= 3) {

            coverageScore = 100;

        } else if (
            ratio >= 2
        ) {

            coverageScore = 80;

        } else {

            coverageScore = 60;
        }
    }


    // --------------------------------------------------
    // FINAL SCORE
    // --------------------------------------------------

    const riskScore =
        (
            timeScore * 0.40
        ) +
        (
            excessScore * 0.35
        ) +
        (
            coverageScore * 0.25
        );


    let riskLevel =
        "LOW";


    if (
        riskScore >= 75
    ) {

        riskLevel =
            "CRITICAL";

    } else if (
        riskScore >= 50
    ) {

        riskLevel =
            "HIGH";

    } else if (
        riskScore >= 25
    ) {

        riskLevel =
            "MEDIUM";
    }


    return {

        medicineName:
            medicine.name,

        batchNumber:
            medicine.batchNumber,

        currentStock,

        daysToExpiry,

        riskScore:
            Number(
                riskScore.toFixed(2)
            ),

        riskLevel,

        potentialWasteValue:
            Number(
                wasteValue.toFixed(2)
            )
    };
}


// ============================================================
// REORDER DECISION
// ============================================================

function calculateReorder(
    medicine,
    predictedDemand,
    expiryRisk
) {

    const currentStock =
        Math.max(
            0,
            toNumber(
                medicine.quantity
            )
        );


    const incomingStock =
        Math.max(
            0,
            toNumber(
                medicine.outstandingQuantity
            )
        );


    const effectiveStock =
        currentStock +
        incomingStock;


    // --------------------------------------------------
    // Never reorder expired medicine
    // --------------------------------------------------

    if (
        expiryRisk === "EXPIRED"
    ) {

        return {

            reorderQuantity: 0,

            priority:
                "CRITICAL",

            priorityScore: 100,

            stockCoverDays: 0,

            estimatedDailyDemand: 0,

            recommendation:
                "Remove expired stock immediately and do not reorder this batch."
        };
    }


    const demand =
        Math.max(
            0,
            toNumber(
                predictedDemand
            )
        );


    const leadTimeDemand =
        demand *
        LEAD_TIME_DAYS;


    const safetyStock =
        demand *
        LEAD_TIME_DAYS *
        SAFETY_STOCK_FACTOR;


    const targetStock =
        leadTimeDemand +
        safetyStock +
        DEFAULT_MINIMUM_STOCK;


    const reorderQuantity =
        Math.max(
            0,
            Math.ceil(
                targetStock -
                effectiveStock
            )
        );


    const stockCoverDays =
        demand > 0
            ? effectiveStock /
              demand
            : Infinity;


    let stockoutRisk =
        "LOW";


    if (
        effectiveStock <= 0
    ) {

        stockoutRisk =
            "CRITICAL";

    } else if (
        demand > 0 &&
        stockCoverDays <= 7
    ) {

        stockoutRisk =
            "HIGH";

    } else if (
        demand > 0 &&
        stockCoverDays <= 14
    ) {

        stockoutRisk =
            "MEDIUM";
    }


    let priority =
        "LOW";


    if (
        stockoutRisk ===
        "CRITICAL"
    ) {

        priority =
            "CRITICAL";

    } else if (
        stockoutRisk === "HIGH" ||
        expiryRisk === "HIGH" ||
        expiryRisk === "CRITICAL"
    ) {

        priority =
            "HIGH";

    } else if (
        reorderQuantity > 0
    ) {

        priority =
            "MEDIUM";
    }


    const scoreMap = {

        CRITICAL: 50,

        HIGH: 40,

        MEDIUM: 25,

        LOW: 5
    };


    const expiryScoreMap = {

        EXPIRED: 50,

        CRITICAL: 40,

        HIGH: 30,

        MEDIUM: 15,

        LOW: 5
    };


    const priorityScore =
        Math.min(
            100,

            (
                scoreMap[
                    stockoutRisk
                ] || 5
            ) +

            (
                expiryScoreMap[
                    expiryRisk
                ] || 5
            )
        );


    let recommendation;


    if (
        expiryRisk === "HIGH"
    ) {

        recommendation =
            reorderQuantity > 0

                ? `Review existing expiry-risk stock before reordering. Suggested quantity: ${reorderQuantity} units.`

                : "Do not reorder currently. Review existing high-risk stock.";

    } else if (
        reorderQuantity > 0
    ) {

        recommendation =
            `Reorder approximately ${reorderQuantity} units based on XGBoost demand, lead time and safety stock.`;

    } else {

        recommendation =
            "Current inventory is sufficient. Continue monitoring demand.";
    }


    return {

        reorderQuantity,

        priority,

        priorityScore,

        stockCoverDays:
            Number.isFinite(
                stockCoverDays
            )
                ? Number(
                    stockCoverDays.toFixed(2)
                )
                : null,

        estimatedDailyDemand:
            Number(
                demand.toFixed(3)
            ),

        recommendation
    };
}


// ============================================================
// MAIN API
// ============================================================

router.get(
    "/",
    async (req, res) => {

        try {

            console.log(
                "🤖 LIVE AI Decision Support"
            );


            // ==================================================
            // 1. CURRENT MEDICINES
            // ==================================================

            const medicines =
                await Medicine.find({

                    status: {
                        $ne: "removed"
                    }

                }).lean();


            console.log(
                `📦 Current medicines: ${medicines.length}`
            );


            // ==================================================
            // EMPTY INVENTORY
            // ==================================================

            if (
                medicines.length === 0
            ) {

                return res.json({

                    success: true,

                    generatedAt:
                        new Date().toISOString(),

                    module:
                        "AI Decision Support",

                    summary: {

                        totalMedicineBatches: 0,

                        expiredCount: 0,

                        criticalCount: 0,

                        highRiskCount: 0,

                        mediumRiskCount: 0,

                        lowRiskCount: 0,

                        totalPotentialWasteValue: 0,

                        reorderRecommendationCount: 0,

                        totalSuggestedReorderUnits: 0
                    },


                    expiryRisk: {

                        summary: {

                            expired: 0,

                            critical: 0,

                            high: 0,

                            medium: 0,

                            low: 0
                        },

                        priorityMedicines: []
                    },


                    smartReorder: {

                        totalRecommendations: 0,

                        totalUnits: 0,

                        recommendations: []
                    },


                    demandForecast: {

                        model:
                            "XGBoost",

                        evaluation:
                            null,

                        summary: {

                            records: 0,

                            averageActualDemand:
                                "0.00",

                            averagePredictedDemand:
                                "0.00"
                        },

                        recentPredictions: []
                    },


                    actions: [

                        {

                            type:
                                "SYSTEM",

                            priority:
                                "LOW",

                            message:
                                "No current medicine inventory is available."
                        }
                    ]
                });
            }


            // ==================================================
            // 2. SALES HISTORY
            // ==================================================

            const historyStart =
                addDays(
                    startOfDay(
                        new Date()
                    ),
                    -90
                );


            const medicineIds =
                medicines.map(
                    medicine =>
                        medicine._id
                );


            const sales =
                await Sale.find({

                    createdAt: {
                        $gte:
                            historyStart
                    },

                    "items.medicine": {
                        $in:
                            medicineIds
                    }

                }).lean();


            const dailySales =
                buildSalesHistory(
                    sales,
                    medicines
                );


            // ==================================================
            // 3. XGBOOST FEATURES
            // ==================================================

            const forecastRecords =
                buildForecastRecords(
                    medicines,
                    dailySales
                );


            // ==================================================
            // 4. XGBOOST PREDICTION
            // ==================================================

            const xgboostResult =
                await runXGBoost(
                    forecastRecords
                );


            const predictionMap =
                new Map();


            for (
                const prediction of (
                    xgboostResult.predictions ||
                    []
                )
            ) {

                predictionMap.set(

                    prediction.medicineGroup,

                    toNumber(
                        prediction.predictedDemand
                    )
                );
            }


            // ==================================================
            // 5. OUTSTANDING REORDERS
            // ==================================================

            const activeOrders =
                await Reorder.find({

                    medicine: {
                        $in:
                            medicineIds
                    },

                    status: {
                        $in:
                            ACTIVE_REORDER_STATUSES
                    }

                })
                .select(
                    "medicine quantity receivedQuantity status"
                )
                .lean();


            const incomingMap =
                new Map();


            for (
                const order of activeOrders
            ) {

                const medicineId =
                    String(
                        order.medicine
                    );


                const outstanding =
                    Math.max(

                        0,

                        toNumber(
                            order.quantity
                        ) -

                        toNumber(
                            order.receivedQuantity
                        )
                    );


                incomingMap.set(

                    medicineId,

                    (
                        incomingMap.get(
                            medicineId
                        ) || 0
                    ) +

                    outstanding
                );
            }


            for (
                const medicine of medicines
            ) {

                medicine.outstandingQuantity =
                    incomingMap.get(
                        String(
                            medicine._id
                        )
                    ) || 0;
            }


            // ==================================================
            // 6. EXPIRY ANALYSIS
            // ==================================================

            const expiryResults =
                medicines.map(
                    medicine => {

                        const group =
                            normalizeMedicineName(
                                medicine.name
                            );


                        const record =
                            forecastRecords.find(
                                item =>
                                    item.medicineGroup ===
                                    group
                            );


                        const averageDemand =
                            record
                                ? toNumber(
                                    record.averageDailyDemand
                                )
                                : 0;


                        return calculateExpiryRisk(
                            medicine,
                            averageDemand
                        );
                    }
                );


            const expiredCount =
                expiryResults.filter(
                    item =>
                        item.riskLevel ===
                        "EXPIRED"
                ).length;


            const criticalCount =
                expiryResults.filter(
                    item =>
                        item.riskLevel ===
                        "CRITICAL"
                ).length;


            const highRiskCount =
                expiryResults.filter(
                    item =>
                        item.riskLevel ===
                        "HIGH"
                ).length;


            const mediumRiskCount =
                expiryResults.filter(
                    item =>
                        item.riskLevel ===
                        "MEDIUM"
                ).length;


            const lowRiskCount =
                expiryResults.filter(
                    item =>
                        item.riskLevel ===
                        "LOW"
                ).length;


            const totalPotentialWaste =
                expiryResults.reduce(

                    (sum, item) =>

                        sum +
                        toNumber(
                            item.potentialWasteValue
                        ),

                    0
                );


            const priorityExpiry =
                expiryResults
                    .filter(
                        item =>
                            [
                                "EXPIRED",
                                "CRITICAL",
                                "HIGH"
                            ].includes(
                                item.riskLevel
                            )
                    )
                    .sort(
                        (a, b) =>
                            b.riskScore -
                            a.riskScore
                    )
                    .slice(
                        0,
                        10
                    );


            // ==================================================
            // 7. REORDER ANALYSIS
            // ==================================================

            const reorderResults =
                medicines.map(
                    medicine => {

                        const group =
                            normalizeMedicineName(
                                medicine.name
                            );


                        const predictedDemand =
                            predictionMap.get(
                                group
                            ) || 0;


                        const expiry =
                            expiryResults.find(
                                item =>

                                    item.batchNumber ===
                                        medicine.batchNumber &&

                                    item.medicineName ===
                                        medicine.name
                            ) || {

                                riskLevel:
                                    "LOW"
                            };


                        const decision =
                            calculateReorder(
                                medicine,
                                predictedDemand,
                                expiry.riskLevel
                            );


                        return {

                            medicine,

                            expiry,

                            decision
                        };
                    }
                );


            const actualReorders =
                reorderResults.filter(

                    item =>

                        item.decision
                            .reorderQuantity > 0 &&

                        item.expiry
                            .riskLevel !==
                            "EXPIRED"
                );


            const totalReorderUnits =
                actualReorders.reduce(

                    (sum, item) =>

                        sum +
                        item.decision
                            .reorderQuantity,

                    0
                );


            const priorityReorders =
                actualReorders

                    .sort(
                        (a, b) =>

                            b.decision
                                .priorityScore -

                            a.decision
                                .priorityScore
                    )

                    .slice(
                        0,
                        10
                    )

                    .map(
                        item => ({

                            medicineName:
                                item.medicine.name,

                            batchNumber:
                                item.medicine
                                    .batchNumber,

                            currentStock:
                                toNumber(
                                    item.medicine
                                        .quantity
                                ),

                            estimatedDailyDemand:
                                item.decision
                                    .estimatedDailyDemand,

                            stockCoverDays:
                                item.decision
                                    .stockCoverDays,

                            reorderQuantity:
                                item.decision
                                    .reorderQuantity,

                            priority:
                                item.decision
                                    .priority,

                            priorityScore:
                                item.decision
                                    .priorityScore,

                            riskLevel:
                                item.expiry
                                    .riskLevel,

                            recommendation:
                                item.decision
                                    .recommendation
                        })
                    );


            // ==================================================
            // 8. FORECAST PREVIEW
            // ==================================================

            const recentPredictions =
                medicines.map(
                    medicine => {

                        const group =
                            normalizeMedicineName(
                                medicine.name
                            );


                        const record =
                            forecastRecords.find(
                                item =>
                                    item.medicineGroup ===
                                    group
                            );


                        return {

                            date:
                                dateKey(
                                    new Date()
                                ),

                            medicineName:
                                medicine.name,

                            actual:
                                record
                                    ? toNumber(
                                        record.actual
                                    )
                                    : 0,

                            predicted:
                                toNumber(
                                    predictionMap.get(
                                        group
                                    )
                                )
                        };
                    }
                );


            const actualValues =
                recentPredictions.map(
                    item =>
                        item.actual
                );


            const predictedValues =
                recentPredictions.map(
                    item =>
                        item.predicted
                );


            // ==================================================
            // 9. ACTIONS
            // ==================================================

            const actions = [];


            if (
                expiredCount > 0
            ) {

                actions.push({

                    type:
                        "EXPIRY",

                    priority:
                        "CRITICAL",

                    message:
                        `${expiredCount} medicine batch(es) are expired and require immediate removal.`
                });
            }


            if (
                highRiskCount > 0 ||
                criticalCount > 0
            ) {

                actions.push({

                    type:
                        "EXPIRY",

                    priority:
                        "HIGH",

                    message:
                        `${highRiskCount + criticalCount} medicine batch(es) have high expiry risk.`
                });
            }


            if (
                actualReorders.length > 0
            ) {

                actions.push({

                    type:
                        "REORDER",

                    priority:
                        "HIGH",

                    message:
                        `${actualReorders.length} medicine batch(es) need replenishment (${totalReorderUnits} units).`
                });
            }


            if (
                actions.length === 0
            ) {

                actions.push({

                    type:
                        "SYSTEM",

                    priority:
                        "LOW",

                    message:
                        "No immediate AI-driven action is required."
                });
            }


            // ==================================================
            // 10. FINAL RESPONSE
            // ==================================================

            return res.json({

                success: true,

                generatedAt:
                    new Date().toISOString(),

                module:
                    "AI Decision Support",


                summary: {

                    totalMedicineBatches:
                        medicines.length,

                    expiredCount,

                    criticalCount,

                    highRiskCount,

                    mediumRiskCount,

                    lowRiskCount,

                    totalPotentialWasteValue:
                        Number(
                            totalPotentialWaste
                                .toFixed(2)
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
                        "XGBoost",

                    evaluation:
                        xgboostResult.evaluation ||
                        null,

                    summary: {

                        records:
                            recentPredictions.length,

                        averageActualDemand:
                            average(
                                actualValues
                            ).toFixed(2),

                        averagePredictedDemand:
                            average(
                                predictedValues
                            ).toFixed(2)
                    },

                    recentPredictions
                },


                actions
            });


        } catch (error) {

            console.error(
                "❌ AI Decision Support Error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to generate AI decision support",

                error:
                    error.message
            });
        }
    }
);


module.exports = router;