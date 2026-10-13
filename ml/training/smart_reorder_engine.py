"""
MEDTRACKER - SMART REORDER RECOMMENDATION ENGINE

Combines:
    1. Historical demand
    2. Current inventory
    3. Expiry risk
    4. Safety stock
    5. Supplier lead time
    6. Reorder quantity

Output:
    ml/evaluation/smart_reorder_recommendations.csv
"""

import math
import os

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient

# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)

DATA_FILE = os.path.join(
    BASE_DIR,
    "data",
    "medicine_sales_daily.csv"
)

EXPIRY_FILE = os.path.join(
    BASE_DIR,
    "evaluation",
    "expiry_risk_analysis.csv"
)

OUTPUT_FILE = os.path.join(
    BASE_DIR,
    "evaluation",
    "smart_reorder_recommendations.csv"
)


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise ValueError(
        "MONGO_URI not found. "
        "Please add MONGO_URI to ml/.env"
    )


# ============================================================
# REORDER PARAMETERS
# ============================================================

DEFAULT_LEAD_TIME_DAYS = 7

SAFETY_STOCK_FACTOR = 0.50

REVIEW_PERIOD_DAYS = 7


# ============================================================
# MEDICINE NAME NORMALIZATION
# ============================================================

def normalize_medicine_name(name):

    if pd.isna(name):
        return ""

    name = str(name).strip().lower()

    dolo_variants = {
        "dolo",
        "dolo 650mg",
        "dolo test 650",
        "dolo tests 650",
        "dolo 650",
    }

    if name in dolo_variants:
        return "dolo 650"

    return name


# ============================================================
# HEADER
# ============================================================

print("\n" + "=" * 70)
print("          MEDTRACKER SMART REORDER ENGINE")
print("=" * 70)


# ============================================================
# 1. LOAD SALES DATA
# ============================================================

print("\n[1/7] Loading sales dataset...")

if not os.path.exists(DATA_FILE):
    raise FileNotFoundError(
        f"Sales dataset not found:\n{DATA_FILE}"
    )

sales_df = pd.read_csv(DATA_FILE)

sales_df["date"] = pd.to_datetime(
    sales_df["date"],
    errors="coerce"
)

sales_df["medicine_name"] = (
    sales_df["medicine_name"]
    .astype(str)
    .str.strip()
)

sales_df["medicine_group"] = (
    sales_df["medicine_name"]
    .apply(normalize_medicine_name)
)

sales_df["quantity_sold"] = pd.to_numeric(
    sales_df["quantity_sold"],
    errors="coerce"
).fillna(0)

sales_df = sales_df.dropna(
    subset=["date"]
)

print(
    f"Sales rows: {len(sales_df)}"
)

print(
    f"Medicine groups: "
    f"{sales_df['medicine_group'].nunique()}"
)


# ============================================================
# 2. CALCULATE DEMAND STATISTICS
# ============================================================

print("\n[2/7] Calculating demand statistics...")

demand_records = []

for medicine_group, group in sales_df.groupby(
    "medicine_group"
):

    group = group.sort_values("date")

    total_units = (
        group["quantity_sold"].sum()
    )

    active_days = (
        group.loc[
            group["quantity_sold"] > 0,
            "date"
        ].nunique()
    )

    first_date = group["date"].min()

    last_date = group["date"].max()

    total_days = (
        last_date - first_date
    ).days + 1

    if total_days <= 0:
        total_days = 1

    average_daily_demand = (
        total_units / total_days
    )

    average_sale_day_demand = (
        total_units / active_days
        if active_days > 0
        else 0
    )

    # Recent 7-day demand

    recent_start = (
        last_date -
        pd.Timedelta(days=6)
    )

    recent_7 = group[
        group["date"] >= recent_start
    ]

    recent_7_units = (
        recent_7["quantity_sold"].sum()
    )

    recent_7_daily_demand = (
        recent_7_units / 7
    )

    demand_records.append({

        "medicine_group": medicine_group,

        "total_units_sold": total_units,

        "active_days": active_days,

        "observed_days": total_days,

        "average_daily_demand":
            average_daily_demand,

        "average_sale_day_demand":
            average_sale_day_demand,

        "recent_7_day_units":
            recent_7_units,

        "recent_7_day_daily_demand":
            recent_7_daily_demand
    })


demand_df = pd.DataFrame(
    demand_records
)

print(
    f"Demand statistics calculated for "
    f"{len(demand_df)} medicines."
)


# ============================================================
# 3. READ MONGODB INVENTORY
# ============================================================

print(
    "\n[3/7] Reading current inventory from MongoDB..."
)

client = MongoClient(MONGO_URI)

db = client.get_database()

medicine_collection = db["medicines"]

medicine_documents = list(
    medicine_collection.find(
        {
            "status": {
                "$ne": "removed"
            }
        }
    )
)

print(
    f"Active medicine records: "
    f"{len(medicine_documents)}"
)


# ============================================================
# CONVERT INVENTORY
# ============================================================

inventory_records = []

for medicine in medicine_documents:

    expiry_date = medicine.get(
        "expiryDate"
    )

    if expiry_date is not None:

        try:

            expiry_date = pd.to_datetime(
                expiry_date
            )

        except Exception:

            expiry_date = pd.NaT

    inventory_records.append({

        "medicine_id": str(
            medicine.get("_id")
        ),

        "medicine_name":
            medicine.get(
                "name",
                ""
            ),

        "medicine_group":
            normalize_medicine_name(
                medicine.get(
                    "name",
                    ""
                )
            ),

        "batch_number":
            medicine.get(
                "batchNumber",
                ""
            ),

        "current_stock":
            float(
                medicine.get(
                    "quantity",
                    0
                ) or 0
            ),

        "minimum_stock":
            float(
                medicine.get(
                    "minimumStock",
                    5
                ) or 0
            ),

        "purchase_price":
            float(
                medicine.get(
                    "purchasePrice",
                    0
                ) or 0
            ),

        "selling_price":
            float(
                medicine.get(
                    "sellingPrice",
                    0
                ) or 0
            ),

        "supplier":
            medicine.get(
                "supplier",
                ""
            ),

        "expiry_date":
            expiry_date
    })


inventory_df = pd.DataFrame(
    inventory_records
)


# ============================================================
# 4. LOAD EXPIRY RISK
# ============================================================

print(
    "\n[4/7] Loading expiry risk analysis..."
)

if os.path.exists(EXPIRY_FILE):

    expiry_df = pd.read_csv(
        EXPIRY_FILE
    )

    expiry_df["medicine_group"] = (
        expiry_df["medicine_name"]
        .apply(normalize_medicine_name)
    )

    expiry_columns = [
        "medicine_group",
        "batch_number",
        "expiry_risk_score",
        "risk_level",
        "days_to_expiry",
        "potential_waste_value"
    ]

    expiry_df = expiry_df[
        [
            column
            for column in expiry_columns
            if column in expiry_df.columns
        ]
    ]

    # --------------------------------------------------------
    # FIX 2:
    # Remove duplicate expiry records before merging.
    #
    # Without this, one inventory record can match multiple
    # expiry records and create duplicate rows.
    # --------------------------------------------------------

    expiry_df = (
        expiry_df
        .sort_values(
            "expiry_risk_score",
            ascending=False
        )
        .drop_duplicates(
            subset=[
                "medicine_group",
                "batch_number"
            ],
            keep="first"
        )
    )

    print(
        f"Unique expiry risk records: "
        f"{len(expiry_df)}"
    )

else:

    print(
        "WARNING: Expiry risk file not found."
    )

    expiry_df = pd.DataFrame()


# ============================================================
# 5. COMBINE DATA
# ============================================================

print(
    "\n[5/7] Combining inventory, demand and expiry data..."
)

combined_df = inventory_df.merge(
    demand_df,
    on="medicine_group",
    how="left"
)


# Fill missing demand
demand_columns = [
    "total_units_sold",
    "active_days",
    "observed_days",
    "average_daily_demand",
    "average_sale_day_demand",
    "recent_7_day_units",
    "recent_7_day_daily_demand"
]

for column in demand_columns:

    if column in combined_df.columns:

        combined_df[column] = (
            combined_df[column]
            .fillna(0)
        )


# ============================================================
# MERGE EXPIRY DATA
# ============================================================

if not expiry_df.empty:

    combined_df = combined_df.merge(
        expiry_df,
        on=[
            "medicine_group",
            "batch_number"
        ],
        how="left"
    )

else:

    combined_df[
        "expiry_risk_score"
    ] = 0

    combined_df[
        "risk_level"
    ] = "LOW"

    combined_df[
        "days_to_expiry"
    ] = np.nan

    combined_df[
        "potential_waste_value"
    ] = 0


combined_df[
    "expiry_risk_score"
] = (
    combined_df[
        "expiry_risk_score"
    ].fillna(0)
)


combined_df[
    "risk_level"
] = (
    combined_df[
        "risk_level"
    ].fillna("LOW")
)


combined_df[
    "potential_waste_value"
] = (
    combined_df[
        "potential_waste_value"
    ].fillna(0)
)


# ============================================================
# 6. SMART REORDER CALCULATION
# ============================================================

print(
    "\n[6/7] Calculating smart reorder recommendations..."
)


def calculate_reorder(row):

    current_stock = float(
        row["current_stock"]
    )

    minimum_stock = float(
        row["minimum_stock"]
    )

    average_daily_demand = float(
        row["average_daily_demand"]
    )

    recent_demand = float(
        row["recent_7_day_daily_demand"]
    )

    expiry_risk = str(
        row.get(
            "risk_level",
            "LOW"
        )
    ).upper()


    # ========================================================
    # FIX 1:
    # EXPIRED STOCK MUST NEVER GENERATE A REORDER QUANTITY
    # ========================================================

    if expiry_risk == "EXPIRED":

        return pd.Series({

            "estimated_daily_demand": 0,

            "lead_time_days":
                DEFAULT_LEAD_TIME_DAYS,

            "lead_time_demand": 0,

            "safety_stock": 0,

            "target_stock": 0,

            "stock_cover_days": 0,

            "stockout_risk": "CRITICAL",

            "reorder_quantity": 0,

            "priority": "CRITICAL",

            "decision":
                "DO NOT REORDER. "
                "Existing batch is expired.",

            "recommendation":
                "Remove expired stock immediately "
                "and do not replenish this batch."
        })


    # ========================================================
    # DEMAND ESTIMATION
    # ========================================================

    if recent_demand > 0:

        demand_rate = (
            0.60 *
            average_daily_demand
            +
            0.40 *
            recent_demand
        )

    else:

        demand_rate = (
            average_daily_demand
        )


    # ========================================================
    # LEAD TIME DEMAND
    # ========================================================

    lead_time_demand = (
        demand_rate *
        DEFAULT_LEAD_TIME_DAYS
    )


    # ========================================================
    # SAFETY STOCK
    # ========================================================

    safety_stock = (
        demand_rate
        *
        DEFAULT_LEAD_TIME_DAYS
        *
        SAFETY_STOCK_FACTOR
    )


    # ========================================================
    # TARGET STOCK
    # ========================================================

    target_stock = (
        lead_time_demand
        +
        safety_stock
        +
        minimum_stock
    )


    # ========================================================
    # REORDER QUANTITY
    # ========================================================

    reorder_quantity = max(
        math.ceil(
            target_stock -
            current_stock
        ),
        0
    )


    # ========================================================
    # STOCK COVERAGE
    # ========================================================

    if demand_rate > 0:

        stock_cover_days = (
            current_stock /
            demand_rate
        )

    else:

        stock_cover_days = np.inf


    # ========================================================
    # STOCKOUT RISK
    # ========================================================

    if current_stock <= 0:

        stockout_risk = "CRITICAL"

    elif (
        demand_rate > 0
        and
        stock_cover_days <= 7
    ):

        stockout_risk = "HIGH"

    elif (
        demand_rate > 0
        and
        stock_cover_days <= 14
    ):

        stockout_risk = "MEDIUM"

    else:

        stockout_risk = "LOW"


    # ========================================================
    # FINAL PRIORITY
    # ========================================================

    if (
        stockout_risk == "CRITICAL"
    ):

        priority = "CRITICAL"

    elif (
        stockout_risk == "HIGH"
    ) or expiry_risk in [
        "HIGH",
        "CRITICAL"
    ]:

        priority = "HIGH"

    elif reorder_quantity > 0:

        priority = "MEDIUM"

    else:

        priority = "LOW"


    # ========================================================
    # DECISION
    # ========================================================

    if reorder_quantity <= 0:

        decision = (
            "NO REORDER REQUIRED. "
            "Current stock is sufficient."
        )

    elif expiry_risk == "HIGH":

        decision = (
            "REVIEW BEFORE REORDER. "
            "Existing inventory has high "
            "expiry risk."
        )

    else:

        decision = (
            f"REORDER "
            f"{reorder_quantity} UNITS."
        )


    # ========================================================
    # RECOMMENDATION
    # ========================================================

    if expiry_risk == "HIGH":

        if reorder_quantity > 0:

            recommendation = (
                "Review existing expiry-risk "
                "stock before reordering. "
                f"Suggested quantity: "
                f"{reorder_quantity} units."
            )

        else:

            recommendation = (
                "Do not reorder currently. "
                "Review existing high-risk stock."
            )

    elif reorder_quantity > 0:

        recommendation = (
            f"Reorder approximately "
            f"{reorder_quantity} units based "
            f"on estimated demand and "
            f"safety stock."
        )

    else:

        recommendation = (
            "Current inventory is sufficient. "
            "Continue monitoring demand."
        )


    return pd.Series({

        "estimated_daily_demand":
            round(
                demand_rate,
                3
            ),

        "lead_time_days":
            DEFAULT_LEAD_TIME_DAYS,

        "lead_time_demand":
            round(
                lead_time_demand,
                2
            ),

        "safety_stock":
            round(
                safety_stock,
                2
            ),

        "target_stock":
            round(
                target_stock,
                2
            ),

        "stock_cover_days":
            (
                round(
                    stock_cover_days,
                    2
                )
                if np.isfinite(
                    stock_cover_days
                )
                else np.inf
            ),

        "stockout_risk":
            stockout_risk,

        "reorder_quantity":
            reorder_quantity,

        "priority":
            priority,

        "decision":
            decision,

        "recommendation":
            recommendation
    })


# Apply calculation
reorder_results = combined_df.apply(
    calculate_reorder,
    axis=1
)


final_df = pd.concat(
    [
        combined_df,
        reorder_results
    ],
    axis=1
)


# ============================================================
# REORDER PRIORITY SCORE
# ============================================================

def calculate_reorder_score(row):

    score = 0

    stockout_risk = row[
        "stockout_risk"
    ]

    if stockout_risk == "CRITICAL":
        score += 50

    elif stockout_risk == "HIGH":
        score += 40

    elif stockout_risk == "MEDIUM":
        score += 25

    else:
        score += 5


    expiry_risk = row[
        "risk_level"
    ]

    if expiry_risk == "EXPIRED":
        score += 50

    elif expiry_risk == "CRITICAL":
        score += 40

    elif expiry_risk == "HIGH":
        score += 30

    elif expiry_risk == "MEDIUM":
        score += 15

    else:
        score += 5


    return min(
        score,
        100
    )


final_df[
    "reorder_priority_score"
] = (
    final_df.apply(
        calculate_reorder_score,
        axis=1
    )
)


# ============================================================
# SORT
# ============================================================

priority_order = {
    "CRITICAL": 0,
    "HIGH": 1,
    "MEDIUM": 2,
    "LOW": 3
}

final_df[
    "priority_order"
] = (
    final_df[
        "priority"
    ].map(
        priority_order
    ).fillna(4)
)


final_df = final_df.sort_values(
    [
        "priority_order",
        "reorder_priority_score"
    ],
    ascending=[
        True,
        False
    ]
)


final_df = final_df.drop(
    columns=[
        "priority_order"
    ]
)


# ============================================================
# SAVE
# ============================================================

print(
    "\n[7/7] Saving smart reorder recommendations..."
)

os.makedirs(
    os.path.dirname(
        OUTPUT_FILE
    ),
    exist_ok=True
)

final_df.to_csv(
    OUTPUT_FILE,
    index=False
)


# ============================================================
# SUMMARY
# ============================================================

print("\n" + "=" * 70)
print("             SMART REORDER SUMMARY")
print("=" * 70)


actual_reorders = (
    final_df[
        "reorder_quantity"
    ] > 0
)


print(
    f"\nTotal medicine batches analyzed : "
    f"{len(final_df)}"
)

print(
    f"Reorder recommendations         : "
    f"{actual_reorders.sum()}"
)

print(
    f"Total suggested reorder units   : "
    f"{int(final_df['reorder_quantity'].sum())}"
)


# ============================================================
# PRIORITY ITEMS
# ============================================================

print("\n" + "=" * 70)
print("             PRIORITY REORDER ITEMS")
print("=" * 70)


display_columns = [

    "medicine_name",

    "batch_number",

    "current_stock",

    "estimated_daily_demand",

    "stock_cover_days",

    "expiry_risk_score",

    "risk_level",

    "reorder_quantity",

    "priority",

    "reorder_priority_score"
]


available_display_columns = [
    column
    for column in display_columns
    if column in final_df.columns
]


print(
    final_df[
        available_display_columns
    ].to_string(
        index=False
    )
)


# ============================================================
# DECISIONS
# ============================================================

print("\n" + "=" * 70)
print("          SMART REORDER DECISIONS")
print("=" * 70)


for _, row in final_df.iterrows():

    reorder_quantity = int(
        row[
            "reorder_quantity"
        ]
    )

    print(
        f"\n{row['medicine_name']}"
    )

    print(
        f"Batch: "
        f"{row['batch_number']}"
    )

    print(
        f"Current Stock: "
        f"{row['current_stock']:.0f}"
    )

    print(
        f"Estimated Daily Demand: "
        f"{row['estimated_daily_demand']:.2f}"
    )

    print(
        f"Stock Coverage: "
        f"{row['stock_cover_days']}"
    )

    print(
        f"Expiry Risk: "
        f"{row['risk_level']}"
    )

    print(
        f"Priority: "
        f"{row['priority']}"
    )

    print(
        f"Suggested Reorder: "
        f"{reorder_quantity} units"
    )

    print(
        f"Decision: "
        f"{row['decision']}"
    )


# ============================================================
# COMPLETE
# ============================================================

print("\n" + "=" * 70)
print("       SMART REORDER ENGINE COMPLETE")
print("=" * 70)

print(
    "\nAnalysis saved to:"
)

print(
    OUTPUT_FILE
)

print(
    "\nDay 1 AI pipeline components:"
)

print(
    "1. Demand Forecasting       [DONE]"
)

print(
    "2. Expiry Risk Engine       [DONE]"
)

print(
    "3. Smart Reorder Engine     [DONE]"
)

print(
    "\nNext step:"
)

print(
    "Integrate the AI outputs into "
    "MedTracker AI Decision Support."
)