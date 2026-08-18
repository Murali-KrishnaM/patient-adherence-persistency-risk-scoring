import React, { useEffect, useState } from 'react';
import { Pill, Activity, ShieldCheck } from 'lucide-react';

export default function SplashScreen({ onFinish, themeMode }) {
  const [phase, setPhase] = useState('enter'); // 'enter' -> 'sliding' -> 'done'
  const isLight = themeMode === 'light';

  useEffect(() => {
    // Phase 1: Hold centered splash briefly (600ms)
    const holdTimer = setTimeout(() => {
      setPhase('sliding');
    }, 650);

    // Phase 2: Complete slide-back animation into Navbar (total 1050ms)
    const finishTimer = setTimeout(() => {
      setPhase('done');
      if (onFinish) onFinish();
    }, 1050);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  if (phase === 'done') return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
      isLight ? 'bg-slate-900/95 text-white' : 'bg-dark-950 text-slate-100'
    } backdrop-blur-xl pointer-events-none`}>
      
      {/* Background Subtle Gradient Orbs */}
      <div className="absolute w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute w-64 h-64 bg-teal-500/10 rounded-full blur-2xl top-1/4 right-1/4"></div>

      {/* Main Logo Box Container that slides into Navbar position */}
      <div className={`flex flex-col items-center justify-center space-y-4 transition-all duration-500 ease-in-out ${
        phase === 'sliding' 
          ? 'scale-50 -translate-y-48 sm:-translate-y-64 opacity-0 transition-transform duration-400' 
          : 'scale-100 opacity-100 animate-splash-hold'
      }`}>
        
        {/* Animated Pill Logo Icon */}
        <div className="relative group">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-700 p-1 shadow-2xl shadow-emerald-500/40 animate-pulse-glow flex items-center justify-center">
            <div className="w-full h-full rounded-[22px] bg-dark-950 flex items-center justify-center">
              <Pill className="w-10 h-10 text-emerald-400 animate-bounce" />
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-dark-950 flex items-center justify-center text-dark-950 shadow-md">
            <Activity className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Brand Name & Tagline */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center space-x-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Med<span className="text-emerald-400">Care</span>
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full">
              v2.4 AI
            </span>
          </div>
          <p className="text-xs text-emerald-300/80 font-mono tracking-wide">
            Datawarehouse Intelligence & Early Risk Prevention
          </p>
        </div>

        {/* Snappy WhatsApp-style loading progress bar */}
        <div className="w-48 h-1 bg-dark-800 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-emerald-400 rounded-full animate-pulse transition-all duration-500 w-full"></div>
        </div>

        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono pt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Synchronizing Datawarehouse Records...</span>
        </div>
      </div>
    </div>
  );
}
