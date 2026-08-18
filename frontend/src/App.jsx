import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MetricsOverview from './components/MetricsOverview';
import Visualizations from './components/Visualizations';
import PatientTable from './components/PatientTable';
import PatientDetailModal from './components/PatientDetailModal';
import FastApiConfigModal from './components/FastApiConfigModal';
import EmailReminderModal from './components/EmailReminderModal';
import SplashScreen from './components/SplashScreen';
import {
  loadQueueData,
  processPatientData,
  fetchPatientDetail,
  checkApiHealth,
  markContacted,
  markSnoozed,
  markClosed,
} from './services/api';
import { CheckCircle2, ShieldCheck, RefreshCw, Activity } from 'lucide-react';

export default function App() {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientDetail, setPatientDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionInFlight, setActionInFlight] = useState(false);
  const [emailPatient, setEmailPatient] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('patients');
  const [apiStatus, setApiStatus] = useState({ online: false });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dataSourceInfo, setDataSourceInfo] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [themeMode, setThemeMode] = useState('dark');
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    checkApiHealth().then(setApiStatus);
    loadQueue();
  }, []);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Loads the queue as it currently stands in the database.
  // Does NOT advance the simulated batch — safe to call any time
  // (initial mount, after an action, etc).
  const loadQueue = async () => {
    setIsProcessing(true);
    try {
      const data = await loadQueueData();
      setPatients(data);
      setDataSourceInfo('Datawarehouse Synced');
    } catch (err) {
      triggerToast(`Failed to load queue: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // "New Analysis" — advances to the next simulated batch, then reloads.
  // This is the only place that should ever call the simulate endpoint.
  const handleNewAnalysis = async () => {
    setIsProcessing(true);
    try {
      const result = await processPatientData();
      setPatients(result.data);
      setDataSourceInfo('New Analysis Complete');
      triggerToast('New batch loaded — queue refreshed');
    } catch (err) {
      const msg = /no more batches/i.test(err.message)
        ? 'No more simulated batches available'
        : `New Analysis failed: ${err.message}`;
      triggerToast(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      triggerToast('Switched to Light Mode');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      triggerToast('Switched to Dark Mode');
    }
  };

  // Opens the detail drawer immediately with the row data already on hand
  // (so it doesn't feel like it's stalling), then fetches the full,
  // PII-inclusive record in the background and swaps it in.
  const handleSelectPatient = (patient) => {
    setSelectedPatientId(patient.patient_id);
    setPatientDetail(patient);
    setDetailLoading(true);
    fetchPatientDetail(patient.patient_id)
      .then(setPatientDetail)
      .catch((err) => triggerToast(`Failed to load patient detail: ${err.message}`))
      .finally(() => setDetailLoading(false));
  };

  const closeDetail = () => {
    setSelectedPatientId(null);
    setPatientDetail(null);
  };

  // Generic wrapper for the three status-changing actions. Calls the real
  // backend endpoint, then reloads the queue from the database so every
  // view (list, detail, metrics) reflects the same persisted truth.
  const runAction = async (actionFn, patientId, successMsg) => {
    setActionInFlight(true);
    try {
      await actionFn(patientId);
      triggerToast(successMsg);
      await loadQueue();
      closeDetail();
    } catch (err) {
      triggerToast(`Action failed: ${err.message}`);
    } finally {
      setActionInFlight(false);
    }
  };

  const handleMarkContacted = (patientId, notes) =>
    runAction((id) => markContacted(id, notes), patientId, 'Patient marked as contacted');

  const handleSnoozePatient = (patientId) =>
    runAction(markSnoozed, patientId, 'Reminder snoozed for this patient');

  const handleCloseCase = (patientId, reason) =>
    runAction((id) => markClosed(id, reason), patientId, 'Case closed');

  // EmailReminderModal calls this once it has actually sent the mail —
  // treat a sent reminder as a real contact event in the database too.
  const handleEmailSent = (patientId, recipientEmail) => {
    handleMarkContacted(patientId);
    triggerToast(`Automated reminder email sent to ${recipientEmail}`);
  };

  const isLight = themeMode === 'light';

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-dark-950 text-slate-100'} flex flex-col selection:bg-emerald-500 selection:text-black transition-colors duration-300`}>

      {showSplash && (
        <SplashScreen themeMode={themeMode} onFinish={() => setShowSplash(false)} />
      )}

      <Navbar
        apiStatus={apiStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewAnalysis={handleNewAnalysis}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {toastMessage && (
          <div className={`fixed top-20 right-6 z-50 p-3 rounded-xl border text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in duration-200 ${
            isLight ? 'bg-white border-emerald-500/40 text-emerald-800' : 'bg-dark-900 border-emerald-500/40 text-emerald-300'
          }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        <div className="space-y-6">

          <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border text-xs ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-dark-900/80 border-emerald-500/20'
          }`}>
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full bg-emerald-500 ${isProcessing ? 'animate-pulse' : ''}`}></span>
              <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Datawarehouse Ingestion Active</span>
              <span className={`${isLight ? 'text-slate-500' : 'text-slate-400'} font-mono`}>| {patients.length} Patient Accounts Scored</span>
            </div>

            <div className={`flex items-center space-x-1 p-1 rounded-xl border shadow-sm ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-dark-950 border-emerald-500/30'
            }`}>
              <button
                onClick={() => setActiveTab('patients')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'patients'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white hover:bg-dark-850'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Patient Risk Table ({patients.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'overview'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white hover:bg-dark-850'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Dashboard Analytics</span>
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <span className={`px-2.5 py-1 rounded-md border font-mono text-[11px] flex items-center space-x-1 ${
                isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-dark-950 border-emerald-500/20 text-emerald-400'
              }`}>
                <ShieldCheck className="w-3 h-3" />
                <span>{dataSourceInfo || 'Datawarehouse'}</span>
              </span>

              <button
                onClick={handleNewAnalysis}
                disabled={isProcessing}
                className={`text-xs transition-colors flex items-center space-x-1 font-bold disabled:opacity-50 ${
                  isLight ? 'text-emerald-700 hover:text-emerald-900' : 'text-emerald-400 hover:text-emerald-300'
                }`}
                title="Run New Analysis"
              >
                <RefreshCw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>New Analysis</span>
              </button>
            </div>
          </div>

          <MetricsOverview patients={patients} />

          {activeTab === 'patients' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-base font-bold tracking-tight flex items-center space-x-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Datawarehouse Patient Accounts • Risk & Intervention Workflow</span>
                </h3>
              </div>

              <PatientTable
                patients={patients}
                loading={isProcessing}
                onSelectPatient={handleSelectPatient}
                onOpenEmailModal={(patient) => setEmailPatient(patient)}
                onMarkContacted={handleMarkContacted}
                onSnoozePatient={handleSnoozePatient}
              />
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className={`text-base font-bold tracking-tight flex items-center space-x-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span>Predictive Visual Analytics Suite</span>
                </h3>
              </div>

              <Visualizations patients={patients} />
            </div>
          )}

        </div>

      </main>

      {selectedPatientId && (
        <PatientDetailModal
          patient={patientDetail}
          loading={detailLoading}
          actionInFlight={actionInFlight}
          onClose={closeDetail}
          onMarkContacted={handleMarkContacted}
          onSnoozePatient={handleSnoozePatient}
          onCloseCase={handleCloseCase}
        />
      )}

      {emailPatient && (
        <EmailReminderModal
          patient={emailPatient}
          themeMode={themeMode}
          onClose={() => setEmailPatient(null)}
          onEmailSent={handleEmailSent}
        />
      )}

      <FastApiConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onStatusChange={(status) => setApiStatus(status)}
      />

      <footer className={`border-t py-6 text-xs text-center ${
        isLight ? 'border-slate-200 bg-white text-slate-500' : 'border-emerald-500/10 bg-dark-950 text-slate-500'
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 MedCare Early Detection & Retention Platform. All Rights Reserved.</p>
          <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400/70">
            Datawarehouse Pipeline • Patient Risk & Retention Intelligence
          </p>
        </div>
      </footer>

    </div>
  );
}