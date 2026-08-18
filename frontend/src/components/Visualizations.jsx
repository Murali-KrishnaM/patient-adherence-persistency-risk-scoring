import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { PieChart as PieIcon, BarChart3, TrendingUp, Heart, Layers } from 'lucide-react';

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
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {typeof item.value === 'number' && item.value > 100 ? `$${item.value.toLocaleString()}` : item.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Visualizations({ patients }) {
  const [activeChartTab, setActiveChartTab] = useState('all');

  if (!patients || patients.length === 0) return null;

  // 1. Risk Tier Donut Chart Data
  const riskCounts = { High: 0, Medium: 0, Low: 0 };
  patients.forEach(p => {
    if (riskCounts[p.risk_tier] !== undefined) riskCounts[p.risk_tier]++;
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

    if (ageGroups[group][p.risk_tier] !== undefined) {
      ageGroups[group][p.risk_tier]++;
    }
  });

  const ageChartData = Object.keys(ageGroups).map(group => ({
    ageGroup: group,
    High: ageGroups[group].High,
    Medium: ageGroups[group].Medium,
    Low: ageGroups[group].Low,
  }));

  // 3. Disease Category Risk Data
  const diseaseMap = {};
  patients.forEach(p => {
    const d = p.primary_disease || 'Other';
    if (!diseaseMap[d]) {
      diseaseMap[d] = { disease: d, highRiskCount: 0, totalCount: 0, avgRiskScore: 0, sumScore: 0 };
    }
    diseaseMap[d].totalCount++;
    diseaseMap[d].sumScore += p.risk_score;
    if (p.risk_tier === 'High') diseaseMap[d].highRiskCount++;
  });

  const diseaseChartData = Object.values(diseaseMap).map(d => ({
    disease: d.disease.length > 18 ? d.disease.substring(0, 18) + '...' : d.disease,
    avgRiskScore: Math.round(d.sumScore / d.totalCount),
    highRiskPct: Math.round((d.highRiskCount / d.totalCount) * 100),
    totalCount: d.totalCount
  })).sort((a, b) => b.avgRiskScore - a.avgRiskScore);

  // 4. Financial Revenue Impact Data
  const sortedByRisk = [...patients].sort((a, b) => b.risk_score - a.risk_score).slice(0, 10);
  const revenueChartData = sortedByRisk.map((p) => ({
    name: p.patient_id.replace('PDE-', ''),
    AtRisk: p.at_risk_revenue || 0,
    Protected: p.preventable_revenue || 0,
  }));

  return (
    <div className="space-y-6 mb-10">
      {/* Visualizations Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-dark-900/60 p-4 rounded-2xl border border-slate-200 dark:border-emerald-500/20 shadow-sm">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Visual Risk & Predictive Intelligence Suite
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive analytics charts
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-dark-950 p-1 rounded-xl border border-slate-200 dark:border-emerald-500/20 self-start sm:self-auto">
          <button
            onClick={() => setActiveChartTab('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeChartTab === 'all'
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-dark-950 font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Analytics
          </button>
          <button
            onClick={() => setActiveChartTab('demographics')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeChartTab === 'demographics'
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-dark-950 font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Demographics & Disease
          </button>
          <button
            onClick={() => setActiveChartTab('financial')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeChartTab === 'financial'
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-dark-950 font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Revenue Loss
          </button>
        </div>
      </div>

      {/* Grid Layout of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 1: Risk Tier Donut Distribution */}
        {(activeChartTab === 'all' || activeChartTab === 'demographics') && (
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
        )}

        {/* Chart 2: Age Group vs Risk Stacked Bar */}
        {(activeChartTab === 'all' || activeChartTab === 'demographics') && (
          <div className="glass-panel p-5 rounded-2xl border flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Risk Severity by Age Demographic</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Evaluating age-related cognitive and physical refill barriers</p>
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
        )}

        {/* Chart 3: Disease Category Risk Heatmap Bar */}
        {(activeChartTab === 'all' || activeChartTab === 'demographics') && (
          <div className="glass-panel p-5 rounded-2xl border flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <Heart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Average Risk Score by Disease Category</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Identifying chronic conditions with highest non-adherence</p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={diseaseChartData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(16, 185, 129, 0.12)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#64748B" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="disease" type="category" stroke="#64748B" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgRiskScore" name="Avg Risk Score %" fill="#10B981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Chart 4: Financial Revenue Impact & Retention Area */}
        {(activeChartTab === 'all' || activeChartTab === 'financial') && (
          <div className="glass-panel p-5 rounded-2xl border flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>At-Risk Revenue Loss vs Protected Revenue ($)</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Financial recovery potential on top at-risk patient accounts</p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAtRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F87171" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#F87171" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProtected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(16, 185, 129, 0.12)" />
                  <XAxis dataKey="name" stroke="#64748B" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748B" tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="AtRisk" name="Unmanaged Revenue Loss" stroke="#F87171" fillOpacity={1} fill="url(#colorAtRisk)" />
                  <Area type="monotone" dataKey="Protected" name="MedCare Saved Revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorProtected)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
