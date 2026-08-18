// Shared source of truth for risk-tier styling and clinical label mapping.
// Every component should use these instead of re-implementing its own
// risk_tier string comparisons or hardcoded condition/reason text —
// that duplication is what caused the list vs. detail inconsistency.

export const CONDITION_LABELS = {
  sp_alzhdmta: "Alzheimer's / Dementia",
  sp_chf: 'Congestive Heart Failure',
  sp_chrnkidn: 'Chronic Kidney Disease',
  sp_cncr: 'Cancer',
  sp_copd: 'COPD',
  sp_depressn: 'Depression',
  sp_diabetes: 'Diabetes',
  sp_ischmcht: 'Ischemic Heart Disease',
  sp_osteoprs: 'Osteoporosis',
  sp_ra_oa: 'Rheumatoid / Osteoarthritis',
  sp_strketia: 'Stroke / TIA',
};

// Returns an array of human-readable condition names actually flagged
// (=== 1) for this patient. Works whether keys come back lowercase
// (typical Postgres) or as originally-cased SP_* columns.
export function getConditionTags(patient) {
  if (!patient) return [];
  return Object.entries(CONDITION_LABELS)
    .filter(([key]) => {
      const val = patient[key] ?? patient[key.toUpperCase()];
      return Number(val) === 1;
    })
    .map(([, label]) => label);
}

export function getPrimaryCondition(patient) {
  const tags = getConditionTags(patient);
  return tags.length > 0 ? tags[0] : 'No Flagged Chronic Condition';
}

// Maps raw model feature column names to readable explanations for
// the "why was this patient flagged" reasons list.
const FEATURE_LABELS = {
  total_fills_early: 'High number of early prescription fills',
  avg_days_supply_early: 'Short average days-supply per fill',
  avg_cost_burden_early: 'High average out-of-pocket cost burden',
  total_cost_burden_early: 'High total out-of-pocket cost burden',
  num_distinct_ndc_early: 'Managing multiple distinct medications',
  age: 'Patient age',
  bene_sex_ident_cd: 'Sex',
  bene_race_cd: 'Race/ethnicity',
  ...Object.fromEntries(
    Object.entries(CONDITION_LABELS).map(([k, v]) => [k, `${v} diagnosis on record`])
  ),
};

function formatFeatureName(key) {
  if (!key) return null;
  const lower = key.toLowerCase();
  if (FEATURE_LABELS[lower]) return FEATURE_LABELS[lower];
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Builds the real, per-patient "why flagged" list from the model's
// actual top_factor_1/2/3 fields, instead of showing the same two
// canned sentences for every patient.
export function getReasons(patient) {
  if (!patient) return [];
  return [patient.top_factor_1, patient.top_factor_2, patient.top_factor_3]
    .filter(Boolean)
    .map(formatFeatureName);
}

// Single, case-insensitive source of truth for risk-tier styling.
// Anything reading patient.risk_tier for color/badge logic should
// call this instead of comparing the raw string directly.
export function getRiskTierMeta(tierRaw) {
  const tier = (tierRaw || '').toString().trim().toLowerCase();
  if (tier === 'high') {
    return { key: 'High', isHigh: true, isMed: false, isLow: false };
  }
  if (tier === 'medium') {
    return { key: 'Medium', isHigh: false, isMed: true, isLow: false };
  }
  if (tier === 'low') {
    return { key: 'Low', isHigh: false, isMed: false, isLow: true };
  }
  // Unknown/missing tier — flag it instead of silently rendering as "Low"
  return { key: 'Unknown', isHigh: false, isMed: false, isLow: false };
}