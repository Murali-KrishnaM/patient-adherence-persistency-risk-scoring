import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { PieChart as PieIcon, BarChart3, Heart, Layers } from 'lucide-react';
import { getRiskTierMeta, getPrimaryCondition } from '../utils/clinicalLabels';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-emerald-500/30 p-3 rounded-xl shadow-xl text-slate-900 dark:text-white text-xs space-y-1 z-30">
        <p className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-emerald-500/20 pb-1 mb-1">
          {label || payload[0].name}
        </p>
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between space-x-3 text-[11px]">
            <span className="flex items-center space-x-1.5" style={{ color: item.color || item.fill || '#10B981' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill || '#10B981' }}></span>
              <span className="font-semibold">{item.name || 'Value'}:</span>
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{item.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Visualizations({ patients }) {

  if (!patients || patients.length === 0) return null;

  // 1. Risk Tier Donut Chart Data
  const riskCounts = { High: 0, Medium: 0, Low: 0 };
  patients.forEach(p => {
    const tier = getRiskTierMeta(p.risk_tier);
    if (tier.key === 'High') riskCounts.High++;
    else if (tier.key === 'Medium') riskCounts.Medium++;
    else if (tier.key === 'Low') riskCounts.Low++;
  });

  const pieData = [
    { name: 'High Risk', value: riskCounts.High, color: '#F87171' },
    { name: 'Medium Risk', value: riskCounts.Medium, color: '#FBBF24' },
    { name: 'Low Risk', value: riskCounts.Low, color: '#34D399' }
  ];

  // 2. Age Group vs Risk Stacked Bar Data
  const ageGroups = {
    '< 55 yrs': { High: 0, Medium: 0, Low: 0 },
    '55 - 65 yrs': { High: 0, Medium: 0, Low: 0 },
    '66 - 75 yrs': { High: 0, Medium: 0, Low: 0 },
    '76+ yrs': { High: 0, Medium: 0, Low: 0 },
  };

  patients.forEach(p => {
    let group = '76+ yrs';
    if (p.age < 55) group = '< 55 yrs';
    else if (p.age <= 65) group = '55 - 65 yrs';
    else if (p.age <= 75) group = '66 - 75 yrs';

    const tierKey = getRiskTierMeta(p.risk_tier).key;
    if (ageGroups[group][tierKey] !== undefined) {
      ageGroups[group][tierKey]++;
    }
  });

  const ageChartData = Object.keys(ageGroups).map(group => ({
    ageGroup: group,
    High: ageGroups[group].High,
    Medium: ageGroups[group].Medium,
    Low: ageGroups[group].Low,
  }));

  // 3. Condition Category Risk Data — built from the real SP_* comorbidity
  // flags (via getPrimaryCondition) instead of a fabricated disease name.
  const conditionMap = {};
  patients.forEach(p => {
    const c = getPrimaryCondition(p);
    if (!conditionMap[c]) {
      conditionMap[c] = { condition: c, highRiskCount: 0, totalCount: 0, sumScore: 0 };
    }
    conditionMap[c].totalCount++;
    conditionMap[c].sumScore += p.risk_score;
    if (getRiskTierMeta(p.risk_tier).isHigh) conditionMap[c].highRiskCount++;
  });

  const conditionChartData = Object.values(conditionMap).map(d => ({
    condition: d.condition.length > 18 ? d.condition.substring(0, 18) + '...' : d.condition,
    avgRiskScore: Math.round(d.sumScore / d.totalCount),
    totalCount: d.totalCount
  })).sort((a, b) => b.avgRiskScore - a.avgRiskScore);

  return (
    <div className="space-y-6 mb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-dark-900/60 p-4 rounded-2xl border border-slate-200 dark:border-emerald-500/20 shadow-sm">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Visual Risk & Predictive Intelligence Suite
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive analytics charts, built from model output
            </p>
          </div>
        </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 1: Risk Tier Donut Distribution */}
        <div className="glass-panel p-5 rounded-2xl border flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <PieIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Patient Risk Tier Distribution</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Calculated proportion of High, Medium, & Low risk patients</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Age Group vs Risk Stacked Bar */}
        <div className="glass-panel p-5 rounded-2xl border flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Risk Severity by Age Demographic</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Evaluating age-related refill and adherence barriers</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(16, 185, 129, 0.12)" vertical={false} />
                <XAxis dataKey="ageGroup" stroke="#64748B" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="High" name="High Risk" stackId="a" fill="#F87171" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Medium" name="Medium Risk" stackId="a" fill="#FBBF24" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Low" name="Low Risk" stackId="a" fill="#34D399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Condition Category Risk — real comorbidity flags */}
        <div className="glass-panel p-5 rounded-2xl border flex flex-col justify-between group lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <Heart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Average Risk Score by Flagged Condition</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grouped by each patient's first flagged chronic condition on record
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conditionChartData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(16, 185, 129, 0.12)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#64748B" tick={{ fontSize: 11 }} />
                <YAxis dataKey="condition" type="category" stroke="#64748B" tick={{ fontSize: 10 }} width={160} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgRiskScore" name="Avg Risk Score %" fill="#10B981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}