import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Loader2 } from 'lucide-react';
import { login } from '../services/api';

export default function Login({ onLoginSuccess, themeMode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await login(username, password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Failed to login. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const isLight = themeMode === 'light';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${isLight ? 'bg-slate-50' : 'bg-dark-950'}`}>
      <div className={`w-full max-w-md p-8 rounded-2xl shadow-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-dark-900 border-emerald-500/20'}`}>
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-emerald-500/10 rounded-xl mb-4">
            <ShieldCheck className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>MedCare Platform</h2>
          <p className={`text-sm mt-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Sign in to access patient intelligence</p>
        </div>

        {error && (
          <div className={`mb-6 p-3 rounded-lg text-sm flex items-center ${isLight ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm outline-none transition-all ${
                  isLight 
                    ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500' 
                    : 'bg-dark-950 border-emerald-500/30 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
                }`}
                placeholder="admin or rep"
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm outline-none transition-all ${
                  isLight 
                    ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500' 
                    : 'bg-dark-950 border-emerald-500/30 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50'
                }`}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70 transition-colors"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>
        
        <div className={`mt-6 pt-6 border-t text-center text-xs ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'}`}>
          Demo Accounts:<br/>
          <span className="font-mono">admin / password</span> (Simulate batches)<br/>
          <span className="font-mono">rep / password</span> (View & contact only)
        </div>
      </div>
    </div>
  );
}
