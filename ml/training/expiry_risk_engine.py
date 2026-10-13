from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

# ============================================================
# MEDTRACKER
# INTELLIGENT EXPIRY RISK ENGINE
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_FILE = (
    PROJECT_ROOT
    / "ml"
    / "data"
    / "medicine_sales_daily.csv"
)

OUTPUT_DIR = (
    PROJECT_ROOT
    / "ml"
    / "evaluation"
)

OUTPUT_FILE = (
    OUTPUT_DIR
    / "expiry_risk_analysis.csv"
)


# ============================================================
# CONFIGURATION
# ============================================================

# Risk thresholds
LOW_RISK_SCORE = 25
MEDIUM_RISK_SCORE = 50
HIGH_RISK_SCORE = 75


# ============================================================
# LOAD SALES DATA
# ============================================================

print()
print("=" * 70)
print("          MEDTRACKER INTELLIGENT EXPIRY RISK ENGINE")
print("=" * 70)
print()

print("[1/6] Loading sales dataset...")

if not DATA_FILE.exists():

    print("ERROR: Sales dataset not found.")
    print(DATA_FILE)
    raise SystemExit(1)


sales = pd.read_csv(
    DATA_FILE
)

sales["date"] = pd.to_datetime(
    sales["date"]
)


# ============================================================
# NORMALIZE MEDICINE NAMES
# ============================================================

def normalize_medicine_name(name):

    name = str(name).lower().strip()

    name = " ".join(
        name.split()
    )

    if name in [
        "dolo",
        "dolo 650mg",
        "dolo test 650",
        "dolo tests 650",
    ]:
        return "dolo 650"

    return name


sales["medicine_group"] = (
    sales["medicine_name"]
    .apply(normalize_medicine_name)
)


print(
    "Sales rows:",
    len(sales)
)

print(
    "Medicine groups:",
    sales["medicine_group"].nunique()
)


# ============================================================
# CALCULATE DEMAND STATISTICS
# ============================================================

print()
print("[2/6] Calculating demand statistics...")


demand = (
    sales
    .groupby(
        "medicine_group"
    )
    .agg(
        total_units_sold=(
            "quantity_sold",
            "sum"
        ),

        active_days=(
            "quantity_sold",
            lambda x: int(
                (x > 0).sum()
            )
        ),

        total_days=(
            "quantity_sold",
            "count"
        )
    )
    .reset_index()
)


# Average daily demand over observed period
demand["average_daily_demand"] = (
    demand["total_units_sold"]
    /
    demand["total_days"]
)


# Average demand only on days where sales occurred
demand["average_sale_day_demand"] = np.where(
    demand["active_days"] > 0,
    demand["total_units_sold"]
    /
    demand["active_days"],
    0
)


# ============================================================
# GET CURRENT MEDICINE INVENTORY FROM MONGODB
# ============================================================

print()
print("[3/6] Reading current inventory from MongoDB...")

# We use the same MongoDB connection already configured
# for the project.

from pymongo import MongoClient

MONGO_URI = (
    "mongodb+srv://sam:Sameena2005@cluster0.db0ir6d.mongodb.net/"
    "medtracker?retryWrites=true&w=majority&appName=Cluster0"
)


try:

    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=15000
    )

    client.admin.command("ping")

    db = client["medtracker"]

    medicines_collection = db[
        "medicines"
    ]

    medicines = list(
        medicines_collection.find(
            {
                "status": {
                    "$ne": "removed"
                }
            }
        )
    )

except Exception as error:

    print()
    print(
        "ERROR: Could not connect to MongoDB."
    )

    print(
        "Reason:",
        error
    )

    raise SystemExit(1)


print(
    "Active medicine records:",
    len(medicines)
)


# ============================================================
# CONVERT INVENTORY TO DATAFRAME
# ============================================================

inventory_rows = []


for medicine in medicines:

    name = medicine.get(
        "name",
        ""
    )

    if not name:
        continue

    normalized_name = (
        normalize_medicine_name(
            name
        )
    )

    quantity = medicine.get(
        "quantity",
        0
    )

    minimum_stock = medicine.get(
        "minimumStock",
        5
    )

    selling_price = medicine.get(
        "sellingPrice",
        0
    )

    purchase_price = medicine.get(
        "purchasePrice",
        0
    )

    expiry_date = medicine.get(
        "expiryDate"
    )

    if expiry_date is None:
        continue

    try:

        expiry_date = pd.to_datetime(
            expiry_date
        )

    except Exception:

        continue


    inventory_rows.append(
        {
            "medicine_id": str(
                medicine.get(
                    "_id",
                    ""
                )
            ),

            "medicine_name": name,

            "medicine_group": normalized_name,

            "batch_number": medicine.get(
                "batchNumber",
                ""
            ),

            "current_stock": float(
                quantity or 0
            ),

            "minimum_stock": float(
                minimum_stock or 0
            ),

            "selling_price": float(
                selling_price or 0
            ),

            "purchase_price": float(
                purchase_price or 0
            ),

            "expiry_date": expiry_date
        }
    )


inventory = pd.DataFrame(
    inventory_rows
)


if inventory.empty:

    print()
    print(
        "No inventory records available."
    )

    client.close()

    raise SystemExit(0)


# ============================================================
# MERGE INVENTORY + DEMAND
# ============================================================

print()
print("[4/6] Combining inventory and demand data...")


analysis = inventory.merge(
    demand[
        [
            "medicine_group",
            "total_units_sold",
            "active_days",
            "total_days",
            "average_daily_demand",
            "average_sale_day_demand"
        ]
    ],
    on="medicine_group",
    how="left"
)


# Medicines without sales history
analysis[
    "total_units_sold"
] = analysis[
    "total_units_sold"
].fillna(0)


analysis[
    "active_days"
] = analysis[
    "active_days"
].fillna(0)


analysis[
    "total_days"
] = analysis[
    "total_days"
].fillna(0)


analysis[
    "average_daily_demand"
] = analysis[
    "average_daily_demand"
].fillna(0)


analysis[
    "average_sale_day_demand"
] = analysis[
    "average_sale_day_demand"
].fillna(0)


# ============================================================
# DAYS UNTIL EXPIRY
# ============================================================

today = pd.Timestamp(
    datetime.now().date()
)


analysis[
    "days_to_expiry"
] = (
    analysis[
        "expiry_date"
    ]
    - today
).dt.days


# ============================================================
# ESTIMATED STOCK CONSUMPTION BEFORE EXPIRY
# ============================================================

analysis[
    "expected_demand_before_expiry"
] = (
    analysis[
        "average_daily_demand"
    ]
    *
    analysis[
        "days_to_expiry"
    ].clip(lower=0)
)


# ============================================================
# EXPECTED EXCESS STOCK
# ============================================================

analysis[
    "expected_excess_stock"
] = (
    analysis[
        "current_stock"
    ]
    -
    analysis[
        "expected_demand_before_expiry"
    ]
).clip(
    lower=0
)


# ============================================================
# EXPIRY WASTE VALUE
# ============================================================

analysis[
    "potential_waste_value"
] = (
    analysis[
        "expected_excess_stock"
    ]
    *
    analysis[
        "purchase_price"
    ]
)


# ============================================================
# STOCK COVER DAYS
# ============================================================

analysis[
    "stock_cover_days"
] = np.where(
    analysis[
        "average_daily_demand"
    ] > 0,

    analysis[
        "current_stock"
    ]
    /
    analysis[
        "average_daily_demand"
    ],

    np.inf
)


# ============================================================
# RISK COMPONENT 1
# DAYS TO EXPIRY
# ============================================================

def expiry_score(days):

    if days <= 0:
        return 100

    if days <= 7:
        return 100

    if days <= 15:
        return 85

    if days <= 30:
        return 70

    if days <= 60:
        return 50

    if days <= 90:
        return 30

    return 10


analysis[
    "expiry_time_score"
] = analysis[
    "days_to_expiry"
].apply(
    expiry_score
)


# ============================================================
# RISK COMPONENT 2
# EXCESS STOCK RATIO
# ============================================================

analysis[
    "excess_stock_ratio"
] = np.where(

    analysis[
        "current_stock"
    ] > 0,

    analysis[
        "expected_excess_stock"
    ]
    /
    analysis[
        "current_stock"
    ],

    0
)


def excess_score(ratio):

    if ratio >= 0.75:
        return 100

    if ratio >= 0.50:
        return 80

    if ratio >= 0.25:
        return 60

    if ratio > 0:
        return 35

    return 0


analysis[
    "excess_stock_score"
] = analysis[
    "excess_stock_ratio"
].apply(
    excess_score
)


# ============================================================
# RISK COMPONENT 3
# STOCK COVER VS EXPIRY
# ============================================================

def coverage_score(row):

    days_expiry = row[
        "days_to_expiry"
    ]

    stock_cover = row[
        "stock_cover_days"
    ]

    if days_expiry <= 0:
        return 100

    if np.isinf(stock_cover):
        return 80

    if stock_cover > days_expiry:
        ratio = (
            stock_cover
            /
            max(
                days_expiry,
                1
            )
        )

        if ratio >= 3:
            return 100

        if ratio >= 2:
            return 80

        return 60

    return 10


analysis[
    "coverage_risk_score"
] = analysis.apply(
    coverage_score,
    axis=1
)


# ============================================================
# FINAL EXPIRY RISK SCORE
# ============================================================

analysis[
    "expiry_risk_score"
] = (
    analysis[
        "expiry_time_score"
    ]
    * 0.40
    +
    analysis[
        "excess_stock_score"
    ]
    * 0.35
    +
    analysis[
        "coverage_risk_score"
    ]
    * 0.25
)


# ============================================================
# RISK CLASSIFICATION
# ============================================================

def classify_risk(score, days):

    if days <= 0:
        return "EXPIRED"

    if score >= HIGH_RISK_SCORE:
        return "CRITICAL"

    if score >= MEDIUM_RISK_SCORE:
        return "HIGH"

    if score >= LOW_RISK_SCORE:
        return "MEDIUM"

    return "LOW"


analysis[
    "risk_level"
] = analysis.apply(
    lambda row:
    classify_risk(
        row[
            "expiry_risk_score"
        ],
        row[
            "days_to_expiry"
        ]
    ),
    axis=1
)


# ============================================================
# RECOMMENDATION
# ============================================================

def generate_recommendation(row):

    risk = row[
        "risk_level"
    ]

    stock = row[
        "current_stock"
    ]

    excess = row[
        "expected_excess_stock"
    ]

    days = row[
        "days_to_expiry"
    ]

    if risk == "EXPIRED":

        return (
            "Remove expired stock immediately."
        )

    if risk == "CRITICAL":

        return (
            f"Prioritize this batch for sale. "
            f"Approximately {excess:.0f} units "
            f"may remain unsold before expiry."
        )

    if risk == "HIGH":

        return (
            f"Prioritize this medicine. "
            f"Review {excess:.0f} potentially "
            f"excess units before expiry."
        )

    if risk == "MEDIUM":

        return (
            f"Monitor stock closely. "
            f"{days:.0f} days remain before expiry."
        )

    return (
        "Expiry risk currently appears low."
    )


analysis[
    "recommendation"
] = analysis.apply(
    generate_recommendation,
    axis=1
)


# ============================================================
# SORT BY RISK
# ============================================================

risk_order = {
    "EXPIRED": 0,
    "CRITICAL": 1,
    "HIGH": 2,
    "MEDIUM": 3,
    "LOW": 4
}


analysis[
    "risk_order"
] = analysis[
    "risk_level"
].map(
    risk_order
)


analysis = analysis.sort_values(
    [
        "risk_order",
        "expiry_risk_score"
    ]
).drop(
    columns=[
        "risk_order"
    ]
)


# ============================================================
# SAVE RESULTS
# ============================================================

print()
print("[5/6] Saving expiry risk analysis...")


OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


analysis.to_csv(
    OUTPUT_FILE,
    index=False
)


# ============================================================
# DISPLAY SUMMARY
# ============================================================

print()
print("=" * 70)
print("             EXPIRY RISK SUMMARY")
print("=" * 70)
print()


risk_counts = (
    analysis[
        "risk_level"
    ]
    .value_counts()
)


for level in [
    "EXPIRED",
    "CRITICAL",
    "HIGH",
    "MEDIUM",
    "LOW"
]:

    count = int(
        risk_counts.get(
            level,
            0
        )
    )

    print(
        f"{level:<12}: {count}"
    )


# ============================================================
# DISPLAY HIGH-RISK ITEMS
# ============================================================

print()
print("=" * 70)
print("             PRIORITY MEDICINES")
print("=" * 70)
print()


priority_columns = [
    "medicine_name",
    "batch_number",
    "current_stock",
    "days_to_expiry",
    "average_daily_demand",
    "expected_excess_stock",
    "potential_waste_value",
    "expiry_risk_score",
    "risk_level"
]


priority = analysis[
    priority_columns
].head(15)


if priority.empty:

    print(
        "No inventory records available."
    )

else:

    print(
        priority.to_string(
            index=False
        )
    )


# ============================================================
# DISPLAY RECOMMENDATIONS
# ============================================================

print()
print("=" * 70)
print("             AI DECISION RECOMMENDATIONS")
print("=" * 70)
print()


for _, row in analysis.head(10).iterrows():

    print(
        f"\n{row['medicine_name']}"
    )

    print(
        f"Risk: {row['risk_level']}"
    )

    print(
        f"Score: "
        f"{row['expiry_risk_score']:.2f}"
    )

    print(
        f"Recommendation: "
        f"{row['recommendation']}"
    )


# ============================================================
# CLOSE MONGODB
# ============================================================

client.close()


# ============================================================
# COMPLETE
# ============================================================

print()
print("=" * 70)
print("          EXPIRY RISK ENGINE COMPLETE")
print("=" * 70)
print()

print(
    "Analysis saved to:"
)

print(
    OUTPUT_FILE
)

print()
print(
    "Next step:"
)

print(
    "Build Smart Reorder Recommendation Engine."
)

print()