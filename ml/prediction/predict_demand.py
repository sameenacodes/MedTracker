import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]

MODEL_FILE = (
    PROJECT_ROOT
    / "ml"
    / "models"
    / "demand_forecasting_xgboost.pkl"
)

METADATA_FILE = (
    PROJECT_ROOT
    / "ml"
    / "models"
    / "demand_model_metadata.pkl"
)


FEATURE_COLUMNS = [
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


def main():

    try:

        # --------------------------------------------
        # Read JSON sent by Node.js
        # --------------------------------------------

        payload = json.load(sys.stdin)

        records = payload.get(
            "records",
            []
        )


        # --------------------------------------------
        # Check model
        # --------------------------------------------

        if not MODEL_FILE.exists():

            raise FileNotFoundError(
                f"XGBoost model not found: {MODEL_FILE}"
            )


        # --------------------------------------------
        # No records
        # --------------------------------------------

        if not records:

            print(
                json.dumps({
                    "success": True,
                    "predictions": [],
                    "evaluation": None,
                })
            )

            return


        # --------------------------------------------
        # Load trained XGBoost model
        # --------------------------------------------

        model = joblib.load(
            MODEL_FILE
        )


        # --------------------------------------------
        # Convert input to DataFrame
        # --------------------------------------------

        frame = pd.DataFrame(
            records
        )


        # --------------------------------------------
        # Prepare features
        # --------------------------------------------

        for column in FEATURE_COLUMNS:

            if column not in frame.columns:

                frame[column] = 0


            frame[column] = pd.to_numeric(
                frame[column],
                errors="coerce"
            ).fillna(0)


        # --------------------------------------------
        # XGBoost prediction
        # --------------------------------------------

        predictions = model.predict(
            frame[FEATURE_COLUMNS]
        )


        # Demand cannot be negative
        predictions = np.maximum(
            predictions,
            0
        )


        # --------------------------------------------
        # Build response
        # --------------------------------------------

        output = []

        for index, record in enumerate(records):

            output.append({

                "medicineGroup":
                    record.get(
                        "medicineGroup",
                        ""
                    ),

                "date":
                    record.get(
                        "date",
                        ""
                    ),

                "predictedDemand":
                    round(
                        float(
                            predictions[index]
                        ),
                        4
                    ),
            })


        # --------------------------------------------
        # Load model evaluation metadata
        # --------------------------------------------

        evaluation = None


        if METADATA_FILE.exists():

            try:

                metadata = joblib.load(
                    METADATA_FILE
                )

                evaluation = {

                    "mae":
                        metadata.get("mae"),

                    "rmse":
                        metadata.get("rmse"),

                    "mape":
                        metadata.get("mape"),
                }

            except Exception:

                evaluation = None


        # --------------------------------------------
        # Return JSON to Node.js
        # --------------------------------------------

        print(
            json.dumps({

                "success": True,

                "predictions":
                    output,

                "evaluation":
                    evaluation,

            })
        )


    except Exception as error:

        print(
            json.dumps({

                "success": False,

                "message":
                    str(error),

            })
        )


if __name__ == "__main__":
    main()