import React from 'react';
import { Radio, Heart, Activity, Wind, Thermometer, WifiOff, AlertTriangle, ArrowRight } from 'lucide-react';
import { Patient, RiskLevel } from '../types';

interface LiveMonitoringViewProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({
  patients,
  onSelectPatient,
}) => {
  const getRiskBorder = (level?: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'border-rose-400 bg-rose-50/20';
      case 'ATTENTION':
        return 'border-orange-300 bg-orange-50/20';
      case 'MONITOR':
        return 'border-amber-300 bg-amber-50/20';
      case 'STABLE':
      default:
        return 'border-slate-200 bg-white';
    }
  };

  const getRiskBadge = (level?: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return { bg: 'bg-rose-600 text-white', label: 'CRITICAL' };
      case 'ATTENTION':
        return { bg: 'bg-orange-600 text-white', label: 'ATTENTION' };
      case 'MONITOR':
        return { bg: 'bg-amber-500 text-white', label: 'MONITOR' };
      case 'STABLE':
      default:
        return { bg: 'bg-emerald-600 text-white', label: 'STABLE' };
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Intensive Telemetry Monitoring Station
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronous multi-bed patient monitor grid streaming live ESP32 biomedical sensors.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
          <Radio className="w-3.5 h-3.5 text-teal-600" />
          <span>Active Streams: {patients.filter((p) => p.deviceStatus === 'online').length} / {patients.length}</span>
        </div>
      </div>

      {/* Bedside Monitors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {patients.map((patient) => {
          const vitals = patient.currentVitals;
          const isOnline = patient.deviceStatus === 'online';
          const risk = patient.currentRisk;
          const badge = getRiskBadge(risk?.riskLevel);
          const isCritical = risk?.riskLevel === 'CRITICAL';

          return (
            <div
              key={patient.id}
              className={`border rounded-xl p-4 shadow-2xs transition-all relative ${getRiskBorder(
                risk?.riskLevel
              )} hover:shadow-sm`}
            >
              {/* Header: Room, Name, ID, Risk Score */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                      {patient.roomBed}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{patient.id}</span>
                  </div>
                  <h3
                    onClick={() => onSelectPatient(patient)}
                    className="font-bold text-slate-900 text-sm hover:text-teal-700 cursor-pointer mt-0.5"
                  >
                    {patient.name}
                  </h3>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${badge.bg}`}>
                    {badge.label}
                  </span>
                  <div className="font-mono text-xs font-bold text-slate-800 mt-1">
                    Score: {risk?.riskScore ?? 0}/100
                  </div>
                </div>
              </div>

              {/* Real-Time Vital Display Grid */}
              <div className="grid grid-cols-3 gap-2 my-3">
                {/* Heart Rate */}
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-bold">
                    <Heart className="w-3 h-3 text-rose-500" />
                    <span>HR</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span
                      className={`text-xl font-extrabold font-mono ${
                        vitals && (vitals.heartRate > 110 || vitals.heartRate < 50)
                          ? 'text-rose-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {isOnline && vitals ? vitals.heartRate : '--'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">BPM</span>
                  </div>
                </div>

                {/* SpO2 */}
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-bold">
                    <Wind className="w-3 h-3 text-teal-600" />
                    <span>SpO₂</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span
                      className={`text-xl font-extrabold font-mono ${
                        vitals && vitals.spo2 < 92
                          ? 'text-rose-600'
                          : vitals && vitals.spo2 < 95
                          ? 'text-amber-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {isOnline && vitals ? vitals.spo2 : '--'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">%</span>
                  </div>
                </div>

                {/* Temp */}
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-bold">
                    <Thermometer className="w-3 h-3 text-cyan-600" />
                    <span>Temp</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span
                      className={`text-xl font-extrabold font-mono ${
                        vitals && vitals.temperature >= 38.3 ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {isOnline && vitals ? vitals.temperature.toFixed(1) : '--'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">°C</span>
                  </div>
                </div>
              </div>

              {/* Rhythm & Waveform Status */}
              <div className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-[11px] mb-3">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Activity className="w-3.5 h-3.5 text-teal-700" />
                  <span className="font-mono font-medium truncate max-w-44">
                    {isOnline && vitals
                      ? vitals.signalQuality.ecgQuality === 'no_signal'
                        ? 'Not Analyzed'
                        : vitals.ecgRhythmDescription || 'Sinus Rhythm'
                      : 'Telemetry Suspended'}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                    patient.sourceMode === 'LIVE_HARDWARE'
                      ? 'bg-teal-50 text-teal-800 border-teal-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {patient.sourceMode === 'LIVE_HARDWARE' ? 'LIVE' : 'SIM'}
                </span>
              </div>

              {/* Bottom Card Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                  {isOnline ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{patient.deviceId}</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-rose-500" />
                      <span className="text-rose-600 font-semibold">Offline</span>
                    </>
                  )}
                </div>

                <button
                  onClick={() => onSelectPatient(patient)}
                  className="flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900"
                >
                  <span>Open Monitor</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
