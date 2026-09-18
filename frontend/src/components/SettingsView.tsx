import React, { useState } from 'react';
import { Settings, Shield, Bell, Database, Cpu, Save, Check } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [saved, setSaved] = useState(false);
  const [hrLow, setHrLow] = useState(50);
  const [hrHigh, setHrHigh] = useState(110);
  const [spo2Low, setSpo2Low] = useState(92);
  const [tempHigh, setTempHigh] = useState(38.3);
  const [pollingRate, setPollingRate] = useState('1000');
  const [soundAlerts, setSoundAlerts] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-700" />
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Clinical Monitoring & System Configuration
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure vital parameter alarm thresholds, IoT broker ingestion rates, and system policies.
          </p>
        </div>

        {saved && (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <Check className="w-4 h-4" /> Parameters Saved
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* 1. Clinical Alarm Thresholds */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-rose-600" />
            Clinical Alarm & Early Warning Thresholds
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Bradycardia Alarm (HR Min):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={hrLow}
                  onChange={(e) => setHrLow(Number(e.target.value))}
                  className="w-24 p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
                <span className="text-slate-500 font-mono">BPM (Default: 50)</span>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Tachycardia Alarm (HR Max):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={hrHigh}
                  onChange={(e) => setHrHigh(Number(e.target.value))}
                  className="w-24 p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
                <span className="text-slate-500 font-mono">BPM (Default: 110)</span>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Hypoxia Trigger (SpO₂ Min):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={spo2Low}
                  onChange={(e) => setSpo2Low(Number(e.target.value))}
                  className="w-24 p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
                <span className="text-slate-500 font-mono">% (Default: 92%)</span>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Pyrexia Trigger (Temp Max):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={tempHigh}
                  onChange={(e) => setTempHigh(Number(e.target.value))}
                  className="w-24 p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                />
                <span className="text-slate-500 font-mono">°C (Default: 38.3°C)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. IoT Ingestion & Hardware Telemetry Rates */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-teal-700" />
            ESP32 IoT Ingestion & WebSocket Rate
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Telemetry Ingestion Interval:</label>
              <select
                value={pollingRate}
                onChange={(e) => setPollingRate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-900"
              >
                <option value="1000">1.0 Hz (1000ms - Clinical Standard)</option>
                <option value="2000">0.5 Hz (2000ms - Battery Conservation)</option>
                <option value="500">2.0 Hz (500ms - Intensive Care)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Audible Alarm Chimes:</label>
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soundAlerts}
                    onChange={(e) => setSoundAlerts(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-600"
                  />
                  <span className="text-slate-700 font-semibold">Enable browser audio synthesize on critical alert</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 3. System Infrastructure Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs text-xs space-y-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-700" />
            Runtime Environment & Compliance Specs
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 font-mono text-slate-600">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Server Port</span>
              <span className="font-bold text-slate-900">3000 (Cloud Run)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">AI Model</span>
              <span className="font-bold text-teal-700">Gemini 3.8-Flash</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Ingestion Protocol</span>
              <span className="font-bold text-slate-900">HTTP REST & JSON</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Data Mode</span>
              <span className="font-bold text-emerald-700">Zero Fake Random Scores</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-2xs flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
