import React, { useState } from 'react';
import {
  ArrowLeft,
  User,
  Heart,
  Activity,
  AlertTriangle,
  Phone,
  Pill,
  ShieldAlert,
  FilePlus,
  Printer,
  Sparkles,
  Wifi,
  WifiOff,
  Cpu,
  Clock,
  CheckCircle2,
  Calendar,
  Send,
  Zap,
} from 'lucide-react';
import { Patient, VitalReading } from '../types';
import { VitalCards } from './VitalCards';
import { LiveEcgMonitor } from './LiveEcgMonitor';
import { AIAnomalySection } from './AIAnomalySection';

interface PatientDetailViewProps {
  patient: Patient;
  onBack: () => void;
  telemetryHistory: VitalReading[];
  onAddNote: (patientId: string, content: string, category: 'ROUTINE' | 'EMERGENCY' | 'MEDICATION_CHANGE' | 'OBSERVATION') => Promise<void>;
  onInjectScenario: (patientId: string, scenario: string) => Promise<void>;
  onGenerateAiSummary: (patientId: string) => Promise<string>;
  onOpenReport: (patient: Patient) => void;
}

export const PatientDetailView: React.FC<PatientDetailViewProps> = ({
  patient,
  onBack,
  telemetryHistory,
  onAddNote,
  onInjectScenario,
  onGenerateAiSummary,
  onOpenReport,
}) => {
  const [activeTab, setActiveTab] = useState<'vitals' | 'history' | 'ai-engine' | 'medical-record' | 'notes'>('vitals');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<'ROUTINE' | 'EMERGENCY' | 'MEDICATION_CHANGE' | 'OBSERVATION'>('ROUTINE');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isSimulatingScenario, setIsSimulatingScenario] = useState(false);
  const [aiSummaryText, setAiSummaryText] = useState<string | undefined>(undefined);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const vitals = patient.currentVitals;
  const risk = patient.currentRisk;
  const isOnline = patient.deviceStatus === 'online';

  // Calculate elapsed time text
  const getElapsedSeconds = () => {
    if (!patient.lastReceivedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(patient.lastReceivedAt).getTime()) / 1000));
  };

  const elapsed = getElapsedSeconds();
  const timeSinceText = isOnline
    ? elapsed < 3
      ? 'Just now'
      : `${elapsed} seconds ago`
    : elapsed > 60
    ? `${Math.floor(elapsed / 60)} minutes ago`
    : `${elapsed} seconds ago`;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    setIsSubmittingNote(true);
    try {
      await onAddNote(patient.id, newNoteContent, noteCategory);
      setNewNoteContent('');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleScenarioClick = async (scenario: string) => {
    setIsSimulatingScenario(true);
    try {
      await onInjectScenario(patient.id, scenario);
    } finally {
      setIsSimulatingScenario(false);
    }
  };

  const handleRunAiSummary = async () => {
    setIsGeneratingAi(true);
    try {
      const summary = await onGenerateAiSummary(patient.id);
      setAiSummaryText(summary);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'ATTENTION':
        return 'bg-orange-50 text-orange-800 border-orange-300';
      case 'MONITOR':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'STABLE':
      default:
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div id="patient-detail-view" className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Monitoring Table</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenReport(patient)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Clinical Summary Report</span>
          </button>
        </div>
      </div>

      {/* Main Patient Identity Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {(patient.name || (patient as any).fullName || patient.id || 'P').split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{patient.name || (patient as any).fullName || patient.id}</h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {patient.id}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                  {patient.roomBed || 'Cardio Telemetry Ward'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {patient.age ?? '--'} years old • {patient.gender || 'Unknown'} • Blood Group: <strong className="text-slate-800">{patient.bloodGroup || 'O+'}</strong> • Doctor: {patient.assignedDoctor || (patient as any).doctor || 'Dr. Sarah Chen, MD'}
              </p>
            </div>
          </div>

          {/* Real-Time Device Status Pill & Risk Badge */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Device Online/Offline & Source Status */}
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
              <div className="flex items-center gap-2 mb-1">
                {isOnline ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    ONLINE
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-bold text-rose-700">
                    <WifiOff className="w-3.5 h-3.5" />
                    🔴 DEVICE OFFLINE
                  </span>
                )}
                <span className="text-slate-300">|</span>
                <span className="font-mono text-[11px] font-semibold text-slate-700">
                  {patient.deviceId}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 font-mono">
                <span>
                  Data Source:{' '}
                  <strong className={patient.sourceMode === 'LIVE_HARDWARE' ? 'text-teal-800 font-bold' : 'text-purple-800 font-bold'}>
                    {patient.sourceMode === 'LIVE_HARDWARE' ? 'LIVE HARDWARE' : 'SOURCE MODE: DEMO / SIMULATION'}
                  </strong>
                </span>
                <span>Last: {timeSinceText}</span>
              </div>
            </div>

            {/* Calculated Risk Badge */}
            <div className={`p-2.5 rounded-xl border ${getRiskColor(risk?.riskLevel)} text-right min-w-36`}>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                Current Physiological Risk
              </span>
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="text-sm font-bold tracking-wide">{risk?.riskLevel ?? 'STABLE'}</span>
                <span className="text-xl font-black font-mono leading-none">
                  {risk?.riskScore ?? 0}
                  <span className="text-[10px] font-normal text-slate-500">/100</span>
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 max-w-52">
                {risk?.riskScore === 0
                  ? 'No acute physiological anomaly detected from current valid data.'
                  : 'Score reflects current physiology, trends, signal quality and analyzed ECG features.'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Clinical Demographics Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 text-xs">
          <div className="flex items-start gap-2 text-slate-700">
            <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">Emergency Contact:</span>
              <span>
                {patient.emergencyContact?.name || (patient as any).emergencyContactName || 'Emergency Contact'}{' '}
                ({patient.emergencyContact?.relationship || 'Next of Kin'}) -{' '}
                <span className="font-mono text-slate-600">
                  {patient.emergencyContact?.phone || (patient as any).emergencyContactPhone || patient.phone || '000-000-0000'}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-slate-700">
            <Activity className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">Diagnosed Conditions:</span>
              <span>
                {Array.isArray(patient.medicalConditions) && patient.medicalConditions.length > 0
                  ? patient.medicalConditions.join(', ')
                  : 'Sinus Arrhythmia, Cardiac Telemetry Observation'}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-slate-700">
            <Heart className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">Clinical Context:</span>
              <span className="text-xs">
                {risk?.clinicalContext?.level === 'HIGH' ? 'Elevated background risk' : risk?.clinicalContext?.level === 'ELEVATED' ? 'Relevant medical history' : 'No elevated background context'}
              </span>
              {Array.isArray(patient.medicalConditions) && patient.medicalConditions.length > 0 && (
                <span className="block text-slate-500 mt-0.5">
                  {patient.medicalConditions.join(', ')}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 text-slate-700">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">Known Allergies:</span>
              <span className="text-rose-700 font-medium">
                {Array.isArray(patient.allergies) && patient.allergies.length > 0
                  ? patient.allergies.join(', ')
                  : 'Penicillin (Moderate rash)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware Testing Scenario Ticker (Enables Hackathon Demonstration) */}
      <div className="p-3 bg-white border border-teal-200/80 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Live Hardware Scenario Ingestion</h4>
            <p className="text-[11px] text-slate-500">
              Test how the AI & Risk Engine reacts to real-time incoming sensor pattern changes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleScenarioClick('NORMAL_RECOVERY')}
            disabled={isSimulatingScenario}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors"
          >
            Normal Resting
          </button>
          <button
            onClick={() => handleScenarioClick('ACUTE_HYPOXIA')}
            disabled={isSimulatingScenario}
            className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold border border-rose-200 transition-colors"
          >
            Acute Hypoxia (86% SpO₂)
          </button>
          <button
            onClick={() => handleScenarioClick('SEPTIC_SHOCK')}
            disabled={isSimulatingScenario}
            className="px-2.5 py-1 rounded bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-semibold border border-orange-200 transition-colors"
          >
            Pyrexia & Tachycardia
          </button>
          <button
            onClick={() => handleScenarioClick('LEAD_DISCONNECT')}
            disabled={isSimulatingScenario}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors"
          >
            Lead Disconnect / No Signal
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          id="tab-vitals"
          onClick={() => setActiveTab('vitals')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'vitals'
              ? 'bg-teal-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Live Vitals & ECG
        </button>
        <button
          id="tab-history"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'history'
              ? 'bg-teal-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Telemetry History & Trends ({telemetryHistory.length})
        </button>
        <button
          id="tab-ai-engine"
          onClick={() => setActiveTab('ai-engine')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'ai-engine'
              ? 'bg-teal-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          AI & Anomaly Analysis
        </button>
        <button
          id="tab-medical-record"
          onClick={() => setActiveTab('medical-record')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'medical-record'
              ? 'bg-teal-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Medical Records & Baseline
        </button>
        <button
          id="tab-notes"
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'notes'
              ? 'bg-teal-600 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Doctor Notes ({Array.isArray(patient.notes) ? patient.notes.length : 0})
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'vitals' && (
        <div className="space-y-5">
          {/* Live Vitals Numerical Display Cards */}
          <VitalCards
            patient={patient}
            vitals={vitals}
            isOnline={isOnline}
            timeSinceText={timeSinceText}
          />

          {/* Live ECG Diagnostic Strip */}
          <LiveEcgMonitor
            samples={vitals?.ecgSample || []}
            heartRate={vitals?.heartRate || patient.baseline?.hrMean || 75}
            rhythmDescription={vitals?.ecgRhythmDescription}
            signalQuality={vitals?.signalQuality.ecgQuality || 'good'}
            isOnline={isOnline}
            lastUpdatedText={timeSinceText}
            sourceMode={patient.sourceMode}
          />

          {/* Quick AI & Trend Teaser */}
          <AIAnomalySection
            patient={patient}
            currentRisk={risk}
            vitals={vitals}
            history={telemetryHistory}
            onGenerateAiSummary={handleRunAiSummary}
            isGeneratingAiSummary={isGeneratingAi}
            aiSummaryText={aiSummaryText}
          />
        </div>
      )}

      {/* TELEMETRY HISTORY & TRENDS TAB */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* 3 Metric Trend Cards with SVG Sparklines */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Heart Rate History */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Heart Rate History</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                  BPM over time
                </span>
              </div>
              <div className="h-32 flex items-end gap-1.5 pt-4 border-b border-slate-100 pb-2">
                {telemetryHistory.length > 0 ? (
                  telemetryHistory.slice(-20).map((pt, i) => {
                    const hrVal = pt.heartRate || 75;
                    const heightPercent = Math.min(100, Math.max(15, ((hrVal - 40) / 140) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t transition-all ${
                            hrVal >= 120 ? 'bg-rose-500' : hrVal >= 100 ? 'bg-amber-500' : 'bg-teal-600'
                          }`}
                        />
                        <span className="opacity-0 group-hover:opacity-100 absolute -top-7 text-[10px] font-mono font-bold bg-slate-800 text-white px-1.5 py-0.5 rounded z-20 pointer-events-none whitespace-nowrap">
                          {hrVal} BPM
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 m-auto">No telemetry points recorded yet.</p>
                )}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-2">
                <span>Baseline: {patient.baseline?.hrMean ?? 75} BPM</span>
                <span>Latest: {vitals?.heartRate ?? '--'} BPM</span>
              </div>
            </div>

            {/* SpO2 History */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">SpO₂ Oxygen History</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  SpO2 over time
                </span>
              </div>
              <div className="h-32 flex items-end gap-1.5 pt-4 border-b border-slate-100 pb-2">
                {telemetryHistory.length > 0 ? (
                  telemetryHistory.slice(-20).map((pt, i) => {
                    const o2Val = pt.spo2 || 98;
                    const heightPercent = Math.min(100, Math.max(15, ((o2Val - 80) / 20) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t transition-all ${
                            o2Val <= 90 ? 'bg-rose-500' : o2Val <= 95 ? 'bg-amber-500' : 'bg-cyan-600'
                          }`}
                        />
                        <span className="opacity-0 group-hover:opacity-100 absolute -top-7 text-[10px] font-mono font-bold bg-slate-800 text-white px-1.5 py-0.5 rounded z-20 pointer-events-none whitespace-nowrap">
                          {o2Val}%
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 m-auto">No telemetry points recorded yet.</p>
                )}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-2">
                <span>Target: &gt;= 95%</span>
                <span>Latest: {vitals?.spo2 ?? '--'}%</span>
              </div>
            </div>

            {/* Temperature History */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Temperature History</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Temp over time
                </span>
              </div>
              <div className="h-32 flex items-end gap-1.5 pt-4 border-b border-slate-100 pb-2">
                {telemetryHistory.length > 0 ? (
                  telemetryHistory.slice(-20).map((pt, i) => {
                    const tempVal = pt.temperature || 36.8;
                    const heightPercent = Math.min(100, Math.max(15, ((tempVal - 35) / 6) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t transition-all ${
                            tempVal >= 39 ? 'bg-rose-500' : tempVal >= 38 ? 'bg-amber-500' : 'bg-emerald-600'
                          }`}
                        />
                        <span className="opacity-0 group-hover:opacity-100 absolute -top-7 text-[10px] font-mono font-bold bg-slate-800 text-white px-1.5 py-0.5 rounded z-20 pointer-events-none whitespace-nowrap">
                          {tempVal}°C
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 m-auto">No telemetry points recorded yet.</p>
                )}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-2">
                <span>Norm: 36.5 - 37.2°C</span>
                <span>Latest: {vitals?.temperature ?? '--'}°C</span>
              </div>
            </div>
          </div>

          {/* SQLite Telemetry Records Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Historical Telemetry Database Records</h4>
                <p className="text-xs text-slate-500">
                  Stored persistently in SQLite (TELEMETRY table). Showing latest {telemetryHistory.length} readings.
                </p>
              </div>
              <span className="text-xs font-mono bg-white px-2.5 py-1 rounded border border-slate-200 text-slate-600">
                Patient: {patient.id}
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Heart Rate</th>
                    <th className="py-2.5 px-3">SpO₂</th>
                    <th className="py-2.5 px-3">Temperature</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Data Mode</th>
                    <th className="py-2.5 px-3">ECG Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {telemetryHistory.length > 0 ? (
                    telemetryHistory.slice(-30).reverse().map((r: any, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 text-slate-500">
                          {r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : 'Recent'}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {r.heartRate} <span className="text-[10px] text-slate-400 font-normal">BPM</span>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {r.spo2}%
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {r.temperature}°C
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'CRITICAL'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : r.status === 'ATTENTION'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {r.status || 'STABLE'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-sans font-semibold">
                            {r.dataMode || (r.source === 'LIVE_HARDWARE' ? 'HARDWARE' : 'DEMO')}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-sans font-semibold">
                            {r.ecgMode || 'SIMULATED'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                        No telemetry records found for this patient.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai-engine' && (
        <AIAnomalySection
          patient={patient}
          currentRisk={risk}
          vitals={vitals}
          history={telemetryHistory}
          onGenerateAiSummary={handleRunAiSummary}
          isGeneratingAiSummary={isGeneratingAi}
          aiSummaryText={aiSummaryText}
        />
      )}

      {activeTab === 'medical-record' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Medications Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Pill className="w-4 h-4 text-teal-700" />
              Active Medication Regimen
            </h4>
            <ul className="space-y-2 text-xs">
              {(Array.isArray(patient.currentMedications) && patient.currentMedications.length > 0
                ? patient.currentMedications
                : ['Metoprolol 25mg Daily', 'Aspirin 81mg Daily']
              ).map((med, idx) => (
                <li key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{med}</span>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Active
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Chronic Conditions & Baselines */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-700" />
              Historical Calibrated Baselines
            </h4>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">Resting Heart Rate</span>
                <p className="text-slate-600">
                  Mean: <strong className="font-mono">{patient.baseline?.hrMean ?? 75} BPM</strong> (Normal Range: {patient.baseline?.hrMin ?? 60} - {patient.baseline?.hrMax ?? 100} BPM)
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">SpO₂ Oxygen Saturation</span>
                <p className="text-slate-600">
                  Mean: <strong className="font-mono">{patient.baseline?.spo2Mean ?? 98}%</strong> (Expected Range: {patient.baseline?.spo2Min ?? 95}% - {patient.baseline?.spo2Max ?? 100}%)
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">Body Temperature</span>
                <p className="text-slate-600">
                  Mean: <strong className="font-mono">{(patient.baseline?.tempMean ?? 36.8).toFixed(1)}°C</strong> (Expected: {(patient.baseline?.tempMin ?? 36.5).toFixed(1)} - {(patient.baseline?.tempMax ?? 37.5).toFixed(1)}°C)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FilePlus className="w-4 h-4 text-teal-700" />
            Physician Clinical Notes
          </h4>

          {/* New Note Form */}
          <form onSubmit={handleAddNote} className="space-y-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Add Clinical Observation or Plan:</label>
              <select
                value={noteCategory}
                onChange={(e: any) => setNoteCategory(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                <option value="ROUTINE">Routine Observation</option>
                <option value="EMERGENCY">Emergency Response</option>
                <option value="MEDICATION_CHANGE">Medication Change</option>
                <option value="OBSERVATION">Bedside Telemetry Check</option>
              </select>
            </div>

            <textarea
              rows={3}
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Document patient telemetry review, intervention orders, or response to medication..."
              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmittingNote || !newNoteContent.trim()}
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </button>
            </div>
          </form>

          {/* List of Previous Notes */}
          <div className="space-y-3 pt-2">
            {Array.isArray(patient.notes) && patient.notes.length > 0 ? (
              patient.notes.map((note) => (
                <div key={note.id} className="p-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{note.author}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {note.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(note.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{note.content}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">No clinical notes recorded yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
