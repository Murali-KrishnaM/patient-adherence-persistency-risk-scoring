"""
IMPORTANT: this is not run standalone. Copy-paste this cell into your
EXISTING notebook (NewDawn.ipynb), AFTER the cell where `xgb` (the trained
XGBClassifier) and `feature_cols` already exist in memory.

It saves everything the Flask backend needs to score new patients:
    model_artifacts/model.json              -- the trained XGBoost model
    model_artifacts/feature_columns.json    -- exact column order the model expects
    model_artifacts/risk_thresholds.json    -- tunable tier cutoffs

Run this once, then copy the whole `model_artifacts/` folder into the
backend project directory (or point EXPORT_DIR below directly at it).
"""
import json
from pathlib import Path

EXPORT_DIR = Path("model_artifacts")   # change this path if needed
EXPORT_DIR.mkdir(exist_ok=True)

# 1. Save the trained model in XGBoost's native format
xgb.get_booster().save_model(str(EXPORT_DIR / "model.json"))
print(f"Saved model to {EXPORT_DIR / 'model.json'}")

# 2. Save the exact feature column order the model was trained on.
#    The backend MUST build its feature DataFrame in this exact order.
with open(EXPORT_DIR / "feature_columns.json", "w") as f:
    json.dump(list(X_train.columns), f, indent=2)
print(f"Saved feature column order to {EXPORT_DIR / 'feature_columns.json'}")

# 3. Save tunable risk-tier probability thresholds.
#    Adjust these numbers based on the predict_proba distribution on your
#    test set if you want tier sizes to look different in the demo --
#    this is a presentation choice, not a retraining decision.
thresholds = {"high": 0.60, "medium": 0.35}
with open(EXPORT_DIR / "risk_thresholds.json", "w") as f:
    json.dump(thresholds, f, indent=2)
print(f"Saved risk thresholds to {EXPORT_DIR / 'risk_thresholds.json'}")

print("\nDone. Copy the model_artifacts/ folder into the backend project.")
