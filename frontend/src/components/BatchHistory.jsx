import { useState, useEffect } from 'react';
import {
  Archive, Users, ChevronRight, ChevronDown, Clock,
  CheckCircle2, PhoneCall, Ban, History as HistoryIcon,
} from 'lucide-react';
import { getBatches, getBatchPatients, getPatientHistory } from '../services/api';

const STATUS_META = {
  needs_contact: { label: 'Pending Contact', icon: PhoneCall, cls: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/40' },
  contacted: { label: 'Contacted', icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/40' },
  snoozed: { label: 'Snoozed', icon: Clock, cls: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-500/40' },
  case_closed: { label: 'Case Closed', icon: Ban, cls: 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.needs_contact;
  const Icon = meta.icon;
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border inline-flex items-center space-x-1 ${meta.cls}`}>
      <Icon className="w-3 h-3" />
      <span>{meta.label}</span>
    </span>
  );
}

function TierBadge({ tier }) {
  const cls = tier === 'High'
    ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/60 dark:text-red-400 dark:border-red-500/40'
    : tier === 'Medium'
      ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-500/40'
      : 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-500/40';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${cls}`}>
      {tier?.toUpperCase()} RISK
    </span>
  );
}

function PatientHistoryRow({ patient }) {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && history === null) {
      setLoading(true);
      getPatientHistory(patient.patient_id)
        .then(setHistory)
        .catch(() => setHistory([]))
        .finally(() => setLoading(false));
    }
  };

  return (
    <>
      <tr
        onClick={toggle}
        className="border-b border-slate-200 dark:border-emerald-500/10 hover:bg-slate-50 dark:hover:bg-dark-850 cursor-pointer transition-colors"
      >
        <td className="py-3 px-4 flex items-center space-x-2">
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{patient.patient_id}</span>
        </td>
        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">{patient.age}</td>
        <td className="py-3 px-4"><TierBadge tier={patient.risk_tier} /></td>
        <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900 dark:text-slate-200">
          {Math.round((patient.risk_probability || 0) * 100)}%
        </td>
        <td className="py-3 px-4"><StatusBadge status={patient.status} /></td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50 dark:bg-dark-950/60 border-b border-slate-200 dark:border-emerald-500/10">
          <td colSpan={5} className="px-4 py-3">
            {loading && <p className="text-xs text-slate-400">Loading history...</p>}
            {!loading && history?.length === 0 && (
              <p className="text-xs text-slate-400 italic">No status changes recorded yet for this patient.</p>
            )}
            {!loading && history?.length > 0 && (
              <div className="space-y-1.5">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center space-x-2 text-[11px]">
                    <span className="text-slate-400 font-mono w-36 flex-shrink-0">
                      {new Date(h.action_at).toLocaleString()}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {h.old_status ? `${STATUS_META[h.old_status]?.label || h.old_status} → ` : ''}
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {STATUS_META[h.new_status]?.label || h.new_status}
                      </span>
                    </span>
                    {h.notes && <span className="text-slate-400 italic">— {h.notes}</span>}
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function BatchHistory() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(false);

  useEffect(() => {
    getBatches()
      .then((data) => {
        setBatches(data);
        if (data.length > 0) setSelectedBatch(data[0].batch_number);
      })
      .catch(console.error)
      .finally(() => setLoadingBatches(false));
  }, []);

  useEffect(() => {
    if (selectedBatch == null) return;
    setLoadingPatients(true);
    getBatchPatients(selectedBatch)
      .then(setPatients)
      .catch(console.error)
      .finally(() => setLoadingPatients(false));
  }, [selectedBatch]);

  return (
    <div className="space-y-4 mb-12">
      <div className="glass-panel p-3.5 rounded-2xl flex items-center space-x-2">
        <Archive className="w-4 h-4 text-emerald-500" />
        <span className="text-sm font-bold text-slate-900 dark:text-white">
          Batch History — browse patients from any previously loaded batch
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Batch picker */}
        <div className="glass-panel rounded-2xl p-3 lg:w-72 flex-shrink-0">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 px-1">
            Simulated Batches
          </h3>
          {loadingBatches && <p className="text-xs text-slate-400 px-1">Loading...</p>}
          <div className="space-y-1 max-h-[520px] overflow-y-auto">
            {batches.map((b) => (
              <button
                key={b.batch_number}
                onClick={() => setSelectedBatch(b.batch_number)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                  selectedBatch === b.batch_number
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-dark-950 hover:bg-slate-100 dark:hover:bg-dark-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-emerald-500/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center space-x-1.5">
                    <Users className="w-3 h-3" />
                    <span>Batch {b.batch_number}</span>
                  </span>
                  <span className="text-[10px] font-mono opacity-75">{b.patient_count}</span>
                </div>
                <div className={`text-[10px] mt-1 font-mono ${selectedBatch === b.batch_number ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {b.pending_count} pending · {b.contacted_count} contacted · {b.closed_count} closed
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Patient list for selected batch */}
        <div className="glass-panel rounded-2xl flex-1 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-emerald-500/10 flex items-center space-x-2">
            <HistoryIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {selectedBatch == null ? 'Select a batch' : `Batch ${selectedBatch} — click a row for full timeline`}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-emerald-500/10">
                  <th className="py-2.5 px-4 font-semibold">Patient ID</th>
                  <th className="py-2.5 px-4 font-semibold">Age</th>
                  <th className="py-2.5 px-4 font-semibold">Risk Tier</th>
                  <th className="py-2.5 px-4 font-semibold">Probability</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingPatients && (
                  <tr><td colSpan={5} className="py-6 text-center text-xs text-slate-400">Loading patients...</td></tr>
                )}
                {!loadingPatients && patients.length === 0 && selectedBatch != null && (
                  <tr><td colSpan={5} className="py-6 text-center text-xs text-slate-400">No patients found in this batch.</td></tr>
                )}
                {!loadingPatients && patients.map((p) => (
                  <PatientHistoryRow key={p.patient_id} patient={p} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}