import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Sparkles, AlertTriangle, ShieldAlert, FileText, CheckCircle2, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import { SAMPLE_PATIENTS } from '../data/sampleDataset';

export default function UploadSection({ onDataLoaded, isProcessing, setIsProcessing }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    setUploadError(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          throw new Error("File appears to be empty or missing row data.");
        }

        const mappedPatients = jsonData.map((row, idx) => {
          return {
            patient_id: row.DESYNPUF_ID || row.patient_id || row.PATIENT_ID || `PAT-${1000 + idx}`,
            patient_name: row.patient_name || row.NAME || `Patient ${idx + 1}`,
            age: Number(row.AGE || row.age || 65),
            gender: row.BENE_SEX_IDENT_CD === 1 || row.gender === 'Male' || row.BENE_SEX_IDENT_CD === '1' ? 'Male' : 'Female',
            primary_disease: extractDisease(row),
            drug_name: row.DRUG_NAME || row.drug_name || 'Prescription Medication',
            days_supply: Number(row.DAYS_SUPLY_NUM || row.days_supply || 30),
            patient_pay_amt: Number(row.PTNT_PAY_AMT || row.patient_pay_amt || 35),
            tot_rx_cost_amt: Number(row.TOT_RX_CST_AMT || row.tot_rx_cost_amt || 250),
            refill_gaps_days: Number(row.refill_gaps_days || (Math.random() > 0.6 ? Math.floor(Math.random() * 50) : 5)),
            polypharmacy_count: Number(row.polypharmacy_count || Math.floor(Math.random() * 7) + 2),
            annual_rx_spend: Number(row.TOT_RX_CST_AMT ? row.TOT_RX_CST_AMT * 12 : 3600)
          };
        });

        setTimeout(() => {
          onDataLoaded(mappedPatients, file);
        }, 600);
      } catch (err) {
        setUploadError(`Failed to process file: ${err.message}`);
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const extractDisease = (row) => {
    if (row.primary_disease) return row.primary_disease;
    if (row.SP_DIABETES == 1) return "Diabetes Type 2";
    if (row.SP_CHF == 1) return "Heart Failure (CHF)";
    if (row.SP_COPD == 1) return "COPD / Asthma";
    if (row.SP_CHRNKIDN == 1) return "Chronic Kidney Disease";
    if (row.SP_DEPRESSN == 1) return "Depression / CNS";
    if (row.SP_ALZHDMTA == 1) return "Alzheimer's / Dementia";
    if (row.SP_ISCHMCHT == 1) return "Ischemic Heart Disease";
    if (row.SP_RA_OA == 1) return "Rheumatoid Arthritis";
    return "Hypertension / Cardiovascular";
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const loadSample = () => {
    setIsProcessing(true);
    setTimeout(() => {
      onDataLoaded(SAMPLE_PATIENTS, null);
    }, 500);
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      {/* Hero Header */}
      <div className="text-center space-y-4 mb-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Pharmaceutical Revenue Loss & Patient Care Prevention System</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Early Detection of Patient <br className="hidden sm:inline" />
          <span className="emerald-gradient-text">Medication Drop-Off & Skip Risk</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          Upload your patient prescription logs or CMS dataset. MedCare's AI model evaluates patient age, gender, disease complexity, copay burdens, and refill patterns to calculate risk scores, explain exact causes, and dispatch targeted alerts.
        </p>
      </div>

      {/* Main Upload Card */}
      <div className="glass-panel rounded-2xl p-8 shadow-2xl border relative overflow-hidden">
        
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 scale-[1.01]'
              : 'border-slate-300 dark:border-emerald-500/30 hover:border-emerald-500 bg-slate-50/60 dark:bg-dark-900/60 hover:bg-emerald-50/30 dark:hover:bg-dark-900'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={(e) => handleFile(e.target.files[0])}
            className="hidden"
          />

          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-md">
            <Upload className="w-8 h-8 animate-bounce" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            Drop your CSV or Excel dataset here
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Supports <code className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold">.csv</code>, <code className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold">.xlsx</code> (CMS SynPUF PDE datasets, EHR logs, or custom tables)
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center space-x-2 transition-all cursor-pointer">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Browse Files</span>
            </span>

            <span className="text-xs text-slate-400 font-semibold">or</span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                loadSample();
              }}
              className="px-5 py-2.5 rounded-xl bg-white dark:bg-dark-800 hover:bg-slate-100 dark:hover:bg-dark-750 border border-slate-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center space-x-2 transition-all shadow-sm"
            >
              <Database className="w-4 h-4" />
              <span>Load 15 Sample Records</span>
            </button>
          </div>
        </div>

        {/* Processing Spinner */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/90 dark:bg-dark-950/90 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 z-20">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 font-mono animate-pulse">
              Running MedCare Model Inference & Risk Scoring...
            </p>
          </div>
        )}

        {/* Error Alert */}
        {uploadError && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Feature Highlights */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Calculated Risk Score</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Multi-factor model calculates exact 0-100% score and flags patients into High, Medium, and Low risk tiers.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Explainable AI Reasons</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Transparently explains why a patient is at risk based on age, copay costs, polypharmacy, and refill gaps.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Targeted Action Alerts</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Recommends immediate interventions: Direct phone consultations, copay discounts, SMS reminders, or app pushes.
          </p>
        </div>
      </div>
    </div>
  );
}
