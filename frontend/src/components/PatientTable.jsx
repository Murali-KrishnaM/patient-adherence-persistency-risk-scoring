import React, { useState, useMemo } from 'react';
import { 
  Search, ArrowUpDown, ChevronRight, Phone, Mail, Clock, 
  Send, Download, CheckCircle2, AlertCircle, HelpCircle, PhoneCall
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function PatientTable({ 
  patients, 
  onSelectPatient, 
  onOpenEmailModal,
  onToggleContactStatus,
  onSnoozePatient
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('risk_score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [hoveredRiskPatient, setHoveredRiskPatient] = useState(null);
  const [dispatchedAlerts, setDispatchedAlerts] = useState({});

  // Search & Sorting Logic
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        p.patient_id.toLowerCase().includes(term) ||
        p.patient_name.toLowerCase().includes(term) ||
        (p.contact_number && p.contact_number.toLowerCase().includes(term)) ||
        (p.email && p.email.toLowerCase().includes(term)) ||
        (p.drug_name && p.drug_name.toLowerCase().includes(term)) ||
        (p.primary_disease && p.primary_disease.toLowerCase().includes(term))
      );
    }).sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
  }, [patients, searchTerm, sortField, sortOrder]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleDispatchAlert = (e, patientId) => {
    e.stopPropagation();
    setDispatchedAlerts(prev => ({
      ...prev,
      [patientId]: true
    }));
  };

  const exportCSV = () => {
    const exportData = filteredPatients.map(p => ({
      "Patient ID": p.patient_id,
      "Name": p.patient_name,
      "Age": p.age,
      "Gender": p.gender,
      "Contact Number": p.contact_number,
      "Email": p.email,
      "Contact Status": p.contact_status || 'Pending Contact',
      "Primary Disease": p.primary_disease,
      "Prescribed Drug": p.drug_name,
      "Risk Score (%)": p.risk_score,
      "Risk Tier": p.risk_tier,
      "AI Prediction Reasons": (p.reasons || []).join('; '),
      "Recommended Action Alert": p.alert_action,
      "Copay Cost ($)": p.patient_pay_amt,
      "Refill Gap (Days)": p.refill_gaps_days,
      "At Risk Revenue ($)": p.at_risk_revenue
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Datawarehouse Predictions");
    XLSX.writeFile(workbook, `MedCare_Patient_Risk_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="space-y-4 mb-12">
      
      {/* Search Header Bar */}
      <div className="glass-panel p-3.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patient name, phone, email, condition, or medication..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-dark-950 border border-slate-300 dark:border-emerald-500/30 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Export Excel Button */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            onClick={exportCSV}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-2 transition-all shadow-sm"
            title="Export patient datawarehouse records to Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel Report</span>
          </button>
        </div>
      </div>

      {/* Patient Risk Data Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-dark-950/90 border-b border-slate-200 dark:border-emerald-500/20 text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <th className="py-3.5 px-4 font-bold">Patient Profile</th>
                <th className="py-3.5 px-4 font-bold">Contact Number</th>
                <th className="py-3.5 px-4 font-bold">Email (Auto-Mail)</th>
                <th 
                  className="py-3.5 px-4 font-bold cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  onClick={() => toggleSort('risk_score')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Risk Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-bold text-center">Contact Status</th>
                <th className="py-3.5 px-4 font-bold text-center">Actions & Snooze</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-emerald-500/10 text-xs">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <p className="text-sm font-semibold">No patient records matching search query.</p>
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                    >
                      Clear search
                    </button>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const isHigh = patient.risk_tier === 'High';
                  const isMed = patient.risk_tier === 'Medium';
                  const isAlertDispatched = dispatchedAlerts[patient.patient_id];
                  const isSnoozed = patient.contact_status === 'Snoozed' || patient.snoozed_until;
                  const isContacted = patient.contact_status === 'Contacted';

                  return (
                    <tr
                      key={patient.patient_id}
                      onClick={() => onSelectPatient(patient)}
                      className="hover:bg-emerald-50/50 dark:hover:bg-dark-800/60 transition-colors cursor-pointer group"
                    >
                      {/* 1. Patient Profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isHigh ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30' :
                            isMed ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' :
                            'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                          }`}>
                            {patient.patient_name ? patient.patient_name.charAt(0) : 'P'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {patient.patient_name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {(patient.patient_name || patient.patient_id || 'U').charAt(0)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Contact Number */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span>{patient.contact_number || '+1 (555) 000-0000'}</span>
                        </div>
                      </td>

                      {/* 3. Email (Automated Mail Trigger on Click) */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenEmailModal) onOpenEmailModal(patient);
                          }}
                          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border bg-slate-50 hover:bg-emerald-50 dark:bg-dark-950 dark:hover:bg-emerald-950/40 border-slate-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 transition-all font-mono text-[11px] group/mail"
                          title="Click to send automated email reminder & explain contact reason"
                        >
                          <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover/mail:scale-110 transition-transform" />
                          <span className="truncate max-w-[130px] font-semibold underline decoration-emerald-500/30">
                            {patient.email}
                          </span>
                        </button>
                      </td>

                      {/* 4. Risk Status (With Cursor Tooltip) */}
                      <td 
                        className="py-3.5 px-4 relative min-w-[160px]"
                        onMouseEnter={() => setHoveredRiskPatient(patient.patient_id)}
                        onMouseLeave={() => setHoveredRiskPatient(null)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border flex items-center space-x-1 ${
                            isHigh ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-400 dark:border-red-500/40' :
                            isMed ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-500/40' :
                            'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-500/40'
                          }`}>
                            <span>{patient.risk_tier.toUpperCase()} RISK</span>
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{patient.risk_score}%</span>
                        </div>
                        {/* Meter */}
                        <div className="w-full bg-slate-200 dark:bg-dark-950 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isHigh ? 'bg-red-500 dark:bg-gradient-to-r dark:from-red-500 dark:to-rose-600' :
                              isMed ? 'bg-amber-500 dark:bg-gradient-to-r dark:from-amber-400 dark:to-yellow-500' :
                              'bg-emerald-500 dark:bg-gradient-to-r dark:from-emerald-500 dark:to-emerald-400'
                            }`}
                            style={{ width: `${patient.risk_score}%` }}
                          ></div>
                        </div>

                        {/* Interactive Cursor Hover Tooltip */}
                        {hoveredRiskPatient === patient.patient_id && (
                          <div className="absolute left-0 bottom-full mb-2 z-30 w-72 p-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-emerald-500/40 text-xs space-y-1.5 animate-in fade-in duration-150 pointer-events-none">
                            <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                              <span className="font-bold text-emerald-400 flex items-center space-x-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Model Risk Factors:</span>
                              </span>
                              <span className="font-mono text-[10px] font-bold text-slate-300">{patient.risk_score}%</span>
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-200">
                              {patient.reasons && patient.reasons.length > 0 ? (
                                patient.reasons.map((r, idx) => (
                                  <div key={idx} className="flex items-start space-x-1.5 leading-tight">
                                    <span className="text-emerald-400 font-bold">•</span>
                                    <span>{r}</span>
                                  </div>
                                ))
                              ) : (
                                <p>Standard adherence monitoring schedule.</p>
                              )}
                            </div>
                            <div className="text-[10px] text-emerald-300/80 font-mono pt-1 border-t border-slate-800">
                              Condition: {patient.primary_disease} ({patient.days_supply}d supply)
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 5. Contact Status */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleContactStatus) onToggleContactStatus(patient.patient_id);
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all inline-flex items-center space-x-1 ${
                            isSnoozed 
                              ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-500/40' 
                              : isContacted
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/40'
                                : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/40'
                          }`}
                          title="Click to toggle patient contact status"
                        >
                          {isSnoozed ? (
                            <>
                              <Clock className="w-3 h-3 text-purple-500" />
                              <span>Snoozed (24h)</span>
                            </>
                          ) : isContacted ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Contacted</span>
                            </>
                          ) : (
                            <>
                              <PhoneCall className="w-3 h-3 text-amber-500" />
                              <span>Pending Contact</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* 6. Actions & Snooze Button */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          
                          {/* Dedicated Snooze Button (Snooze 24h if patient is not reachable at the moment) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSnoozePatient) onSnoozePatient(patient.patient_id);
                            }}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 border ${
                              isSnoozed
                                ? 'bg-purple-900/40 text-purple-300 border-purple-500/40'
                                : 'bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 border-slate-200 dark:bg-dark-850 dark:hover:bg-purple-950/60 dark:text-slate-300 dark:hover:text-purple-300 dark:border-emerald-500/20'
                            }`}
                            title="Patient unreachable? Click to snooze reminder alerts for 24 hours"
                          >
                            <Clock className="w-3 h-3 text-purple-500" />
                            <span>{isSnoozed ? 'Snoozed' : 'Snooze'}</span>
                          </button>

                          {/* Quick Dispatch Alert Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDispatchAlert(e, patient.patient_id)}
                            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                              isAlertDispatched 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                            }`}
                            title="Dispatch Care Alert / Action Reminder"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          
                          {/* View Detail Drawer */}
                          <button
                            type="button"
                            onClick={() => onSelectPatient(patient)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                            title="View Full Patient Profile Drawer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="bg-slate-50 dark:bg-dark-950/90 px-4 py-2.5 border-t border-slate-200 dark:border-emerald-500/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Showing {filteredPatients.length} datawarehouse records</span>
          <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
            Tip: Hover over Risk Status to view risk factors • Click Email to send automated mail • Click Snooze if unreachable
          </span>
        </div>
      </div>
    </div>
  );
}
