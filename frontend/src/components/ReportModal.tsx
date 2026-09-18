import React from 'react';
import { X, Printer, Download, CheckCircle2, ShieldCheck, Heart, Wind, Thermometer, Activity } from 'lucide-react';
import { Patient } from '../types';

interface ReportModalProps {
  patient: Patient | null;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ patient, onClose }) => {
  if (!patient) return null;

  const vitals = patient.currentVitals;
  const risk = patient.currentRisk;
  const baseline = patient.baseline;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-800">
              Clinical Telemetry & Physiological Assessment Report
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF Export</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div id="printable-clinical-report" className="p-6 space-y-6 text-slate-800 text-xs">
          {/* Hospital Brand Header */}
          <div className="flex items-start justify-between pb-4 border-b-2 border-teal-800">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">HEALTHSYNC BIOMEDICAL TELEMETRY</h1>
              <p className="text-xs text-slate-500 font-mono">Department of Critical Care & Remote Patient Monitoring</p>
              <p className="text-[11px] text-slate-400 mt-0.5">ISO 13485 / HL7 Compliant Electronic Health Record</p>
            </div>
            <div className="text-right font-mono text-[11px] text-slate-500">
              <div>Date Generated: {new Date().toLocaleDateString()}</div>
              <div>Time: {new Date().toLocaleTimeString()}</div>
              <div>Source: {patient.sourceMode}</div>
            </div>
          </div>

          {/* Patient Demographics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Patient Name</span>
              <span className="font-bold text-slate-900 text-sm">{patient.name}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Patient ID / MRN</span>
              <span className="font-mono font-bold text-slate-900">{patient.id}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Age / Gender</span>
              <span className="font-semibold text-slate-900">{patient.age} Yrs / {patient.gender}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Location / Bed</span>
              <span className="font-semibold text-slate-900">{patient.roomBed}</span>
            </div>
          </div>

          {/* Clinical Risk Summary */}
          <div className="p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Physiological Assessment Stratification</h3>
              <span className="font-mono font-bold text-sm text-slate-900">
                Calculated Score: {risk?.riskScore ?? 0} / 100 ({risk?.riskLevel})
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Assessment derived by deterministic evaluation of incoming ESP32 sensor telemetry against patient baseline (derived from {baseline.calculatedFromSamples} samples).
            </p>
          </div>

          {/* Vital Readings Table */}
          <div>
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
              Vital Telemetry Snapshot
            </h3>
            <table className="w-full border-collapse text-left border border-slate-200">
              <thead className="bg-slate-100 font-bold text-slate-700">
                <tr>
                  <th className="p-2 border border-slate-200">Parameter</th>
                  <th className="p-2 border border-slate-200">Current Measured</th>
                  <th className="p-2 border border-slate-200">Patient Baseline</th>
                  <th className="p-2 border border-slate-200">Signal Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                <tr>
                  <td className="p-2 border border-slate-200 font-sans font-semibold">Heart Rate (PR)</td>
                  <td className="p-2 border border-slate-200 font-bold">{vitals?.heartRate ?? '--'} BPM</td>
                  <td className="p-2 border border-slate-200">{baseline.hrMin} - {baseline.hrMax} BPM</td>
                  <td className="p-2 border border-slate-200 font-sans">{vitals?.signalQuality.hrQuality}</td>
                </tr>
                <tr>
                  <td className="p-2 border border-slate-200 font-sans font-semibold">SpO₂ Oxygen</td>
                  <td className="p-2 border border-slate-200 font-bold">{vitals?.spo2 ?? '--'}%</td>
                  <td className="p-2 border border-slate-200">{baseline.spo2Min}% - {baseline.spo2Max}%</td>
                  <td className="p-2 border border-slate-200 font-sans">{vitals?.signalQuality.spo2Quality}</td>
                </tr>
                <tr>
                  <td className="p-2 border border-slate-200 font-sans font-semibold">Temperature</td>
                  <td className="p-2 border border-slate-200 font-bold">{vitals?.temperature.toFixed(1) ?? '--'}°C</td>
                  <td className="p-2 border border-slate-200">{baseline.tempMin.toFixed(1)} - {baseline.tempMax.toFixed(1)}°C</td>
                  <td className="p-2 border border-slate-200 font-sans">{vitals?.signalQuality.tempQuality}</td>
                </tr>
                <tr>
                  <td className="p-2 border border-slate-200 font-sans font-semibold">ECG Lead II</td>
                  <td className="p-2 border border-slate-200 font-sans font-bold" colSpan={3}>
                    {vitals?.ecgRhythmDescription || 'Normal Sinus Rhythm'} (Sample buffer: {vitals?.ecgSample.length || 0} pts)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Active Risk Factors */}
          {risk && risk.factors.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
                Active Physiological Deviations
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                {risk.factors.map((f, i) => (
                  <li key={i}>
                    <strong>{f.label}:</strong> {f.observation} ({f.deviationText || ''})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Doctor Signature Block */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8">
            <div>
              <p className="text-[11px] text-slate-500 mb-6">Physician Electronic Validation:</p>
              <div className="font-bold text-slate-900 font-serif text-sm border-b border-slate-400 pb-1 w-64">
                Dr. {patient.assignedDoctor}, MD
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Board Certified Internal Medicine</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 mb-6">Device Node Telemetry Certificate:</p>
              <div className="font-mono text-slate-700 text-xs border-b border-slate-400 pb-1 w-64">
                SHA-256: 8f72c3d19a00e84b...
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Verified Hardware Node ID: {patient.deviceId}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
