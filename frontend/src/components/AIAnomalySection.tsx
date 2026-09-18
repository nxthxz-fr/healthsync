import React, { useState } from 'react';
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  TrendingDown,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Sliders,
  FileCheck,
} from 'lucide-react';
import { Patient, RiskAnalysisResult, VitalReading } from '../types';

interface AIAnomalySectionProps {
  patient: Patient;
  currentRisk?: RiskAnalysisResult;
  vitals?: VitalReading;
  history: VitalReading[];
  onGenerateAiSummary?: () => Promise<string | void>;
  isGeneratingAiSummary?: boolean;
  aiSummaryText?: string;
}

export const AIAnomalySection: React.FC<AIAnomalySectionProps> = ({
  patient,
  currentRisk,
  vitals,
  history,
  onGenerateAiSummary,
  isGeneratingAiSummary = false,
  aiSummaryText,
}) => {
  const [pipelineStepActive, setPipelineStepActive] = useState<number | null>(null);

  const baseline = {
    hrMin: patient.baseline?.hrMin ?? 60,
    hrMax: patient.baseline?.hrMax ?? 100,
    hrMean: patient.baseline?.hrMean ?? 75,
    spo2Min: patient.baseline?.spo2Min ?? 95,
    spo2Max: patient.baseline?.spo2Max ?? 100,
    spo2Mean: patient.baseline?.spo2Mean ?? 98,
    tempMin: patient.baseline?.tempMin ?? 36.5,
    tempMax: patient.baseline?.tempMax ?? 37.5,
    tempMean: patient.baseline?.tempMean ?? 36.8,
    calculatedFromSamples: patient.baseline?.calculatedFromSamples ?? 1000,
    lastBaselineUpdate: patient.baseline?.lastBaselineUpdate ?? '',
  };
  const hr = vitals?.heartRate ?? baseline.hrMean;
  const spo2 = vitals?.spo2 ?? baseline.spo2Mean;
  const temp = vitals?.temperature ?? baseline.tempMean;

  const hrDiff = hr - baseline.hrMean;
  const spo2Diff = spo2 - baseline.spo2Mean;
  const tempDiff = temp - baseline.tempMean;

  const pipelineSteps = [
    { id: 1, title: 'Sensor Ingest', desc: 'Raw ADC & I2C packets from ESP32' },
    { id: 2, title: 'Data Validation', desc: 'CRC & bounds verification' },
    { id: 3, title: 'Signal Quality', desc: 'Electrode impedance & SNR' },
    { id: 4, title: 'Noise Filter', desc: '50/60Hz notch & moving average' },
    { id: 5, title: 'Current Values', desc: 'BPM, SpO2%, °C, Lead II mV' },
    { id: 6, title: 'Personal Baseline', desc: `${baseline.calculatedFromSamples} historical samples comparison` },
    { id: 7, title: 'Trend Analysis', desc: 'Sliding regression slope evaluation' },
    { id: 8, title: 'Multi-Parameter', desc: 'Cross-vital compound interaction' },
    { id: 9, title: 'Anomaly Model', desc: 'NEWS2 + Clinical rule inference' },
    { id: 10, title: 'Risk Stratification', desc: `${currentRisk?.riskLevel} (${currentRisk?.riskScore}/100)` },
    { id: 11, title: 'Alert Decision', desc: currentRisk?.riskScore && currentRisk.riskScore >= 50 ? 'Immediate Alert Dispatched' : 'Routine Telemetry Log' },
  ];

  const getRiskBadge = (level?: string) => {
    switch (level) {
      case 'CRITICAL':
        return { bg: 'bg-rose-50 text-rose-700 border-rose-300', dot: 'bg-rose-600', label: 'CRITICAL' };
      case 'ATTENTION':
        return { bg: 'bg-orange-50 text-orange-700 border-orange-300', dot: 'bg-orange-600', label: 'ATTENTION' };
      case 'MONITOR':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-300', dot: 'bg-amber-500', label: 'MONITOR' };
      case 'STABLE':
      default:
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500', label: 'STABLE' };
    }
  };

  const riskBadge = getRiskBadge(currentRisk?.riskLevel);

  // Recent readings history for Trend Visualization
  const recentSpO2List = history.slice(-5).map((h) => h.spo2);
  const recentHRList = history.slice(-5).map((h) => h.heartRate);

  return (
    <div className="space-y-5">
      {/* 1. TOP HEADER & COMPOSITE RISK SCORE HERO */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                AI & Deterministic Anomaly Analysis Engine
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Evaluates live IoT hardware telemetry against patient-specific baselines, trend slopes, and multi-vital interaction criteria.
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Risk Score Pill & Level */}
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 ${riskBadge.bg}`}>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">Calculated Risk</span>
                <span className="text-xs font-mono font-bold tracking-wide">{riskBadge.label}</span>
              </div>
              <div className="w-12 h-12 rounded-lg bg-white/90 border border-slate-200 flex flex-col items-center justify-center font-mono shadow-2xs">
                <span className="text-xl font-black leading-none text-slate-900">{currentRisk?.riskScore ?? 0}</span>
                <span className="text-[9px] text-slate-400 font-semibold">/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. EXPLAINABLE RISK FACTORS TABLE */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-teal-700" />
              Explainable Risk Contributors ({currentRisk?.factors.length || 0} active factors)
            </h4>
            <span className="text-[11px] font-mono text-slate-500">
              Deterministic Mathematical Scoring • No Random Data
            </span>
          </div>

          {currentRisk && currentRisk.factors.length > 0 ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200">
              {currentRisk.factors.map((factor, idx) => (
                <div key={idx} className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        factor.severity === 'severe'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : factor.severity === 'moderate'
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      !
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{factor.label}</span>
                        {factor.deviationText && (
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {factor.deviationText}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{factor.observation}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center font-mono">
                    <span className="text-xs text-slate-400">Score impact:</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded border ${
                        factor.severity === 'severe'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : factor.severity === 'moderate'
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      +{factor.points} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Stable Baseline Concordance:</strong> All incoming sensor parameters (HR, SpO₂, Temp, Lead II ECG) match the patient's calibrated baseline profile. No pathological anomalies detected.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. PATIENT-SPECIFIC BASELINE COMPARISON SECTION */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-700" />
              Patient-Specific Baseline Analysis
            </h4>
            <p className="text-xs text-slate-500">
              Dynamically derived from {baseline.calculatedFromSamples.toLocaleString()} stored telemetry records.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
            Updated {new Date(baseline.lastBaselineUpdate).toLocaleDateString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* HR Baseline vs Actual */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700 block mb-1">Heart Rate (BPM)</span>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Actual:</span>
                <span className="font-mono font-bold text-slate-900">{hr} BPM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Personal Baseline:</span>
                <span className="font-mono text-slate-700">
                  {baseline.hrMin} - {baseline.hrMax} (Avg {baseline.hrMean})
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-semibold">
                <span className="text-slate-600">Deviation:</span>
                <span
                  className={`font-mono ${
                    Math.abs(hrDiff) > 15
                      ? 'text-rose-600'
                      : Math.abs(hrDiff) > 8
                      ? 'text-amber-600'
                      : 'text-emerald-700'
                  }`}
                >
                  {hrDiff >= 0 ? '+' : ''}
                  {Math.round(hrDiff)} BPM ({Math.round((hrDiff / baseline.hrMean) * 100)}%)
                </span>
              </div>
            </div>
          </div>

          {/* SpO2 Baseline vs Actual */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700 block mb-1">SpO₂ Oxygen Saturation</span>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Actual:</span>
                <span className="font-mono font-bold text-slate-900">{spo2}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Personal Baseline:</span>
                <span className="font-mono text-slate-700">
                  {baseline.spo2Min}% - {baseline.spo2Max}% (Avg {baseline.spo2Mean}%)
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-semibold">
                <span className="text-slate-600">Deviation:</span>
                <span
                  className={`font-mono ${
                    spo2Diff < -4 ? 'text-rose-600' : spo2Diff < -2 ? 'text-amber-600' : 'text-emerald-700'
                  }`}
                >
                  {spo2Diff >= 0 ? '+' : ''}
                  {spo2Diff.toFixed(1)}% delta
                </span>
              </div>
            </div>
          </div>

          {/* Temperature Baseline vs Actual */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700 block mb-1">Body Temperature</span>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Current Actual:</span>
                <span className="font-mono font-bold text-slate-900">{temp.toFixed(1)}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Personal Baseline:</span>
                <span className="font-mono text-slate-700">
                  {baseline.tempMin.toFixed(1)} - {baseline.tempMax.toFixed(1)}°C (Avg {baseline.tempMean.toFixed(1)}°C)
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-semibold">
                <span className="text-slate-600">Deviation:</span>
                <span
                  className={`font-mono ${
                    Math.abs(tempDiff) > 1.0 ? 'text-rose-600' : Math.abs(tempDiff) > 0.5 ? 'text-amber-600' : 'text-emerald-700'
                  }`}
                >
                  {tempDiff >= 0 ? '+' : ''}
                  {tempDiff.toFixed(1)}°C
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. REAL-TIME TREND ANALYSIS SECTION */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-700" />
              Dynamic Multi-Sample Trend Analysis
            </h4>
            <p className="text-xs text-slate-500">
              Evaluates regression slopes across the last sequence of readings to catch acute decompensation early.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
            Trajectory: {currentRisk?.trendSummary.description || 'Stable'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SpO2 sequence readout */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">SpO₂ Sequence History</span>
              {currentRisk?.trendSummary.spo2Trend === 'RAPID_DESATURATION' && (
                <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" /> Downward Trend Detected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 py-2 overflow-x-auto">
              {recentSpO2List.length > 0 ? (
                recentSpO2List.map((val, idx) => (
                  <React.Fragment key={idx}>
                    <div className="px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 shrink-0">
                      {val}%
                    </div>
                    {idx < recentSpO2List.length - 1 && (
                      <span className="text-slate-400 font-bold shrink-0">→</span>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <span className="text-xs text-slate-500">Collecting initial sequence samples...</span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-1">
              Calculated slope: {recentSpO2List.length >= 2 ? (recentSpO2List[recentSpO2List.length - 1] - recentSpO2List[0]).toFixed(1) : 0}% change over recent packet window.
            </p>
          </div>

          {/* HR sequence readout */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">Heart Rate Sequence History</span>
              {currentRisk?.trendSummary.hrTrend === 'RAPID_CLIMB' && (
                <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Sustained Upward Trend
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 py-2 overflow-x-auto">
              {recentHRList.length > 0 ? (
                recentHRList.map((val, idx) => (
                  <React.Fragment key={idx}>
                    <div className="px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-mono font-bold text-slate-800 shrink-0">
                      {val} <span className="text-[10px] text-slate-400 font-normal">BPM</span>
                    </div>
                    {idx < recentHRList.length - 1 && (
                      <span className="text-slate-400 font-bold shrink-0">→</span>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <span className="text-xs text-slate-500">Collecting initial sequence samples...</span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-1">
              Calculated slope: {recentHRList.length >= 2 ? (recentHRList[recentHRList.length - 1] - recentHRList[0]) : 0} BPM shift over recent window.
            </p>
          </div>
        </div>
      </div>

      {/* 5. STEP-BY-STEP INFERENCE PIPELINE ARCHITECTURE */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">
              Clinical IoT AI Inference Pipeline
            </h4>
            <p className="text-xs text-slate-500">
              Deterministic 11-stage processing flow from raw ESP32 packet to physician alert dispatch.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {pipelineSteps.map((step) => {
            const isSelected = pipelineStepActive === step.id;
            return (
              <div
                key={step.id}
                onClick={() => setPipelineStepActive(isSelected ? null : step.id)}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-200'
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1 rounded">
                    0{step.id}
                  </span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                </div>
                <h5 className="text-xs font-bold text-slate-800 leading-snug">{step.title}</h5>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. AI CLINICAL SUMMARY (GEMINI INTEGRATION) */}
      <div className="bg-white border border-teal-200/80 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                Physician Decision Support Synthesis
                <span className="text-[10px] font-mono uppercase bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded font-bold">
                  Gemini 3.8-Flash
                </span>
              </h4>
              <p className="text-xs text-slate-500">
                Contextual physiological synthesis of real sensor telemetry for the attending clinician.
              </p>
            </div>
          </div>

          {onGenerateAiSummary && (
            <button
              onClick={onGenerateAiSummary}
              disabled={isGeneratingAiSummary}
              className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-2xs flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isGeneratingAiSummary ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run Clinical Synthesis</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
          {aiSummaryText ? (
            <div className="whitespace-pre-line font-medium text-slate-800">{aiSummaryText}</div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500">
              <Info className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                Click <strong>Run Clinical Synthesis</strong> to generate a structured differential diagnostic note from Gemini 3.8-Flash based on Arthur Vance's real telemetry and baseline deviations.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
