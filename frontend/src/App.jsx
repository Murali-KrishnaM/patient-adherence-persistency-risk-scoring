import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MetricsOverview from './components/MetricsOverview';
import Visualizations from './components/Visualizations';
import PatientTable from './components/PatientTable';
import PatientDetailModal from './components/PatientDetailModal';
import FastApiConfigModal from './components/FastApiConfigModal';
import EmailReminderModal from './components/EmailReminderModal';
import SplashScreen from './components/SplashScreen';
import { processPatientData, checkFastApiHealth } from './services/api';
import { SAMPLE_PATIENTS } from './data/sampleDataset';
import { CheckCircle2, ShieldCheck, RefreshCw, Activity } from 'lucide-react';

export default function App() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [emailPatient, setEmailPatient] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('patients'); // Default: 'patients' (Patient Risk Table)
  const [apiStatus, setApiStatus] = useState({ online: false });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dataSourceInfo, setDataSourceInfo] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [themeMode, setThemeMode] = useState('dark'); // Default: 'dark' | 'light'
  const [showSplash, setShowSplash] = useState(true);

  // Initial Health Check & Automatic Datawarehouse Load on Mount
  useEffect(() => {
    checkFastApiHealth().then(res => setApiStatus(res));
    loadDatawarehouseData();
  }, []);

  const loadDatawarehouseData = async () => {
    setIsProcessing(true);
    const result = await processPatientData(SAMPLE_PATIENTS, null);
    setPatients(result.data);
    setDataSourceInfo('Datawarehouse Ingested');
    setIsProcessing(false);
  };

  // New Analysis Handler - Keeps dashboard visible without turning back to input box
  const handleNewAnalysis = async () => {
    setIsProcessing(true);
    const result = await processPatientData(SAMPLE_PATIENTS, null);
    setPatients(result.data);
    setDataSourceInfo('New Analysis Complete');
    setIsProcessing(false);
    triggerToast('New Analysis executed • Datawarehouse records updated');
  };

  // Theme Mode Switcher Handler
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

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Toggle patient contact status: Pending -> Contacted -> Pending
  const handleToggleContactStatus = (patientId) => {
    setPatients(prev => prev.map(p => {
      if (p.patient_id === patientId) {
        const nextStatus = p.contact_status === 'Contacted' ? 'Pending Contact' : 'Contacted';
        triggerToast(`Updated ${p.patient_name} status to '${nextStatus}'`);
        return { ...p, contact_status: nextStatus, snoozed_until: null };
      }
      return p;
    }));
  };

  // Snooze patient for 24h if unreachable at the moment
  const handleSnoozePatient = (patientId) => {
    setPatients(prev => prev.map(p => {
      if (p.patient_id === patientId) {
        const isCurrentlySnoozed = p.contact_status === 'Snoozed';
        const nextStatus = isCurrentlySnoozed ? 'Pending Contact' : 'Snoozed';
        const snoozeTime = isCurrentlySnoozed ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        triggerToast(
          isCurrentlySnoozed 
            ? `Cleared snooze for ${p.patient_name}` 
            : `Snoozed reminder alerts for ${p.patient_name} (24 Hours)`
        );
        
        return { 
          ...p, 
          contact_status: nextStatus, 
          snoozed_until: snoozeTime 
        };
      }
      return p;
    }));
  };

  // Handle email sent trigger
  const handleEmailSent = (patientId, recipientEmail, subject) => {
    setPatients(prev => prev.map(p => {
      if (p.patient_id === patientId) {
        return { ...p, contact_status: 'Contacted' };
      }
      return p;
    }));
    triggerToast(`Automated reminder email sent to ${recipientEmail}`);
  };

  const isLight = themeMode === 'light';

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-dark-950 text-slate-100'} flex flex-col selection:bg-emerald-500 selection:text-black transition-colors duration-300`}>
      
      {/* 0. WhatsApp-Style Animated Splash Screen on Load */}
      {showSplash && (
        <SplashScreen
          themeMode={themeMode}
          onFinish={() => setShowSplash(false)}
        />
      )}

      {/* Top Navbar Header */}
      <Navbar
        apiStatus={apiStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewAnalysis={handleNewAnalysis}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Container - Dashboard view is always rendered directly */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Toast Alert Notification */}
        {toastMessage && (
          <div className={`fixed top-20 right-6 z-50 p-3 rounded-xl border text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in duration-200 ${
            isLight ? 'bg-white border-emerald-500/40 text-emerald-800' : 'bg-dark-900 border-emerald-500/40 text-emerald-300'
          }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        <div className="space-y-6">
          
          {/* Sub-Bar: Model Status on Left & Tab Navigation Pills Centered Above Table & New Analysis Button on Right */}
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border text-xs ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-dark-900/80 border-emerald-500/20'
          }`}>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Datawarehouse Ingestion Active</span>
              <span className={`${isLight ? 'text-slate-500' : 'text-slate-400'} font-mono`}>| {patients.length} Patient Accounts Scored</span>
            </div>

            {/* View Switcher Pills placed directly above table */}
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
                className={`text-xs transition-colors flex items-center space-x-1 font-bold ${
                  isLight ? 'text-emerald-700 hover:text-emerald-900' : 'text-emerald-400 hover:text-emerald-300'
                }`}
                title="Run New Analysis"
              >
                <RefreshCw className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>New Analysis</span>
              </button>
            </div>
          </div>

          {/* Executive Financial & Risk KPI Overview Cards */}
          <MetricsOverview patients={patients} />

          {/* View 1: Patient Risk Table View */}
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
                onSelectPatient={(patient) => setSelectedPatient(patient)}
                onOpenEmailModal={(patient) => setEmailPatient(patient)}
                onToggleContactStatus={handleToggleContactStatus}
                onSnoozePatient={handleSnoozePatient}
              />
            </div>
          )}

          {/* View 2: Dashboard Analytics View */}
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

      {/* Patient Detailed Risk Drawer Modal */}
      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}

      {/* Automated Email Reminder Modal */}
      {emailPatient && (
        <EmailReminderModal
          patient={emailPatient}
          themeMode={themeMode}
          onClose={() => setEmailPatient(null)}
          onEmailSent={handleEmailSent}
        />
      )}

      {/* FastAPI Server Config Modal */}
      <FastApiConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onStatusChange={(status) => setApiStatus(status)}
      />

      {/* Footer */}
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
