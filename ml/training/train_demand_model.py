from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
)
from xgboost import XGBRegressor

# ============================================================
# MEDTRACKER
# AI DEMAND FORECASTING MODEL
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_FILE = (
    PROJECT_ROOT
    / "ml"
    / "data"
    / "medicine_sales_daily.csv"
)

MODEL_DIR = (
    PROJECT_ROOT
    / "ml"
    / "models"
)

MODEL_DIR.mkdir(
    parents=True,
    exist_ok=True
)


print()
print("=" * 65)
print("       MEDTRACKER AI DEMAND FORECASTING")
print("=" * 65)
print()


# ============================================================
# 1. LOAD DATA
# ============================================================

print("[1/8] Loading dataset...")

if not DATA_FILE.exists():

    print()
    print("ERROR: Dataset not found.")
    print()
    print(DATA_FILE)
    print()
    print(
        "Run prepare_dataset.py first."
    )

    raise SystemExit(1)


df = pd.read_csv(
    DATA_FILE
)

df["date"] = pd.to_datetime(
    df["date"]
)

df = df.sort_values(
    [
        "medicine_name",
        "date"
    ]
).reset_index(
    drop=True
)


print(
    f"Dataset rows: {len(df):,}"
)

print(
    f"Medicines: {df['medicine_name'].nunique()}"
)


# ============================================================
# 2. NORMALIZE MEDICINE NAMES
# ============================================================

print()
print("[2/8] Normalizing medicine names...")


def normalize_medicine_name(name):

    name = str(name).lower().strip()

    # Remove repeated spaces
    name = " ".join(
        name.split()
    )

    # Project-specific normalization
    # These variations were observed in the actual dataset.
    if name in [
        "dolo",
        "dolo 650mg",
        "dolo test 650",
        "dolo tests 650",
    ]:
        return "dolo 650"

    return name


df["medicine_group"] = (
    df["medicine_name"]
    .apply(normalize_medicine_name)
)


print(
    "Original medicine names:",
    df["medicine_name"].nunique()
)

print(
    "Normalized medicine groups:",
    df["medicine_group"].nunique()
)


# ============================================================
# 3. FEATURE ENGINEERING
# ============================================================

print()
print("[3/8] Creating forecasting features...")


def create_features(data):

    data = data.copy()

    # --------------------------------------------------------
    # Calendar features
    # --------------------------------------------------------

    data["day_of_week"] = (
        data["date"].dt.dayofweek
    )

    data["day_of_month"] = (
        data["date"].dt.day
    )

    data["month"] = (
        data["date"].dt.month
    )

    data["week_of_year"] = (
        data["date"].dt.isocalendar().week
        .astype(int)
    )

    # --------------------------------------------------------
    # Lag features
    # --------------------------------------------------------

    data["lag_1"] = (
        data
        .groupby("medicine_group")[
            "quantity_sold"
        ]
        .shift(1)
    )

    data["lag_7"] = (
        data
        .groupby("medicine_group")[
            "quantity_sold"
        ]
        .shift(7)
    )

    # --------------------------------------------------------
    # Rolling demand
    # IMPORTANT:
    # Shift first to prevent data leakage.
    # --------------------------------------------------------

    data["rolling_7"] = (
        data
        .groupby("medicine_group")[
            "quantity_sold"
        ]
        .transform(
            lambda x:
            x.shift(1)
            .rolling(
                window=7,
                min_periods=1
            )
            .mean()
        )
    )

    data["rolling_14"] = (
        data
        .groupby("medicine_group")[
            "quantity_sold"
        ]
        .transform(
            lambda x:
            x.shift(1)
            .rolling(
                window=14,
                min_periods=1
            )
            .mean()
        )
    )

    data["rolling_30"] = (
        data
        .groupby("medicine_group")[
            "quantity_sold"
        ]
        .transform(
            lambda x:
            x.shift(1)
            .rolling(
                window=30,
                min_periods=1
            )
            .mean()
        )
    )

    return data


df = create_features(
    df
)


# ============================================================
# 4. REMOVE ROWS WITHOUT ENOUGH HISTORY
# ============================================================

print()
print("[4/8] Preparing training data...")


feature_columns = [
    "day_of_week",
    "day_of_month",
    "month",
    "week_of_year",
    "lag_1",
    "lag_7",
    "rolling_7",
    "rolling_14",
    "rolling_30",
]


# XGBoost cannot use missing values in our intended setup,
# so remove rows where lag features are unavailable.

model_df = df.dropna(
    subset=[
        "lag_1",
        "lag_7"
    ]
).copy()


print(
    f"Usable ML rows: {len(model_df):,}"
)


if len(model_df) < 10:

    print()
    print(
        "WARNING: Very little historical data is available."
    )

    print(
        "The model can still be trained for prototype"
        " experimentation, but more sales history is"
        " recommended for the final IEEE evaluation."
    )


# ============================================================
# 5. TIME-BASED TRAIN / TEST SPLIT
# ============================================================

print()
print("[5/8] Creating time-based train/test split...")


model_df = model_df.sort_values(
    "date"
).reset_index(
    drop=True
)


unique_dates = sorted(
    model_df["date"].unique()
)


if len(unique_dates) < 5:

    print(
        "ERROR: Not enough unique dates "
        "for evaluation."
    )

    raise SystemExit(1)


# Use the last 20% of dates as test data.
split_index = max(
    1,
    int(
        len(unique_dates) * 0.8
    )
)

split_date = unique_dates[
    split_index
]


train_df = model_df[
    model_df["date"] < split_date
].copy()


test_df = model_df[
    model_df["date"] >= split_date
].copy()


print(
    "Training start:",
    train_df["date"].min().date()
)

print(
    "Training end:",
    train_df["date"].max().date()
)

print(
    "Testing start:",
    test_df["date"].min().date()
)

print(
    "Testing end:",
    test_df["date"].max().date()
)

print(
    "Training rows:",
    len(train_df)
)

print(
    "Testing rows:",
    len(test_df)
)


# ============================================================
# 6. TRAIN XGBOOST
# ============================================================

print()
print("[6/8] Training XGBoost model...")


X_train = train_df[
    feature_columns
]

y_train = train_df[
    "quantity_sold"
]


X_test = test_df[
    feature_columns
]

y_test = test_df[
    "quantity_sold"
]


model = XGBRegressor(
    n_estimators=200,
    max_depth=4,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="reg:squarederror",
    random_state=42,
)


model.fit(
    X_train,
    y_train
)


print(
    "XGBoost training completed."
)


# ============================================================
# 7. EVALUATE MODEL
# ============================================================

print()
print("[7/8] Evaluating model...")


predictions = model.predict(
    X_test
)


# Demand cannot be negative.
predictions = np.maximum(
    predictions,
    0
)


mae = mean_absolute_error(
    y_test,
    predictions
)


rmse = np.sqrt(
    mean_squared_error(
        y_test,
        predictions
    )
)


# MAPE is problematic when actual demand is zero.
# Therefore calculate it only for non-zero actual values.

non_zero_mask = (
    y_test > 0
)


if non_zero_mask.sum() > 0:

    mape = np.mean(
        np.abs(
            (
                y_test[
                    non_zero_mask
                ].values
                -
                predictions[
                    non_zero_mask
                ]
            )
            /
            y_test[
                non_zero_mask
            ].values
        )
    ) * 100

else:

    mape = np.nan


print()
print("=" * 65)
print("                 XGBOOST RESULTS")
print("=" * 65)

print(
    f"MAE  : {mae:.4f}"
)

print(
    f"RMSE : {rmse:.4f}"
)

if np.isnan(mape):

    print(
        "MAPE : Not available "
        "(no non-zero test observations)"
    )

else:

    print(
        f"MAPE : {mape:.2f}%"
    )


# ============================================================
# 8. SAVE MODEL
# ============================================================

print()
print("[8/8] Saving model...")


model_file = (
    MODEL_DIR
    / "demand_forecasting_xgboost.pkl"
)


joblib.dump(
    model,
    model_file
)


# Save metadata
metadata = {
    "model": "XGBoost",
    "target": "quantity_sold",
    "features": feature_columns,
    "mae": float(mae),
    "rmse": float(rmse),
    "mape": (
        None
        if np.isnan(mape)
        else float(mape)
    ),
    "training_rows": len(train_df),
    "testing_rows": len(test_df),
}


metadata_file = (
    MODEL_DIR
    / "demand_model_metadata.pkl"
)


joblib.dump(
    metadata,
    metadata_file
)


# ============================================================
# PREDICTION PREVIEW
# ============================================================

results = test_df[
    [
        "date",
        "medicine_group",
        "quantity_sold"
    ]
].copy()


results["predicted_demand"] = (
    predictions
)


results["prediction_error"] = (
    results["quantity_sold"]
    -
    results["predicted_demand"]
)


print()
print("=" * 65)
print("             PREDICTION PREVIEW")
print("=" * 65)

print()

print(
    results.head(20).to_string(
        index=False
    )
)


# ============================================================
# FEATURE IMPORTANCE
# ============================================================

importance_df = pd.DataFrame(
    {
        "feature": feature_columns,
        "importance": model.feature_importances_
    }
).sort_values(
    "importance",
    ascending=False
)


print()
print("=" * 65)
print("             FEATURE IMPORTANCE")
print("=" * 65)

print()

print(
    importance_df.to_string(
        index=False
    )
)


# ============================================================
# SAVE EVALUATION RESULTS
# ============================================================

evaluation_file = (
    PROJECT_ROOT
    / "ml"
    / "evaluation"
    / "xgboost_predictions.csv"
)


evaluation_file.parent.mkdir(
    parents=True,
    exist_ok=True
)


results.to_csv(
    evaluation_file,
    index=False
)


importance_file = (
    PROJECT_ROOT
    / "ml"
    / "evaluation"
    / "feature_importance.csv"
)


importance_df.to_csv(
    importance_file,
    index=False
)


print()
print("=" * 65)
print("              TRAINING COMPLETE")
print("=" * 65)

print()

print(
    "Model:"
)

print(
    model_file
)

print()

print(
    "Evaluation:"
)

print(
    evaluation_file
)

print()

print(
    "Feature importance:"
)

print(
    importance_file
)

print()

print(
    "Next step:"
)

print(
    "Compare XGBoost against the existing"
)

print(
    "30-day moving-average baseline."
)

print()