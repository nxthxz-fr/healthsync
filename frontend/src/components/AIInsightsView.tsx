import React, { useState } from 'react';
import { Brain, Layers, Activity, Sliders, CheckCircle2, AlertTriangle, ShieldCheck, Zap, Info } from 'lucide-react';
import { Patient } from '../types';

interface AIInsightsViewProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
}

export const AIInsightsView: React.FC<AIInsightsViewProps> = ({
  patients,
  onSelectPatient,
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || 'P-101');
  const patient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  const risk = patient?.currentRisk;
  const vitals = patient?.currentVitals;
  const baseline = patient?.baseline;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-teal-700" />
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              AI & Physiological Anomaly Detection Engine
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic multi-parameter risk classification engine using real incoming hardware telemetry.
          </p>
        </div>

        {/* Patient selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-700">Analyze Patient:</label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600 shadow-2xs"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.id}) - Risk: {p.currentRisk?.riskLevel} ({p.currentRisk?.riskScore}/100)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Multi-Parameter Equation Architecture Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-2">
          Multi-Parameter Clinical Scoring Formula
        </h3>
        <p className="text-xs text-slate-600 mb-4">
          Risk level is strictly calculated from the interaction of all 6 clinical vectors without arbitrary random scores:
        </p>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 space-y-2">
          <div className="font-bold text-teal-800 text-sm">
            Total Risk Score (0-100) = Clamp₁₀₀ [ Σ (Deviation_Score) + Trend_Penalty + MultiParam_Synergy + Signal_Penalty ]
          </div>
          <div className="text-[11px] text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
            <div>• <strong>HR Deviation:</strong> |HR_actual - HR_baseline_mean| / σ_HR</div>
            <div>• <strong>SpO₂ Desaturation:</strong> max(0, SpO2_baseline_mean - SpO2_actual) × ClinicalWeight</div>
            <div>• <strong>Temp Anomaly:</strong> Hyperpyrexia (&gt;38.3°C) or Hypothermia (&lt;35.5°C)</div>
            <div>• <strong>Trend Progression:</strong> Slope(t₋₄...t₀) for acute rapid decompensation</div>
            <div>• <strong>Compound Synergy:</strong> Hypoxia + Tachycardia cross-correlation penalty (+16 pts)</div>
            <div>• <strong>Signal Quality:</strong> SNR check (penalizes uncertain leads, flags reliability warning)</div>
          </div>
        </div>
      </div>

      {/* Current Active Contributing Factors for Selected Patient */}
      {patient && risk && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Active Assessment Breakdown: {patient.name} ({patient.id})
            </h3>
            <span
              className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                risk.riskLevel === 'CRITICAL'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : risk.riskLevel === 'ATTENTION'
                  ? 'bg-orange-50 text-orange-800 border-orange-200'
                  : risk.riskLevel === 'MONITOR'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              Score: {risk.riskScore}/100 • {risk.riskLevel}
            </span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200 text-xs">
            {risk.factors.length > 0 ? (
              risk.factors.map((f, i) => (
                <div key={i} className="p-3 bg-white flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900 block">{f.label}</span>
                    <span className="text-slate-600">{f.observation}</span>
                  </div>
                  <span className="font-mono font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded shrink-0">
                    +{f.points} pts
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-emerald-800 bg-emerald-50/50">
                All parameters conform strictly to calibrated baseline norms. Score is 0.
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <strong>Clinical Protocol Directive:</strong> {risk.recommendation}
          </div>
        </div>
      )}
    </div>
  );
};
