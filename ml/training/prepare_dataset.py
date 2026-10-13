from pathlib import Path

import pandas as pd
from pymongo import MongoClient

# ============================================================
# MEDTRACKER - SALES DATASET PREPARATION
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# ------------------------------------------------------------
# MongoDB connection
# ------------------------------------------------------------
# IMPORTANT:
# This credential should NOT be committed to GitHub.
# Rotate the password after testing because it was shared.
# ------------------------------------------------------------

MONGO_URI = (
    "mongodb+srv://sam:Sameena2005@cluster0.db0ir6d.mongodb.net/"
    "medtracker?retryWrites=true&w=majority&appName=Cluster0"
)


# ============================================================
# CONNECT TO MONGODB
# ============================================================

print()
print("=" * 55)
print("       MEDTRACKER ML DATA PREPARATION")
print("=" * 55)
print()

print("[1/6] Connecting to MongoDB...")

try:
    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=15000
    )

    # Force connection test
    client.admin.command("ping")

    db = client["medtracker"]

    print("MongoDB connection successful!")
    print("Database:", db.name)

except Exception as error:
    print()
    print("ERROR: Could not connect to MongoDB.")
    print("Reason:", error)
    print()
    raise SystemExit(1)


# ============================================================
# READ SALES COLLECTION
# ============================================================

print()
print("[2/6] Reading sales collection...")

sales_collection = db["sales"]

try:
    sales_documents = list(
        sales_collection.find(
            {},
            {
                "createdAt": 1,
                "items": 1
            }
        )
    )
except Exception as error:
    print()
    print("ERROR: Could not read sales collection.")
    print("Reason:", error)
    client.close()
    raise SystemExit(1)


print(
    f"Sales documents found: {len(sales_documents)}"
)


if not sales_documents:
    print()
    print("WARNING: No sales documents found.")
    print()
    print("Create some sales in MedTracker first.")
    print("Then run this script again.")
    print()

    client.close()
    raise SystemExit(0)


# ============================================================
# EXTRACT MEDICINE SALES
# ============================================================

print()
print("[3/6] Extracting medicine-level sales...")

rows = []

for sale in sales_documents:

    sale_date = sale.get("createdAt")

    if not sale_date:
        continue

    # Convert date safely
    try:
        sale_date = pd.to_datetime(sale_date)
    except Exception:
        continue

    items = sale.get("items", [])

    if not isinstance(items, list):
        continue

    for item in items:

        # ----------------------------------------------------
        # Medicine name
        # ----------------------------------------------------

        medicine_name = item.get("medicineName")

        if not medicine_name:
            medicine_name = item.get("name")

        if not medicine_name:
            continue

        medicine_name = str(
            medicine_name
        ).strip().lower()

        # ----------------------------------------------------
        # Quantity
        # ----------------------------------------------------

        quantity = item.get(
            "quantity",
            0
        )

        try:
            quantity = float(quantity or 0)
        except (
            ValueError,
            TypeError
        ):
            quantity = 0

        # ----------------------------------------------------
        # Revenue
        # ----------------------------------------------------

        revenue = item.get(
            "total",
            0
        )

        try:
            revenue = float(revenue or 0)
        except (
            ValueError,
            TypeError
        ):
            revenue = 0

        # ----------------------------------------------------
        # Medicine ID
        # ----------------------------------------------------

        medicine_id = item.get(
            "medicine"
        )

        if medicine_id is not None:
            medicine_id = str(
                medicine_id
            )

        # ----------------------------------------------------
        # Store row
        # ----------------------------------------------------

        rows.append(
            {
                "date": sale_date.normalize(),
                "medicine_id": medicine_id,
                "medicine_name": medicine_name,
                "quantity_sold": quantity,
                "revenue": revenue
            }
        )


if not rows:

    print()
    print("WARNING: No valid medicine sales found.")
    print()

    client.close()
    raise SystemExit(0)


# ============================================================
# CREATE DATAFRAME
# ============================================================

print()
print("[4/6] Creating sales dataframe...")

df = pd.DataFrame(rows)

df["date"] = pd.to_datetime(
    df["date"]
)

df["medicine_name"] = (
    df["medicine_name"]
    .astype(str)
    .str.strip()
    .str.lower()
)


# ============================================================
# AGGREGATE DAILY SALES
# ============================================================

daily_sales = (
    df.groupby(
        [
            "date",
            "medicine_name"
        ],
        as_index=False
    )
    .agg(
        quantity_sold=(
            "quantity_sold",
            "sum"
        ),
        revenue=(
            "revenue",
            "sum"
        )
    )
)


# ============================================================
# CREATE CONTINUOUS DAILY DATA
# ============================================================
#
# Example:
#
# Original:
#
# Jan 1 -> 5
# Jan 3 -> 3
#
# ML dataset:
#
# Jan 1 -> 5
# Jan 2 -> 0
# Jan 3 -> 3
#
# Zero-sales days are important for forecasting.
# ============================================================

print()
print("[5/6] Creating continuous daily time-series...")


complete_frames = []


for medicine_name, medicine_df in daily_sales.groupby(
    "medicine_name"
):

    medicine_df = medicine_df.sort_values(
        "date"
    )

    start_date = medicine_df[
        "date"
    ].min()

    end_date = medicine_df[
        "date"
    ].max()

    date_range = pd.date_range(
        start=start_date,
        end=end_date,
        freq="D"
    )

    complete = pd.DataFrame(
        {
            "date": date_range,
            "medicine_name": medicine_name
        }
    )

    complete = complete.merge(
        medicine_df,
        on=[
            "date",
            "medicine_name"
        ],
        how="left"
    )

    complete[
        "quantity_sold"
    ] = (
        complete[
            "quantity_sold"
        ]
        .fillna(0)
    )

    complete[
        "revenue"
    ] = (
        complete[
            "revenue"
        ]
        .fillna(0)
    )

    complete_frames.append(
        complete
    )


dataset = pd.concat(
    complete_frames,
    ignore_index=True
)


# ============================================================
# SORT DATA
# ============================================================

dataset = dataset.sort_values(
    [
        "medicine_name",
        "date"
    ]
).reset_index(
    drop=True
)


# ============================================================
# TIME FEATURES
# ============================================================

dataset["day_of_week"] = (
    dataset["date"].dt.dayofweek
)

dataset["day_of_month"] = (
    dataset["date"].dt.day
)

dataset["month"] = (
    dataset["date"].dt.month
)

dataset["year"] = (
    dataset["date"].dt.year
)


# ============================================================
# SAVE DATASET
# ============================================================

output_dir = (
    PROJECT_ROOT /
    "ml" /
    "data"
)

output_dir.mkdir(
    parents=True,
    exist_ok=True
)


output_file = (
    output_dir /
    "medicine_sales_daily.csv"
)


dataset.to_csv(
    output_file,
    index=False
)


# ============================================================
# DISPLAY RESULTS
# ============================================================

print()
print("=" * 55)
print("             DATASET CREATED")
print("=" * 55)
print()

print(
    "Total rows       :",
    f"{len(dataset):,}"
)

print(
    "Unique medicines  :",
    f"{dataset['medicine_name'].nunique():,}"
)

print(
    "Start date        :",
    dataset["date"].min().date()
)

print(
    "End date          :",
    dataset["date"].max().date()
)

print(
    "Total units sold  :",
    f"{dataset['quantity_sold'].sum():,.0f}"
)

print(
    "Total revenue     :",
    f"₹{dataset['revenue'].sum():,.2f}"
)


# ============================================================
# TOP MEDICINES
# ============================================================

print()
print("Top medicines by quantity sold:")
print("-" * 55)


top_medicines = (
    dataset
    .groupby(
        "medicine_name"
    )["quantity_sold"]
    .sum()
    .sort_values(
        ascending=False
    )
    .head(10)
)


if len(top_medicines) > 0:

    for medicine, quantity in (
        top_medicines.items()
    ):

        print(
            f"{medicine:<35} "
            f"{quantity:>8.0f}"
        )

else:

    print("No medicine sales available.")


# ============================================================
# PREVIEW
# ============================================================

print()
print("Dataset preview:")
print("-" * 55)

print(
    dataset.head(10).to_string(
        index=False
    )
)


# ============================================================
# FILE LOCATION
# ============================================================

print()
print("=" * 55)
print("Dataset saved successfully!")
print("=" * 55)
print()

print(
    "File:"
)

print(
    output_file
)

print()

print(
    "Next step:"
)

print(
    "Train the ML demand forecasting model."
)

print()


# ============================================================
# CLOSE CONNECTION
# ============================================================

client.close()