/**
 * MedCare Patient Medication Adherence & Drop-Off Prediction Engine
 * Calculates risk score (0-100%), risk tier, AI explainability reasons,
 * and targeted action alert interventions.
 */

export function calculatePatientRisk(patient) {
  let score = 15; // Base baseline risk
  const reasons = [];
  const contributingFactors = [];

  const age = Number(patient.age || 65);
  const payAmt = Number(patient.patient_pay_amt || 0);
  const gapDays = Number(patient.refill_gaps_days || 0);
  const polyCount = Number(patient.polypharmacy_count || 1);
  const daysSupply = Number(patient.days_supply || 30);
  const disease = patient.primary_disease || "General";
  const annualSpend = Number(patient.annual_rx_spend || (payAmt * 12 * 4));

  // 1. Refill Gap Factor (Highest Weight)
  if (gapDays >= 45) {
    score += 40;
    reasons.push(`Severe history of refill gap (${gapDays} days overdue)`);
    contributingFactors.push({ factor: "Historical Refill Gap", impact: 40, detail: `${gapDays} days overdue` });
  } else if (gapDays >= 25) {
    score += 25;
    reasons.push(`Moderate refill gap detected (${gapDays} days)`);
    contributingFactors.push({ factor: "Historical Refill Gap", impact: 25, detail: `${gapDays} days` });
  } else if (gapDays >= 10) {
    score += 12;
    contributingFactors.push({ factor: "Historical Refill Gap", impact: 12, detail: `${gapDays} days` });
  }

  // 2. Financial Out-of-Pocket Cost Burden
  if (payAmt >= 120) {
    score += 30;
    reasons.push(`Extreme out-of-pocket copay burden ($${payAmt.toFixed(2)}/refill)`);
    contributingFactors.push({ factor: "Out-of-Pocket Cost", impact: 30, detail: `$${payAmt.toFixed(2)}` });
  } else if (payAmt >= 60) {
    score += 18;
    reasons.push(`High monthly copay cost ($${payAmt.toFixed(2)})`);
    contributingFactors.push({ factor: "Out-of-Pocket Cost", impact: 18, detail: `$${payAmt.toFixed(2)}` });
  } else if (payAmt >= 30) {
    score += 8;
    contributingFactors.push({ factor: "Out-of-Pocket Cost", impact: 8, detail: `$${payAmt.toFixed(2)}` });
  }

  // 3. Polypharmacy & Medication Complexity
  if (polyCount >= 8) {
    score += 22;
    reasons.push(`Severe polypharmacy complexity (${polyCount} active meds)`);
    contributingFactors.push({ factor: "Polypharmacy Burden", impact: 22, detail: `${polyCount} medications` });
  } else if (polyCount >= 5) {
    score += 12;
    reasons.push(`Complex regimen (${polyCount} active meds)`);
    contributingFactors.push({ factor: "Polypharmacy Burden", impact: 12, detail: `${polyCount} medications` });
  }

  // 4. Age & Cognitive / Mobility Risk Factor
  if (age >= 78) {
    score += 15;
    reasons.push(`Advanced age barrier (${age} yrs) requiring assistance`);
    contributingFactors.push({ factor: "Age Barrier", impact: 15, detail: `${age} yrs` });
  } else if (age >= 70) {
    score += 8;
    contributingFactors.push({ factor: "Age Factor", impact: 8, detail: `${age} yrs` });
  }

  // 5. High-Risk Disease Condition
  if (disease.includes("Alzheimer") || disease.includes("Dementia")) {
    score += 25;
    reasons.push("High-risk cognitive condition (Alzheimer's/Dementia)");
    contributingFactors.push({ factor: "Cognitive Condition", impact: 25, detail: disease });
  } else if (disease.includes("COPD") || disease.includes("Diabetes")) {
    score += 12;
    reasons.push(`Asymptomatic drop-off tendency in ${disease}`);
    contributingFactors.push({ factor: "Disease Type", impact: 12, detail: disease });
  } else if (disease.includes("Heart") || disease.includes("Kidney")) {
    score += 10;
    contributingFactors.push({ factor: "Disease Complexity", impact: 10, detail: disease });
  }

  // 6. Days Supply Friction
  if (daysSupply <= 30) {
    score += 6;
    contributingFactors.push({ factor: "30-Day Supply Friction", impact: 6, detail: "30 days" });
  }

  // Cap Score between 5% and 98%
  const finalRiskScore = Math.min(Math.max(Math.round(score), 5), 98);

  // Assign Risk Tier
  let riskTier = "Low";
  if (finalRiskScore >= 65) {
    riskTier = "High";
  } else if (finalRiskScore >= 35) {
    riskTier = "Medium";
  }

  // Ensure default reasons if list is sparse
  if (reasons.length === 0) {
    reasons.push("Stable medication fill history", "Affordable out-of-pocket copay");
  }

  // Recommended Intervention Alert
  let alertAction = "Mobile App & Email Reminder";
  let alertType = "digital";

  if (riskTier === "High") {
    if (payAmt >= 80) {
      alertAction = "Direct Phone Call & Copay Subsidy Assistance";
      alertType = "phone_subsidy";
    } else if (disease.includes("Alzheimer") || age >= 78) {
      alertAction = "Care Coordinator Home Contact & Caregiver Alert";
      alertType = "care_coordinator";
    } else {
      alertAction = "Direct Phone Call & Pharmacist Consultation";
      alertType = "phone_consult";
    }
  } else if (riskTier === "Medium") {
    if (payAmt >= 50) {
      alertAction = "Copay Discount Voucher & 90-Day Mail Order";
      alertType = "copay_discount";
    } else {
      alertAction = "Automated Interactive Voice & SMS Refill Alert";
      alertType = "sms_voice";
    }
  } else {
    alertAction = "Automated App Push Notification";
    alertType = "app_push";
  }

  const atRiskRevenue = Math.round(annualSpend * (finalRiskScore / 100));
  const preventableRevenue = Math.round(atRiskRevenue * 0.76); // 76% intervention recovery rate

  return {
    ...patient,
    contact_number: patient.contact_number || `+1 (555) ${Math.floor(100 + Math.random() * 899)}-${Math.floor(1000 + Math.random() * 8999)}`,
    email: patient.email || `${(patient.patient_name || 'patient').toLowerCase().replace(/\s+/g, '.')}@medcare-health.org`,
    contact_status: patient.contact_status || 'Pending Contact',
    snoozed_until: patient.snoozed_until || null,
    risk_score: finalRiskScore,
    risk_tier: riskTier,
    reasons: reasons.slice(0, 3), // Top 3 reasons
    contributing_factors: contributingFactors.sort((a, b) => b.impact - a.impact),
    alert_action: alertAction,
    alert_type: alertType,
    at_risk_revenue: atRiskRevenue,
    preventable_revenue: preventableRevenue
  };
}

/**
 * Run batch risk predictions on an array of patient records
 */
export function predictBatch(patients) {
  return patients.map(patient => calculatePatientRisk(patient));
}
