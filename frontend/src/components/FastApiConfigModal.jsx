import React, { useState, useEffect } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, Code, Copy, Check } from 'lucide-react';
import { getFastApiUrl, setFastApiUrl, checkFastApiHealth } from '../services/api';

export default function FastApiConfigModal({ isOpen, onClose, onStatusChange }) {
  const [url, setUrlInput] = useState(getFastApiUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      handleTestConnection();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setFastApiUrl(url);
    handleTestConnection();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await checkFastApiHealth();
    setTesting(false);
    setTestResult(res);
    if (onStatusChange) onStatusChange(res);
  };

  const flaskPythonSnippet = `# MedCare Flask Backend Service (app.py)
# Run locally: flask --app app run --debug --port 5000

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173"]}})

@app.route("/api/stats")
def stats():
    return jsonify({"status": "healthy"})

@app.route("/api/queue")
def queue():
    # Returns the active risk-scored patient queue
    return jsonify([])

if __name__ == "__main__":
    app.run(debug=True, port=5000)
`;

  const copySnippet = () => {
    navigator.clipboard.writeText(flaskPythonSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="w-full max-w-xl bg-dark-900 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Flask Backend Server Settings</h3>
              <p className="text-xs text-slate-400">Configure connection to the MedCare Flask + PostgreSQL API</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Server URL Input */}
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-slate-300">Flask Host URL</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="http://localhost:5000"
              className="flex-1 bg-dark-950 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
            />
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-dark-950 text-xs font-bold hover:bg-emerald-400 transition-colors"
            >
              Save & Test
            </button>
          </div>
        </div>

        {/* Connection Status Box */}
        <div className="p-3 rounded-xl bg-dark-950 border border-emerald-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            {testing ? (
              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
            ) : testResult?.online ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}

            <div>
              <span className="font-semibold text-white">
                {testing ? 'Testing connection...' : testResult?.online ? 'Flask Server Online' : 'Server Offline'}
              </span>
              <p className="text-[11px] text-slate-400">
                {testResult?.online
                  ? 'Connected to the Flask API and PostgreSQL datawarehouse.'
                  : (testResult?.error || 'Could not reach the Flask backend at this URL.')}
              </p>
            </div>
          </div>

          <button
            onClick={handleTestConnection}
            className="px-2.5 py-1 rounded-lg bg-dark-850 hover:bg-dark-800 text-slate-300 text-[11px] border border-emerald-500/20"
          >
            Test Now
          </button>
        </div>

        {/* Flask Python Snippet Reference */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center space-x-1">
              <Code className="w-3.5 h-3.5 text-emerald-400" />
              <span>Flask Reference Implementation</span>
            </span>
            <button
              onClick={copySnippet}
              className="text-[11px] text-emerald-400 hover:underline flex items-center space-x-1"
            >
              {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCode ? 'Copied Code' : 'Copy Python Code'}</span>
            </button>
          </div>

          <pre className="p-3 rounded-xl bg-dark-950 border border-emerald-500/20 text-[10px] font-mono text-emerald-300/90 overflow-x-auto max-h-36">
            {flaskPythonSnippet}
          </pre>
        </div>

        <div className="border-t border-emerald-500/20 pb-1 pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-dark-850 hover:bg-dark-800 text-slate-300 text-xs font-semibold"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
}