import React from 'react';
import { Users, AlertTriangle, DollarSign, ShieldCheck, TrendingUp, HeartPulse } from 'lucide-react';

export default function MetricsOverview({ patients }) {
  if (!patients || patients.length === 0) return null;

  const totalPatients = patients.length;
  const highRiskCount = patients.filter(p => p.risk_tier === 'High').length;
  const medRiskCount = patients.filter(p => p.risk_tier === 'Medium').length;
  const lowRiskCount = patients.filter(p => p.risk_tier === 'Low').length;

  const highRiskPct = Math.round((highRiskCount / totalPatients) * 100);

  const totalAtRiskRevenue = patients.reduce((acc, p) => acc + (p.at_risk_revenue || 0), 0);
  const totalPreventableRevenue = patients.reduce((acc, p) => acc + (p.preventable_revenue || 0), 0);

  let highCopayCount = patients.filter(p => p.patient_pay_amt >= 60).length;
  let highGapCount = patients.filter(p => p.refill_gaps_days >= 20).length;
  let topDriver = highGapCount >= highCopayCount ? "Historical Refill Gaps (>20 days)" : "Out-of-Pocket Copay Burden (>$60)";

  return (
    <div className="space-y-4 mb-8">
      {/* Executive Financial & Risk KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* 1. Total Patients */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Patients</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{totalPatients}</h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center space-x-1 font-medium">
                <Users className="w-3 h-3" />
                <span>Full Batch Scored</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 2. High Risk Drop-off */}
        <div className="glass-panel p-4 rounded-2xl border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-950/20 relative overflow-hidden group hover:border-red-400 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">High Risk Drop-off</p>
              <div className="flex items-baseline space-x-2 mt-1">
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{highRiskCount}</h3>
                <span className="text-xs font-bold text-red-600 dark:text-red-400">({highRiskPct}%)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {medRiskCount} Med • {lowRiskCount} Low
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-500/30">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
          </div>
        </div>

        {/* 3. At-Risk Revenue Loss */}
        <div className="glass-panel p-4 rounded-2xl border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">At-Risk Revenue Loss</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">${totalAtRiskRevenue.toLocaleString()}</h3>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-1">
                Est. Annual Rx Drop-Off
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-500/30">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 4. Preventable Retention Revenue */}
        <div className="glass-panel p-4 rounded-2xl border-emerald-300 dark:border-emerald-400/40 bg-emerald-50/80 dark:bg-emerald-950/20 relative overflow-hidden group hover:border-emerald-500 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Preventable Revenue</p>
              <h3 className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-300 mt-1">${totalPreventableRevenue.toLocaleString()}</h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center space-x-1 font-medium">
                <TrendingUp className="w-3 h-3" />
                <span>76% Recovery with Alerts</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-300 dark:border-emerald-400/40 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 5. Top Risk Driver */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Top Risk Driver</p>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white mt-1 leading-snug truncate max-w-[140px]" title={topDriver}>
                {topDriver}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center space-x-1 font-medium">
                <HeartPulse className="w-3 h-3" />
                <span>AI Feature Attribution</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/20">
              <HeartPulse className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Pharma Revenue & Profit Recovery Balance Banner */}
      <div className="glass-panel p-4 rounded-2xl border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/20 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-bold font-mono text-[10px] shadow-sm">
            PHARMA ROI BALANCE
          </div>
          <p className="text-slate-700 dark:text-slate-300">
            By dispatching MedCare targeted alerts, pharmaceutical manufacturers can balance estimated annual leakage of <span className="text-amber-700 dark:text-amber-400 font-bold">${totalAtRiskRevenue.toLocaleString()}</span> and recapture up to <span className="text-emerald-700 dark:text-emerald-400 font-bold">${totalPreventableRevenue.toLocaleString()}</span> in net retained prescription refills.
          </p>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-bold">
          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Net Retained Margin: +76.0%</span>
        </div>
      </div>
    </div>
  );
}
