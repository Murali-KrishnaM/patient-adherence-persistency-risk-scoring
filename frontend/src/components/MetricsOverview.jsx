import React from 'react';
import { Users, AlertTriangle } from 'lucide-react';
import { getRiskTierMeta } from '../utils/clinicalLabels';

export default function MetricsOverview({ patients }) {
  if (!patients || patients.length === 0) return null;

  const totalPatients = patients.length;
  const highRiskCount = patients.filter(p => getRiskTierMeta(p.risk_tier).isHigh).length;
  const highRiskPct = totalPatients > 0 ? Math.round((highRiskCount / totalPatients) * 100) : 0;

  return (
    <div className="space-y-4 mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Total Patients */}
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

        {/* High Risk Drop-off */}
        <div className="glass-panel p-4 rounded-2xl border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-950/20 relative overflow-hidden group hover:border-red-400 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">High Risk Drop-off</p>
              <div className="flex items-baseline space-x-2 mt-1">
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{highRiskCount}</h3>
                <span className="text-xs font-bold text-red-600 dark:text-red-400">({highRiskPct}%)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Require Immediate Intervention
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-500/30">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}