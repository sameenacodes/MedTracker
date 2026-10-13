from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
)

# ============================================================
# MEDTRACKER
# BASELINE VS XGBOOST COMPARISON
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATA_FILE = (
    PROJECT_ROOT
    / "ml"
    / "data"
    / "medicine_sales_daily.csv"
)

XGB_RESULTS_FILE = (
    PROJECT_ROOT
    / "ml"
    / "evaluation"
    / "xgboost_predictions.csv"
)

OUTPUT_FILE = (
    PROJECT_ROOT
    / "ml"
    / "evaluation"
    / "model_comparison.csv"
)


print()
print("=" * 65)
print("       MEDTRACKER MODEL COMPARISON")
print("=" * 65)
print()


# ============================================================
# LOAD DATA
# ============================================================

print("[1/5] Loading datasets...")

df = pd.read_csv(
    DATA_FILE
)

df["date"] = pd.to_datetime(
    df["date"]
)


xgb = pd.read_csv(
    XGB_RESULTS_FILE
)

xgb["date"] = pd.to_datetime(
    xgb["date"]
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


df["medicine_group"] = (
    df["medicine_name"]
    .apply(normalize_medicine_name)
)


# ============================================================
# DETERMINE TEST PERIOD
# ============================================================

test_start = xgb["date"].min()
test_end = xgb["date"].max()

print(
    "Test period:",
    test_start.date(),
    "to",
    test_end.date()
)


# ============================================================
# CREATE 30-DAY MOVING AVERAGE BASELINE
# ============================================================

print()
print("[2/5] Calculating 30-day moving-average baseline...")


df = df.sort_values(
    [
        "medicine_group",
        "date"
    ]
).reset_index(
    drop=True
)


# ------------------------------------------------------------
# IMPORTANT:
# Shift by one day so today's actual demand is not used
# to predict today's demand.
# ------------------------------------------------------------

df["baseline_30day"] = (
    df
    .groupby(
        "medicine_group"
    )["quantity_sold"]
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


# ============================================================
# GET SAME TEST PERIOD
# ============================================================

baseline_test = df[
    (
        df["date"] >= test_start
    )
    &
    (
        df["date"] <= test_end
    )
].copy()


# ============================================================
# MATCH XGBOOST TEST ROWS
# ============================================================

baseline_test = baseline_test.merge(
    xgb[
        [
            "date",
            "medicine_group"
        ]
    ],
    on=[
        "date",
        "medicine_group"
    ],
    how="inner"
)


# ============================================================
# ACTUAL VALUES
# ============================================================

y_actual = (
    baseline_test[
        "quantity_sold"
    ].values
)


y_baseline = (
    baseline_test[
        "baseline_30day"
    ]
    .fillna(0)
    .values
)


# ============================================================
# CALCULATE BASELINE METRICS
# ============================================================

print()
print("[3/5] Evaluating baseline...")


baseline_mae = mean_absolute_error(
    y_actual,
    y_baseline
)


baseline_rmse = np.sqrt(
    mean_squared_error(
        y_actual,
        y_baseline
    )
)


non_zero_mask = (
    y_actual > 0
)


if non_zero_mask.sum() > 0:

    baseline_mape = (
        np.mean(
            np.abs(
                (
                    y_actual[
                        non_zero_mask
                    ]
                    -
                    y_baseline[
                        non_zero_mask
                    ]
                )
                /
                y_actual[
                    non_zero_mask
                ]
            )
        )
        * 100
    )

else:

    baseline_mape = np.nan


# ============================================================
# LOAD XGBOOST METRICS
# ============================================================

xgb_predictions = pd.read_csv(
    XGB_RESULTS_FILE
)

xgb_predictions = xgb_predictions[
    "predicted_demand"
].values

xgb_actual = pd.read_csv(
    XGB_RESULTS_FILE
)[
    "quantity_sold"
].values


xgb_mae = mean_absolute_error(
    xgb_actual,
    xgb_predictions
)


xgb_rmse = np.sqrt(
    mean_squared_error(
        xgb_actual,
        xgb_predictions
    )
)


non_zero_xgb = (
    xgb_actual > 0
)


if non_zero_xgb.sum() > 0:

    xgb_mape = (
        np.mean(
            np.abs(
                (
                    xgb_actual[
                        non_zero_xgb
                    ]
                    -
                    xgb_predictions[
                        non_zero_xgb
                    ]
                )
                /
                xgb_actual[
                    non_zero_xgb
                ]
            )
        )
        * 100
    )

else:

    xgb_mape = np.nan


# ============================================================
# DISPLAY RESULTS
# ============================================================

print()
print("=" * 65)
print("                 MODEL COMPARISON")
print("=" * 65)

print()

print(
    f"{'Metric':<15}"
    f"{'Baseline':>15}"
    f"{'XGBoost':>15}"
)

print("-" * 45)

print(
    f"{'MAE':<15}"
    f"{baseline_mae:>15.4f}"
    f"{xgb_mae:>15.4f}"
)

print(
    f"{'RMSE':<15}"
    f"{baseline_rmse:>15.4f}"
    f"{xgb_rmse:>15.4f}"
)

if np.isnan(baseline_mape):

    print(
        f"{'MAPE':<15}"
        f"{'N/A':>15}"
        f"{xgb_mape:>14.2f}%"
    )

else:

    print(
        f"{'MAPE':<15}"
        f"{baseline_mape:>14.2f}%"
        f"{xgb_mape:>14.2f}%"
    )


# ============================================================
# DETERMINE BETTER MODEL
# ============================================================

print()

if xgb_mae < baseline_mae:

    print(
        "Result: XGBoost has lower MAE "
        "than the baseline."
    )

elif xgb_mae > baseline_mae:

    print(
        "Result: Baseline has lower MAE "
        "than XGBoost."
    )

else:

    print(
        "Result: Both models have the same MAE."
    )


# ============================================================
# CALCULATE IMPROVEMENT
# ============================================================

if baseline_mae != 0:

    improvement = (
        (
            baseline_mae
            -
            xgb_mae
        )
        /
        baseline_mae
    ) * 100

    print(
        f"MAE improvement: "
        f"{improvement:.2f}%"
    )


# ============================================================
# SAVE COMPARISON
# ============================================================

comparison = pd.DataFrame(
    {
        "metric": [
            "MAE",
            "RMSE",
            "MAPE"
        ],
        "baseline_30day": [
            baseline_mae,
            baseline_rmse,
            baseline_mape
        ],
        "xgboost": [
            xgb_mae,
            xgb_rmse,
            xgb_mape
        ]
    }
)


comparison.to_csv(
    OUTPUT_FILE,
    index=False
)


print()
print("[4/5] Comparison saved:")
print(OUTPUT_FILE)


# ============================================================
# SAVE DETAILED BASELINE PREDICTIONS
# ============================================================

baseline_predictions = baseline_test[
    [
        "date",
        "medicine_group",
        "quantity_sold",
        "baseline_30day"
    ]
].copy()


baseline_predictions.to_csv(
    PROJECT_ROOT
    / "ml"
    / "evaluation"
    / "baseline_predictions.csv",
    index=False
)


print()
print("[5/5] Detailed baseline predictions saved.")


print()
print("=" * 65)
print("             COMPARISON COMPLETE")
print("=" * 65)
print()