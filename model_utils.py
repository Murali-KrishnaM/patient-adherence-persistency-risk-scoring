"""
Model loading, scoring, and explanation.

This module is intentionally the ONLY place that touches the trained
model. It receives a feature DataFrame (already assembled by etl.py from
clinical.* tables) and returns risk probabilities + human-readable top
factors. It never queries the database and never sees PII -- it only
ever sees what's handed to it as `patient_id` + feature columns.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

HERE = Path(__file__).resolve().parent
ARTIFACTS = HERE / "model_artifacts"

# Human-readable labels for SHAP top-factor display in the UI.
# Sign of the SHAP value tells us whether it pushed risk up or down.
FEATURE_LABELS = {
    "total_fills_early": "recent pharmacy fill frequency",
    "avg_days_supply_early": "typical prescription length",
    "avg_cost_burden_early": "average out-of-pocket cost per fill",
    "total_cost_burden_early": "total recent out-of-pocket cost",
    "num_distinct_ndc_early": "number of distinct medications",
    "AGE": "patient age",
    "BENE_SEX_IDENT_CD": "sex",
    "BENE_RACE_CD": "race category",
    "SP_ALZHDMTA": "Alzheimer's / related disorder",
    "SP_CHF": "heart failure",
    "SP_CHRNKIDN": "chronic kidney disease",
    "SP_CNCR": "cancer",
    "SP_COPD": "COPD",
    "SP_DEPRESSN": "depression",
    "SP_DIABETES": "diabetes",
    "SP_ISCHMCHT": "ischemic heart disease",
    "SP_OSTEOPRS": "osteoporosis",
    "SP_RA_OA": "rheumatoid/osteoarthritis",
    "SP_STRKETIA": "stroke / TIA history",
}


class RiskModel:
    def __init__(self):
        model_path = ARTIFACTS / "model.json"
        cols_path = ARTIFACTS / "feature_columns.json"
        thresholds_path = ARTIFACTS / "risk_thresholds.json"

        if not model_path.exists():
            raise FileNotFoundError(
                f"{model_path} not found. Run scripts/export_model_FROM_NOTEBOOK.py "
                "in your notebook first, then copy model_artifacts/ here."
            )

        self.booster = xgb.Booster()
        self.booster.load_model(str(model_path))

        with open(cols_path) as f:
            self.feature_columns = json.load(f)

        with open(thresholds_path) as f:
            self.thresholds = json.load(f)

    def _dmatrix(self, feature_df: pd.DataFrame) -> xgb.DMatrix:
        # Enforce exact training column order -- mismatched order silently
        # produces wrong predictions with XGBoost's native Booster API.
        ordered = feature_df[self.feature_columns]
        return xgb.DMatrix(ordered, feature_names=self.feature_columns)

    def predict_proba(self, feature_df: pd.DataFrame) -> np.ndarray:
        dmat = self._dmatrix(feature_df)
        return self.booster.predict(dmat)

    def tier_from_probability(self, p: float) -> str:
        if p >= self.thresholds["high"]:
            return "High"
        if p >= self.thresholds["medium"]:
            return "Medium"
        return "Low"

    def explain(self, feature_df: pd.DataFrame, top_n: int = 3):
        """
        Returns, for each row, the top_n features that pushed risk up the
        most (positive SHAP contribution), as human-readable phrases.
        Uses XGBoost's native pred_contribs -- avoids the external `shap`
        library's TreeExplainer version-compatibility bug we hit earlier.
        """
        dmat = self._dmatrix(feature_df)
        contribs = self.booster.predict(dmat, pred_contribs=True)
        contribs = contribs[:, :-1]  # drop base-value column

        results = []
        for row in contribs:
            idx_sorted = np.argsort(row)[::-1]  # highest positive contribution first
            phrases = []
            for idx in idx_sorted[:top_n]:
                colname = self.feature_columns[idx]
                if row[idx] <= 0:
                    continue  # only show risk-increasing factors in the UI card
                label = FEATURE_LABELS.get(colname, colname)
                phrases.append(label)
            while len(phrases) < top_n:
                phrases.append(None)
            results.append(phrases[:top_n])
        return results


_model_singleton = None


def get_model() -> RiskModel:
    global _model_singleton
    if _model_singleton is None:
        _model_singleton = RiskModel()
    return _model_singleton
