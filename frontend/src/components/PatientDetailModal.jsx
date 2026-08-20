import React, { useState } from 'react';
import { X, ShieldAlert, Send, CheckCircle2, Activity, Clock, XCircle, Loader2, RotateCcw, Phone, Mail } from 'lucide-react';
import { getRiskTierMeta, getReasons, getConditionTags } from '../utils/clinicalLabels';

import { updatePatientPii } from '../services/api';

export default function PatientDetailModal({
  currentUser,
  patient,
  loading,
  actionInFlight,
  onClose,
  onPatientUpdated,
  onMarkContacted,
  onSnoozePatient,
  onCloseCase,
  onReactivate,
}) {
  const [reason, setReason] = useState('');
  const [armedAction, setArmedAction] = useState(null);

  if (!patient) return null;

  const tier = getRiskTierMeta(patient.risk_tier);
  const reasons = getReasons(patient);
  const conditions = getConditionTags(patient);
  const name = patient.patient_name || 'Unknown Patient';
  const phone = patient.contact_number || '';
  const email = patient.email || '';
  const preferred_contact = patient.preferred_contact || 'phone';

  const [isEditingPii, setIsEditingPii] = useState(false);
  const [piiForm, setPiiForm] = useState({ full_name: name, phone_number: phone, email: email, preferred_contact: preferred_contact });
  const [isSavingPii, setIsSavingPii] = useState(false);

  const handleSavePii = async () => {
    try {
      setIsSavingPii(true);
      await updatePatientPii(patient.patient_id, piiForm);
      patient.patient_name = piiForm.full_name;
      patient.contact_number = piiForm.phone_number;
      patient.email = piiForm.email;
      patient.preferred_contact = piiForm.preferred_contact;
      setIsEditingPii(false);
      if (onPatientUpdated) onPatientUpdated();
    } catch (e) {
      alert("Failed to save: " + e.message);
    } finally {
      setIsSavingPii(false);
    }
  };
  const isContacted = patient.contact_status === 'Contacted';
  const isSnoozed = patient.contact_status === 'Snoozed';
  const isClosed = patient.contact_status === 'Closed';
  const isActionable = !isContacted && !isClosed && !isSnoozed && !actionInFlight;
  const canReactivate = (isContacted || isSnoozed || isClosed) && !actionInFlight;

  const arm = (key) => {
    setArmedAction(key);
    setTimeout(() => setArmedAction((cur) => (cur === key ? null : cur)), 3000);
  };

  const ActionButton = ({ actionKey, onCommit, className, icon, label, title }) => {
    const isArmed = armedAction === actionKey;
    return (
      <button
        onClick={() => (isArmed ? (setArmedAction(null), onCommit()) : arm(actionKey))}
        disabled={actionInFlight}
        title={isArmed ? 'Click again to confirm' : title}
        className={isArmed
          ? 'px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:opacity-50'
          : className}
      >
        {isArmed ? <span>Confirm?</span> : <>{icon}<span>{label}</span></>}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex justify-end transition-opacity duration-300">

      <div
        className="w-full max-w-xl bg-white dark:bg-dark-900 border-l border-slate-200 dark:border-emerald-500/30 h-full flex flex-col justify-between shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-emerald-500/20 bg-slate-50 dark:bg-dark-950 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-base ${
              tier.isHigh ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40' :
              tier.isMed ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40' :
              tier.isLow ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40' :
              'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/30'
            }`}>
              {name.charAt(0)}
            </div>
            <div>
              {isEditingPii ? (
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    value={piiForm.full_name}
                    onChange={e => setPiiForm({...piiForm, full_name: e.target.value})}
                    className="w-full text-sm p-1.5 rounded bg-slate-100 dark:bg-dark-900 border border-slate-300 dark:border-emerald-500/30 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    placeholder="Full Name"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={piiForm.phone_number}
                      onChange={e => setPiiForm({...piiForm, phone_number: e.target.value})}
                      className="w-full text-sm p-1.5 rounded bg-slate-100 dark:bg-dark-900 border border-slate-300 dark:border-emerald-500/30 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                      placeholder="Phone"
                    />
                    <input
                      type="email"
                      value={piiForm.email}
                      onChange={e => setPiiForm({...piiForm, email: e.target.value})}
                      className="w-full text-sm p-1.5 rounded bg-slate-100 dark:bg-dark-900 border border-slate-300 dark:border-emerald-500/30 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                      placeholder="Email"
                    />
                  </div>
                  <select
                    value={piiForm.preferred_contact}
                    onChange={e => setPiiForm({...piiForm, preferred_contact: e.target.value})}
                    className="w-full text-sm p-1.5 rounded bg-slate-100 dark:bg-dark-900 border border-slate-300 dark:border-emerald-500/30 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                  >
                    <option value="phone">Preferred: Phone</option>
                    <option value="email">Preferred: Email</option>
                  </select>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSavePii} disabled={isSavingPii} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold disabled:opacity-50">
                      {isSavingPii ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setIsEditingPii(false)} className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-dark-800 dark:hover:bg-dark-700 text-slate-700 dark:text-slate-300 rounded text-xs font-bold">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
                    <span>{name}</span>
                    {currentUser?.role === 'admin' && (
                      <button onClick={() => setIsEditingPii(true)} className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 transition-colors">Edit</button>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center flex-wrap gap-x-2 mt-1">
                    <span>ID: {patient.patient_id}</span>
                    <span>• {patient.age ?? 'N/A'} yrs</span>
                    <span className="flex items-center space-x-1"><Phone className="w-3 h-3" /><span>{phone}</span></span>
                    <span className="flex items-center space-x-1"><Mail className="w-3 h-3" /><span>{email}</span></span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-dark-800 text-[10px]">Prefers: {preferred_contact}</span>
                  </p>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-200 dark:bg-dark-850 hover:bg-slate-300 dark:hover:bg-dark-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="px-6 pt-4">
            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading full patient record...</span>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">

          {/* 1. Risk Tier Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            tier.isHigh ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:border-red-500/40 dark:text-red-300' :
            tier.isMed ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:border-amber-500/40 dark:text-amber-300' :
            tier.isLow ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-500/40 dark:text-emerald-300' :
            'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:border-slate-500/30 dark:text-slate-300'
          }`}>
            <div>
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider opacity-90">
                Calculated Non-Adherence Risk
              </span>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <h3 className="text-2xl font-extrabold">{tier.key} Risk Tier</h3>
                <span className="text-sm font-mono font-bold">({patient.risk_score}%)</span>
              </div>
            </div>

            <div className="w-12 h-12 rounded-xl bg-white/60 dark:bg-black/40 flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-7 h-7" />
            </div>
          </div>

          {/* 2. Flagged Conditions */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Flagged Chronic Conditions</span>
            </h4>
            {conditions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {conditions.map((c, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-dark-950 border border-slate-200 dark:border-emerald-500/20 text-slate-700 dark:text-slate-200"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">No chronic conditions flagged on record.</p>
            )}
          </div>

          {/* 3. AI Explainability Reasons */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Model Risk Factors (Why Flagged)</span>
            </h4>

            <div className="space-y-2">
              {reasons.length > 0 ? (
                reasons.map((reason_, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-dark-950 border border-slate-200 dark:border-emerald-500/20 flex items-start space-x-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-mono text-[10px] font-bold mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {reason_}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">No model factors returned for this patient.</p>
              )}
            </div>
          </div>

          {/* 4. Notes */}
          {isActionable && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-emerald-500/10">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold">
                Notes (optional)
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Add a note for this contact or closure..."
                className="w-full rounded-xl p-3 text-xs border outline-none transition-colors bg-slate-50 dark:bg-dark-950 border-slate-300 dark:border-emerald-500/30 text-slate-800 dark:text-white focus:border-emerald-500"
              />
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-emerald-500/20 bg-slate-50 dark:bg-dark-950 sticky bottom-0">
          {isActionable ? (
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton
                actionKey="snooze"
                onCommit={() => onSnoozePatient(patient.patient_id)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center space-x-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300 dark:bg-dark-850 dark:hover:bg-dark-800 dark:text-purple-300 dark:border-purple-500/30 disabled:opacity-50"
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Snooze"
                title="Patient unreachable? Snooze this reminder"
              />

              <ActionButton
                actionKey="close"
                onCommit={() => onCloseCase(patient.patient_id, reason || undefined)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 dark:bg-dark-850 dark:hover:bg-dark-800 dark:text-slate-300 dark:border-slate-700 disabled:opacity-50"
                icon={<XCircle className="w-3.5 h-3.5" />}
                label="Close Case"
                title="Close this case"
              />

              <div className="ml-auto">
                <ActionButton
                  actionKey="contact"
                  onCommit={() => onMarkContacted(patient.patient_id, reason || undefined)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center space-x-1.5 disabled:opacity-50"
                  icon={actionInFlight ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  label="Mark as Contacted"
                  title="Mark as contacted"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
              <span className="flex items-center space-x-1.5 font-semibold text-slate-600 dark:text-slate-300">
                {isContacted && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {isClosed && <XCircle className="w-4 h-4 text-slate-400" />}
                {isSnoozed && <Clock className="w-4 h-4 text-purple-500" />}
                <span>This case is marked "{patient.contact_status}"</span>
              </span>
              <div className="flex items-center space-x-2">
                {canReactivate && (
                  <ActionButton
                    actionKey="reactivate"
                    onCommit={() => onReactivate(patient.patient_id)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300 dark:bg-dark-850 dark:hover:bg-blue-950/60 dark:text-blue-300 dark:border-blue-500/30"
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                    label="Reactivate"
                    title="Undo — move back to Pending Contact"
                  />
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-dark-850 hover:bg-slate-300 dark:hover:bg-dark-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}