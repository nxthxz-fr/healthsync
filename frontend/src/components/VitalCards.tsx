import React from 'react';
import { Heart, Activity, Thermometer, Wind, AlertCircle, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Patient, SignalQuality, VitalReading } from '../types';

interface VitalCardsProps {
  patient: Patient;
  vitals?: VitalReading;
  isOnline: boolean;
  timeSinceText: string;
}

export const VitalCards: React.FC<VitalCardsProps> = ({
  patient,
  vitals,
  isOnline,
  timeSinceText,
}) => {
  const hr = vitals?.heartRate != null ? vitals.heartRate : null;
  const spo2 = vitals?.spo2 ?? 0;
  const temp = vitals?.temperature ?? 0;
  const tempF = temp ? (temp * 9) / 5 + 32 : 0;
  const quality = vitals?.signalQuality;

  const hrBaseline = {
    hrMin: patient.baseline?.hrMin ?? 60,
    hrMax: patient.baseline?.hrMax ?? 100,
    hrMean: patient.baseline?.hrMean ?? 75,
    spo2Min: patient.baseline?.spo2Min ?? 95,
    spo2Max: patient.baseline?.spo2Max ?? 100,
    spo2Mean: patient.baseline?.spo2Mean ?? 98,
    tempMin: patient.baseline?.tempMin ?? 36.5,
    tempMax: patient.baseline?.tempMax ?? 37.5,
    tempMean: patient.baseline?.tempMean ?? 36.8,
  };

  // Signal quality badge formatting
  const getQualityBadge = (q?: SignalQuality) => {
    switch (q) {
      case 'good':
        return { label: 'Good Quality', classes: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'fair':
        return { label: 'Fair Signal', classes: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'poor':
        return { label: 'Poor / Artifact', classes: 'bg-orange-50 text-orange-800 border-orange-200' };
      case 'no_signal':
        return { label: 'No Signal', classes: 'bg-rose-50 text-rose-800 border-rose-200' };
      default:
        return { label: 'Unverified', classes: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  // Trend icon helper
  const renderTrendIcon = (current: number, baselineMean: number, reverseRisk: boolean = false) => {
    const diff = current - baselineMean;
    if (Math.abs(diff) < 1.5) {
      return (
        <span className="flex items-center gap-1 text-xs font-mono text-slate-500">
          <Minus className="w-3.5 h-3.5" /> Stable
        </span>
      );
    }
    if (diff > 0) {
      const color = reverseRisk ? 'text-rose-600' : 'text-slate-700';
      return (
        <span className={`flex items-center gap-0.5 text-xs font-mono font-semibold ${color}`}>
          <ArrowUpRight className="w-3.5 h-3.5" /> +{diff.toFixed(1)} vs base
        </span>
      );
    }
    const color = reverseRisk ? 'text-emerald-700' : 'text-rose-600';
    return (
      <span className={`flex items-center gap-0.5 text-xs font-mono font-semibold ${color}`}>
        <ArrowDownRight className="w-3.5 h-3.5" /> {diff.toFixed(1)} vs base
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. HEART RATE CARD */}
      <div id="vital-card-hr" className="bg-white border border-slate-200 rounded-xl p-4 relative shadow-2xs">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <Heart className="w-4 h-4 fill-rose-600/20" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Heart Rate (PR)</h4>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  {patient.sourceMode === 'LIVE_HARDWARE' ? 'PULSE SENSOR' : 'SIMULATED BPM'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Photoplethysmography / ECG</p>
            </div>
          </div>
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
              getQualityBadge(quality?.hrQuality).classes
            }`}
          >
            {getQualityBadge(quality?.hrQuality).label}
          </span>
        </div>

        {/* Big Reading */}
        <div className="flex items-baseline gap-2 my-2">
          <span className="text-3xl font-extrabold font-mono text-slate-900">
            {isOnline && quality?.hrQuality !== 'no_signal' && hr !== null ? hr : '--'}
          </span>
          <span className="text-xs font-semibold text-slate-500 uppercase">BPM</span>
          <div className="ml-auto">
            {isOnline && quality?.hrQuality !== 'no_signal' && hr !== null && renderTrendIcon(hr, hrBaseline.hrMean, true)}
          </div>
        </div>

        {/* Detailed Reference Baselines */}
        <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Patient Baseline:</span>
            <span className="font-mono font-semibold text-slate-800">
              {hrBaseline.hrMin} - {hrBaseline.hrMax} BPM (Avg {hrBaseline.hrMean})
            </span>
          </div>
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>Normal Config Range:</span>
            <span className="font-mono">60 - 100 BPM</span>
          </div>
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>Last Update:</span>
            <span className="font-mono text-teal-700">{timeSinceText}</span>
          </div>
        </div>

        {isOnline && hr === null && (
          <div className="mt-2.5 p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>No finger detected on pulse sensor: place finger firmly on sensor.</span>
          </div>
        )}
        {quality?.hrQuality === 'poor' && hr !== null && (
          <div className="mt-2.5 p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Artifact on pulse sensor: ensure finger is seated.</span>
          </div>
        )}
      </div>

      {/* 2. SpO2 OXYGEN SATURATION CARD */}
      <div id="vital-card-spo2" className="bg-white border border-slate-200 rounded-xl p-4 relative shadow-2xs">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
              <Wind className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">SpO₂ Oxygen Saturation</h4>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  SIMULATED SpO2
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Simulated O₂ Saturation (No MAX30102 connected)
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
              getQualityBadge(quality?.spo2Quality).classes
            }`}
          >
            {getQualityBadge(quality?.spo2Quality).label}
          </span>
        </div>

        {/* Big Reading */}
        <div className="flex items-baseline gap-2 my-2">
          <span
            className={`text-3xl font-extrabold font-mono ${
              spo2 < 92 ? 'text-rose-600' : spo2 < 95 ? 'text-amber-600' : 'text-slate-900'
            }`}
          >
            {isOnline && spo2 ? spo2 : '--'}
          </span>
          <span className="text-xs font-semibold text-slate-500">%</span>
          <div className="ml-auto">
            {isOnline && quality?.spo2Quality !== 'no_signal' && renderTrendIcon(spo2, hrBaseline.spo2Mean, false)}
          </div>
        </div>

        {/* Detailed Reference Baselines */}
        <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Patient Baseline:</span>
            <span className="font-mono font-semibold text-slate-800">
              {hrBaseline.spo2Min}% - {hrBaseline.spo2Max}% (Avg {hrBaseline.spo2Mean}%)
            </span>
          </div>
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>Clinical Target:</span>
            <span className="font-mono">&gt;= 95.0%</span>
          </div>
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>Last Update:</span>
            <span className="font-mono text-teal-700">{timeSinceText}</span>
          </div>
        </div>

        {spo2 < 92 && isOnline && (
          <div className="mt-2.5 p-2 rounded bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Desaturation alert: Oxygen delivery protocol indicated.</span>
          </div>
        )}
      </div>

      {/* 3. TEMPERATURE CARD */}
      <div id="vital-card-temp" className="bg-white border border-slate-200 rounded-xl p-4 relative shadow-2xs">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center justify-center">
              <Thermometer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Body Temperature</h4>
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                  patient.sourceMode === 'LIVE_HARDWARE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {patient.sourceMode === 'LIVE_HARDWARE' ? 'DS18B20 LIVE SENSOR' : 'SIMULATED TEMPERATURE'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {patient.sourceMode === 'LIVE_HARDWARE' ? 'DS18B20 Digital Surface Probe (GPIO 4)' : 'Continuous Thermal Simulator'}
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
              getQualityBadge(quality?.tempQuality).classes
            }`}
          >
            {getQualityBadge(quality?.tempQuality).label}
          </span>
        </div>

        {/* Big Reading */}
        <div className="flex items-baseline gap-2 my-2">
          <span
            className={`text-3xl font-extrabold font-mono ${
              temp >= 38.3 ? 'text-rose-600' : temp >= 37.8 ? 'text-amber-600' : 'text-slate-900'
            }`}
          >
            {isOnline && temp > 0 ? temp.toFixed(1) : '--'}
          </span>
          <span className="text-xs font-semibold text-slate-500">°C</span>
          <span className="text-xs font-mono text-slate-400">
            ({isOnline && temp > 0 ? tempF.toFixed(1) : '--'}°F)
          </span>
          <div className="ml-auto">
            {isOnline && temp > 0 && renderTrendIcon(temp, hrBaseline.tempMean, true)}
          </div>
        </div>

        {/* Detailed Reference Baselines */}
        <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Patient Baseline:</span>
            <span className="font-mono font-semibold text-slate-800">
              {(hrBaseline.tempMin ?? 36.5).toFixed(1)} - {(hrBaseline.tempMax ?? 37.5).toFixed(1)}°C (Avg {(hrBaseline.tempMean ?? 36.8).toFixed(1)}°C)
            </span>
          </div>
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>Febrile Threshold:</span>
            <span className="font-mono">37.8°C / 100.0°F</span>
          </div>
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>Last Update:</span>
            <span className="font-mono text-teal-700">{timeSinceText}</span>
          </div>
        </div>

        {temp >= 38.3 && isOnline && (
          <div className="mt-2.5 p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Pyrexia alert: Monitor for systemic infection.</span>
          </div>
        )}
      </div>
    </div>
  );
};
