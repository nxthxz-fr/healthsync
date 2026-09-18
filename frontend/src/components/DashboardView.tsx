import React, { useState } from 'react';
import {
  Users,
  Radio,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Cpu,
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  Activity,
  WifiOff,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Patient, RiskLevel } from '../types';

interface DashboardViewProps {
  patients: Patient[];
  kpis: {
    totalPatients: number;
    patientsCurrentlyMonitoring: number;
    stable: number;
    attentionRequired: number;
    critical: number;
    devicesOnline: number;
  };
  onSelectPatient: (patient: Patient) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectQuickEcg: (patient: Patient) => void;
  onOpenDevices: () => void;
  onOpenAiInsights: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  patients,
  kpis,
  onSelectPatient,
  searchQuery,
  onSearchChange,
  onSelectQuickEcg,
  onOpenDevices,
  onOpenAiInsights,
}) => {
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'risk' | 'name' | 'time'>('risk');

  // Filter patients
  const filteredPatients = patients.filter((p) => {
    // Search query matches name, ID, or deviceId
    const query = searchQuery.toLowerCase().trim();
    if (
      query &&
      !p.name.toLowerCase().includes(query) &&
      !p.id.toLowerCase().includes(query) &&
      !p.deviceId.toLowerCase().includes(query)
    ) {
      return false;
    }

    // Risk Filter
    if (riskFilter !== 'ALL') {
      if (p.currentRisk?.riskLevel !== riskFilter) return false;
    }

    // Device Status Filter
    if (statusFilter !== 'ALL') {
      if (p.deviceStatus !== statusFilter) return false;
    }

    // Source Filter
    if (sourceFilter !== 'ALL') {
      if (sourceFilter === 'SIMULATION' || sourceFilter === 'DEMO' || sourceFilter === 'WOKWI_SIMULATION') {
        if (p.sourceMode === 'LIVE_HARDWARE') return false;
      } else if (p.sourceMode !== sourceFilter) {
        return false;
      }
    }

    return true;
  });

  // Sort
  const sortedPatients = [...filteredPatients].sort((a, b) => {
    if (sortBy === 'risk') {
      return (b.currentRisk?.riskScore ?? 0) - (a.currentRisk?.riskScore ?? 0);
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'time') {
      return new Date(b.lastReceivedAt).getTime() - new Date(a.lastReceivedAt).getTime();
    }
    return 0;
  });

  const getRiskBadge = (level?: RiskLevel) => {
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

  const formatElapsed = (lastReceivedAt: string, isOnline: boolean) => {
    if (!lastReceivedAt) return 'Never';
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(lastReceivedAt).getTime()) / 1000));
    if (isOnline) {
      return elapsed < 4 ? 'Just now' : `${elapsed}s ago`;
    }
    return elapsed > 60 ? `${Math.floor(elapsed / 60)}m ago` : `${elapsed}s ago`;
  };

  return (
    <div id="main-dashboard" className="space-y-6">
      {/* 1. WELCOME HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Good Morning, Doctor</h2>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Real-time overview of monitored patients and system activity.
          </p>
        </div>

        {/* Real Data Flow Architecture Ribbon */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono shadow-2xs">
          <span className="font-semibold text-slate-700">Pipeline:</span>
          <span className="text-teal-700 font-bold">Sensors</span>
          <span className="text-slate-400">→</span>
          <span className="text-teal-700 font-bold">ESP32</span>
          <span className="text-slate-400">→</span>
          <span className="text-teal-700 font-bold">Wi-Fi</span>
          <span className="text-slate-400">→</span>
          <span className="text-teal-700 font-bold">Backend</span>
          <span className="text-slate-400">→</span>
          <span className="text-teal-700 font-bold">Analytics/AI</span>
          <span className="text-slate-400">→</span>
          <span className="text-teal-700 font-bold">Dashboard</span>
          <span className="text-slate-400">→</span>
          <span className="text-rose-600 font-bold">Emergency Alert</span>
        </div>
      </div>

      {/* 2. KPI METRIC CARDS (Direct from Backend Database) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Patients */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-600">Total Patients</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900">{kpis.totalPatients}</div>
          <span className="text-[10px] text-slate-400 font-medium">Registered records</span>
        </div>

        {/* Patients Currently Monitoring */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-600">Monitoring</span>
            <Radio className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-teal-700">
            {kpis.patientsCurrentlyMonitoring}
          </div>
          <span className="text-[10px] text-teal-700 font-medium">Active streaming telemetry</span>
        </div>

        {/* Stable */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold text-emerald-800">Stable</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-700">{kpis.stable}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Within personal baseline</span>
        </div>

        {/* Attention Required */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold text-amber-800">Attention Required</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-600">{kpis.attentionRequired}</div>
          <span className="text-[10px] text-amber-600 font-medium">Trend / threshold alert</span>
        </div>

        {/* Critical */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold text-rose-800">Critical</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-rose-600">{kpis.critical}</div>
          <span className="text-[10px] text-rose-600 font-medium">Immediate intervention</span>
        </div>

        {/* Devices Online */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-600">Devices Online</span>
            <Cpu className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900">{kpis.devicesOnline}</div>
          <span className="text-[10px] text-slate-400 font-medium">ESP32 telemetry nodes</span>
        </div>
      </div>

      {/* 3. LIVE PATIENT MONITORING TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {/* Table Controls & Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/40">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Radio className="w-4 h-4 text-teal-700" />
              Live Patient Telemetry & Risk Table
            </h3>
            <p className="text-xs text-slate-500">
              Deterministic calculations based on actual incoming hardware telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Risk Filter */}
            <select
              id="filter-risk"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="ATTENTION">Attention</option>
              <option value="MONITOR">Monitor</option>
              <option value="STABLE">Stable Only</option>
            </select>

            {/* Device Status Filter */}
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="ALL">All Device States</option>
              <option value="online">Online Devices</option>
              <option value="offline">Offline Devices</option>
            </select>

            {/* Source Mode Filter */}
            <select
              id="filter-source"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="ALL">All Data Sources</option>
              <option value="LIVE_HARDWARE">LIVE HARDWARE</option>
              <option value="SIMULATION">DEMO / SIMULATION</option>
            </select>

            {/* Sort Filter */}
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="risk">Sort by Risk Score</option>
              <option value="name">Sort by Name</option>
              <option value="time">Sort by Last Update</option>
            </select>
          </div>
        </div>

        {/* The Responsive Clinical Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Patient ID / Name</th>
                <th className="py-3 px-3">Age</th>
                <th className="py-3 px-3">Heart Rate</th>
                <th className="py-3 px-3">SpO₂</th>
                <th className="py-3 px-3">Temp</th>
                <th className="py-3 px-3">ECG Rhythm</th>
                <th className="py-3 px-3">Risk Level</th>
                <th className="py-3 px-3">Score</th>
                <th className="py-3 px-3">Device / Source</th>
                <th className="py-3 px-3">Last Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
              {sortedPatients.length > 0 ? (
                sortedPatients.map((patient) => {
                  const vitals = patient.currentVitals;
                  const isOnline = patient.deviceStatus === 'online';
                  const risk = patient.currentRisk;
                  const badge = getRiskBadge(risk?.riskLevel);
                  const isCritical = risk?.riskLevel === 'CRITICAL';

                  return (
                    <tr
                      key={patient.id}
                      className={`hover:bg-teal-50/40 transition-colors ${
                        isCritical ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Patient ID & Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 hover:text-teal-700 cursor-pointer" onClick={() => onSelectPatient(patient)}>
                          {patient.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                          <span>{patient.id}</span>
                          <span>•</span>
                          <span className="text-slate-600">{patient.roomBed}</span>
                        </div>
                      </td>

                      {/* Age & Gender */}
                      <td className="py-3 px-3 font-mono">
                        {patient.age}y <span className="text-slate-400">({patient.gender[0]})</span>
                      </td>

                      {/* Heart Rate */}
                      <td className="py-3 px-3">
                        {isOnline && vitals ? (
                          <div className="flex items-baseline gap-1">
                            <span
                              className={`text-sm font-extrabold font-mono ${
                                vitals.heartRate > 110 || vitals.heartRate < 50
                                  ? 'text-rose-600'
                                  : 'text-slate-900'
                              }`}
                            >
                              {vitals.heartRate}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">BPM</span>
                          </div>
                        ) : (
                          <span className="font-mono text-slate-400">--</span>
                        )}
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Base: {patient.baseline.hrMean}
                        </span>
                      </td>

                      {/* SpO2 */}
                      <td className="py-3 px-3">
                        {isOnline && vitals ? (
                          <div className="flex items-baseline gap-1">
                            <span
                              className={`text-sm font-extrabold font-mono ${
                                vitals.spo2 < 92
                                  ? 'text-rose-600'
                                  : vitals.spo2 < 95
                                  ? 'text-amber-600'
                                  : 'text-slate-900'
                              }`}
                            >
                              {vitals.spo2}%
                            </span>
                          </div>
                        ) : (
                          <span className="font-mono text-slate-400">--</span>
                        )}
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Base: {patient.baseline.spo2Mean}%
                        </span>
                      </td>

                      {/* Temperature */}
                      <td className="py-3 px-3">
                        {isOnline && vitals ? (
                          <span
                            className={`font-mono font-bold ${
                              vitals.temperature >= 38.3 ? 'text-rose-600' : 'text-slate-900'
                            }`}
                          >
                            {vitals.temperature.toFixed(1)}°C
                          </span>
                        ) : (
                          <span className="font-mono text-slate-400">--</span>
                        )}
                      </td>

                      {/* ECG Rhythm */}
                      <td className="py-3 px-3">
                        {isOnline && vitals ? (
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              vitals.ecgRhythmDescription?.includes('Sinus Rhythm')
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {vitals.signalQuality.ecgQuality === 'no_signal'
                              ? 'Not Analyzed'
                              : vitals.ecgRhythmDescription || 'Sinus Rhythm'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-400">Offline</span>
                        )}
                      </td>

                      {/* Risk Level */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                          {badge.label}
                        </span>
                      </td>

                      {/* Risk Score */}
                      <td className="py-3 px-3 font-mono font-extrabold text-sm text-slate-900">
                        {risk?.riskScore ?? 0}
                        <span className="text-[10px] font-normal text-slate-400">/100</span>
                      </td>

                      {/* Device Status & Source */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {isOnline ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          )}
                          <span className="font-mono text-[11px] font-semibold text-slate-800">
                            {patient.deviceId}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border block w-fit mt-0.5 ${
                            patient.sourceMode === 'LIVE_HARDWARE'
                              ? 'bg-teal-50 text-teal-800 border-teal-200'
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}
                        >
                          {patient.sourceMode === 'LIVE_HARDWARE' ? 'LIVE HARDWARE' : 'SOURCE MODE: DEMO / SIMULATION'}
                        </span>
                      </td>

                      {/* Last Updated */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                        {isOnline ? (
                          formatElapsed(patient.lastReceivedAt, isOnline)
                        ) : (
                          <span className="text-rose-700 font-bold">
                            🔴 OFFLINE ({formatElapsed(patient.lastReceivedAt, isOnline)})
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectQuickEcg(patient)}
                            title="Quick Lead II ECG Oscilloscope"
                            className="p-1.5 rounded-md hover:bg-slate-100 text-teal-700 border border-slate-200"
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onSelectPatient(patient)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    No patients match your search or filter parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
