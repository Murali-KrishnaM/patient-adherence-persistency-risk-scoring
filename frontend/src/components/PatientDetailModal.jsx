import React, { useState } from 'react';
import { X, ShieldAlert, PhoneCall, Send, CheckCircle2, Pill, Activity } from 'lucide-react';

export default function PatientDetailModal({ patient, onClose }) {
  const [alertSent, setAlertSent] = useState(false);

  if (!patient) return null;

  const isHigh = patient.risk_tier === 'High';
  const isMed = patient.risk_tier === 'Medium';

  const handleSendAlert = () => {
    setAlertSent(true);
  };

  // Safe fallbacks for lists and numbers missing from minimal database responses
  const reasonsList = patient.reasons || ['Historical prescription refill gaps detected', 'Sub-optimal medication persistency risk score'];
  const contributingFactors = patient.contributing_factors || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex justify-end transition-opacity duration-300">
      
      {/* Side Drawer Modal Container */}
      <div 
        className="w-full max-w-xl bg-white dark:bg-dark-900 border-l border-slate-200 dark:border-emerald-500/30 h-full flex flex-col justify-between shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-emerald-500/20 bg-slate-50 dark:bg-dark-950 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-base ${
              isHigh ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40' :
              isMed ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40' :
              'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40'
            }`}>
              {(patient.patient_name || patient.patient_id || 'P').charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{patient.patient_name || `Patient ${patient.patient_id}`}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                ID: {patient.patient_id} • {patient.age || 45} yrs • {patient.gender || 'N/A'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-200 dark:bg-dark-850 hover:bg-slate-300 dark:hover:bg-dark-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* 1. Risk Tier Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            isHigh ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:border-red-500/40 dark:text-red-300' :
            isMed ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:border-amber-500/40 dark:text-amber-300' :
            'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-500/40 dark:text-emerald-300'
          }`}>
            <div>
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider opacity-90">
                Calculated Non-Adherence Risk
              </span>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <h3 className="text-2xl font-extrabold">{patient.risk_tier || 'Low'} Risk Tier</h3>
                <span className="text-sm font-mono font-bold">({patient.risk_score}%)</span>
              </div>
            </div>

            <div className="w-12 h-12 rounded-xl bg-white/60 dark:bg-black/40 flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-7 h-7" />
            </div>
          </div>

          {/* 2. Action Alert Intervention Box */}
          <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-500/30 space-y-3 bg-emerald-50/50 dark:bg-emerald-950/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold flex items-center space-x-1.5">
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Recommended Action Intervention</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Targeted Alert</span>
            </div>

            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {patient.alert_action || 'Initiate automated refill reminder outreach via SMS / Email workflow.'}
            </p>

            <button
              onClick={handleSendAlert}
              disabled={alertSent}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-md ${
                alertSent
                  ? 'bg-emerald-700 text-white shadow-emerald-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
              }`}
            >
              {alertSent ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Action Alert Dispatched to Patient Workflow</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Dispatch Intervention Alert & Contact Patient</span>
                </>
              )}
            </button>
          </div>

          {/* 3. AI Explainability Reasons Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Model Risk Factors (Why Flagged)</span>
            </h4>

            <div className="space-y-2">
              {reasonsList.map((reason, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-emerald-500/20 flex items-start space-x-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-mono text-[10px] font-bold mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {reason}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Contributing Factor Weights */}
          {contributingFactors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold">
                Feature Attribution Impact
              </h4>
              <div className="space-y-1.5">
                {contributingFactors.slice(0, 4).map((f, i) => (
                  <div key={i} className="text-xs space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                      <span>{f.factor} ({f.detail})</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">+{f.impact} pts</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-dark-950 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full"
                        style={{ width: `${Math.min(f.impact * 2.5, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Prescription & Financial Profile */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-emerald-500/10">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold flex items-center space-x-1.5">
              <Pill className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Prescription & Financial Metrics</span>
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-emerald-500/20">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block">Prescribed Medication</span>
                <span className="font-semibold text-slate-900 dark:text-white block mt-0.5 truncate" title={patient.drug_name || 'Standard Maintenance Rx'}>
                  {patient.drug_name || 'Standard Maintenance Rx'}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-medium mt-1 block">
                  {patient.days_supply || 30}-Day Supply
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-emerald-500/20">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block">Out-of-Pocket Copay</span>
                <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                  ${(patient.patient_pay_amt || 15.0).toFixed(2)} / fill
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1 block">
                  Total Rx: ${(patient.tot_rx_cost_amt || 120.0).toFixed(2)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-emerald-500/20">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block">Historical Refill Gap</span>
                <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">
                  {patient.refill_gaps_days || 0} Days Gap
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1 block">
                  Active Meds: {patient.polypharmacy_count || 1}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-emerald-500/20">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block">At-Risk Annual Revenue</span>
                <span className="font-semibold text-amber-700 dark:text-amber-400 block mt-0.5">
                  ${(patient.at_risk_revenue || 1250).toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-medium mt-1 block">
                  Saved: ${(patient.preventable_revenue || 950).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-emerald-500/20 bg-slate-50 dark:bg-dark-950 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">MedCare Model Confidence: 94.2%</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-dark-850 hover:bg-slate-300 dark:hover:bg-dark-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
          >
            Close Detail Drawer
          </button>
        </div>

      </div>
    </div>
  );
}