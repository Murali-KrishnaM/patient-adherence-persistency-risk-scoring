import React from 'react';
import { Pill, Settings, RefreshCw, Zap, Sun, Moon } from 'lucide-react';

export default function Navbar({
  apiStatus,
  onOpenSettings,
  onNewAnalysis,
  themeMode,
  onToggleTheme,
  batchStatus,
}) {
  const isLight = themeMode === 'light';
  const hasMore = batchStatus ? batchStatus.has_more : true;

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-300 ${
      isLight
        ? 'bg-white/90 border-emerald-500/20 shadow-md shadow-slate-200/50'
        : 'bg-dark-900/90 border-emerald-500/20 shadow-lg shadow-black/40'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className={`w-full h-full rounded-[10px] flex items-center justify-center ${isLight ? 'bg-emerald-950' : 'bg-dark-950'}`}>
              <Pill className="w-5 h-5 text-emerald-400 animate-pulse-glow" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Med<span className="emerald-gradient-text">Care</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-full">
                v2.4 AI
              </span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'} hidden sm:block`}>
              Medication Adherence Risk & Retention Intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">

          <button
            onClick={onToggleTheme}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-sm ${
              isLight
                ? 'bg-emerald-50 text-emerald-800 border-emerald-400/50 hover:bg-emerald-100'
                : 'bg-dark-850 hover:bg-dark-800 text-slate-200 border-emerald-500/30'
            }`}
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {isLight ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className={`flex items-center space-x-2 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              isLight
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:border-emerald-500'
                : 'bg-dark-950 border-emerald-500/30 text-slate-300 hover:border-emerald-400'
            }`}
            title="Configure Flask Backend Server"
          >
            {apiStatus.online ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">Flask Ready</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px]">Flask Offline</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className={`p-2 rounded-lg border transition-colors ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                : 'bg-dark-850 hover:bg-dark-800 border-emerald-500/20 text-slate-300 hover:text-emerald-400'
            }`}
            title="Flask Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onNewAnalysis}
            disabled={!hasMore}
            className={`px-3.5 py-2 rounded-xl border transition-all flex items-center space-x-1.5 text-xs font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              isLight
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500/40 shadow-emerald-600/20'
            }`}
            title={hasMore ? 'Run New Analysis (simulates next data batch)' : 'All simulated batches loaded'}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{hasMore ? 'Stimulate Next Day' : 'All Batches Loaded'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}