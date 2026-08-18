import React, { useState } from 'react';
import { Mail, X, Send, AlertCircle, CheckCircle2, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';

export default function EmailReminderModal({ patient, onClose, onEmailSent, themeMode }) {
  if (!patient) return null;

  const isLight = themeMode === 'light';
  
  const defaultSubject = `MedCare Prescription Adherence Reminder: ${patient.patient_name}`;
  const reasonsText = patient.reasons && patient.reasons.length > 0 
    ? patient.reasons.join('; ') 
    : 'Upcoming prescription refill gap detected.';

  const defaultBody = `Dear ${patient.patient_name},

This is an automated health & medication adherence reminder from your MedCare clinical support team regarding your prescription for ${patient.drug_name}.

Reason for Contact:
• Risk Tier: ${patient.risk_tier} Risk (${patient.risk_score}% Non-Adherence Risk)
• Primary Clinical Drivers: ${reasonsText}

Recommended Action:
${patient.alert_action || 'Please contact your local pharmacy or care provider to arrange your next refill.'}

If you need copay assistance, 90-day delivery options, or wish to speak to a clinical specialist, please reply to this email or call our toll-free support line.

Best regards,
MedCare Patient Retention & Care Coordination Team`;

  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [isSending, setIsSending] = useState(false);

  const handleSendEmail = (e) => {
    e.preventDefault();
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      if (onEmailSent) {
        onEmailSent(patient.patient_id, patient.email, subject);
      }
      onClose();
    }, 700);
  };

  const mailtoUrl = `mailto:${patient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-dark-900 border-emerald-500/30 text-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-dark-950 border-emerald-500/20'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold tracking-tight">Automated Patient Email Reminder</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                  AI Automated
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reminding <span className="font-semibold text-emerald-600 dark:text-emerald-400">{patient.patient_name}</span> & explaining reason for contact
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-dark-850 hover:bg-dark-800 text-slate-300'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSendEmail} className="p-6 space-y-4 flex-1 overflow-y-auto">
          
          {/* Reason for Contact Banner */}
          <div className={`p-3.5 rounded-xl border text-xs flex items-start space-x-3 ${
            isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
          }`}>
            <AlertCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Reason Patient is Contacted:</span>
              <p className="opacity-90 leading-relaxed font-medium">
                {reasonsText}
              </p>
            </div>
          </div>

          {/* Recipient Field */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                Recipient Email
              </label>
              <input
                type="email"
                readOnly
                value={patient.email || `${patient.patient_name.toLowerCase().replace(/\s+/g, '.')}@patient-care.org`}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-medium ${
                  isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-dark-950 border-emerald-500/20 text-emerald-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                readOnly
                value={patient.contact_number || '+1 (555) 234-5678'}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-medium ${
                  isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-dark-950 border-emerald-500/20 text-slate-300'
                }`}
              />
            </div>
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
              Email Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:border-emerald-500 ${
                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-dark-950 border-emerald-500/30 text-white'
              }`}
            />
          </div>

          {/* Message Body Field */}
          <div>
            <label className="block text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 mb-1">
              Automated Message Content & Reason Details
            </label>
            <textarea
              rows={7}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={`w-full p-3.5 rounded-xl border text-xs font-mono leading-relaxed focus:outline-none focus:border-emerald-500 ${
                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-dark-950 border-emerald-500/30 text-slate-200'
              }`}
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <a
              href={mailtoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs font-semibold flex items-center space-x-1.5 hover:underline ${
                isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Desktop Email App</span>
            </a>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-dark-850 hover:bg-dark-800 border-emerald-500/20 text-slate-300'
                }`}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSending}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all"
              >
                {isSending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Dispatching Mail...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Automated Email</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
