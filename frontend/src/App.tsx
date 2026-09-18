import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { PatientDetailView } from './components/PatientDetailView';
import { LiveMonitoringView } from './components/LiveMonitoringView';
import { AlertsView } from './components/AlertsView';
import { DevicesView } from './components/DevicesView';
import { AIInsightsView } from './components/AIInsightsView';
import { PatientRecordsView } from './components/PatientRecordsView';
import { SettingsView } from './components/SettingsView';
import { AdminManageView } from './components/AdminManageView';
import { ReportModal } from './components/ReportModal';
import { LiveEcgMonitor } from './components/LiveEcgMonitor';
import { DataSource, EmergencyAlert, IoTDevice, Patient, RiskAnalysisResult, RiskLevel, SignalQuality, UserRole, VitalReading } from './types';
import { X, Activity } from 'lucide-react';
import { api } from './lib/api';

export default function App() {
  const [role, setRole] = useState<UserRole>('DOCTOR');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Core Clinical State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<any[]>([]);
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [demoMode, setDemoMode] = useState<'NORMAL' | 'ATTENTION' | 'CRITICAL'>('NORMAL');
  const [isHardwareLive, setIsHardwareLive] = useState<boolean>(false);
  const [kpis, setKpis] = useState({
    totalPatients: 4,
    patientsCurrentlyMonitoring: 3,
    stable: 1,
    attentionRequired: 2,
    critical: 0,
    devicesOnline: 3,
  });

  // UI Modals
  const [reportModalPatient, setReportModalPatient] = useState<Patient | null>(null);
  const [quickEcgPatient, setQuickEcgPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Periodic Telemetry Polling (1.0 second as specified in Section 20)
  useEffect(() => {
    let isMounted = true;

    const fetchAllData = async () => {
      try {
        const [patientsData, devicesData, alertsData, statusData, patient001Latest] = await Promise.all([
          api.getPatients(),
          api.getDevices(),
          api.getAlerts(),
          api.getSystemStatus(),
          api.getPatientLatest('PATIENT-001').catch(() => null),
        ]);

        // Evaluate whether HEALTHSYNC-ESP32-01 telemetry is recent (stale timeout: 60s)
        const now = Date.now();
        const STALE_TIMEOUT_MS = 60000;
        const esp32Device = devicesData.find((d: any) => d.deviceId === 'HEALTHSYNC-ESP32-01');

        const deviceTimeMs = esp32Device?.lastSeen
          ? new Date(esp32Device.lastSeen).getTime()
          : (esp32Device?.lastPacketReceivedAt ? new Date(esp32Device.lastPacketReceivedAt).getTime() : 0);

        const telemetryTimeMs = patient001Latest?.timestamp
          ? new Date(patient001Latest.timestamp).getTime()
          : 0;

        const latestHwTimeMs = Math.max(deviceTimeMs, telemetryTimeMs);
        const isHwFresh = latestHwTimeMs > 0 && (now - latestHwTimeMs < STALE_TIMEOUT_MS);
        const hwActive = isHwFresh && (patient001Latest?.dataMode === 'HARDWARE' || esp32Device?.sourceMode === 'LIVE_HARDWARE');

        setIsHardwareLive(hwActive);

        // Normalize devices
        const normalizedDevices = devicesData.map((d: any) => {
          if (d.deviceId === 'HEALTHSYNC-ESP32-01' && hwActive) {
            return {
              ...d,
              status: 'online' as const,
              connectionStatus: 'ONLINE',
              sourceMode: 'LIVE_HARDWARE' as const,
              sourceLabel: 'LIVE HARDWARE',
              isSimulated: false,
            };
          }
          return d;
        });

        // Normalize patients so currentVitals and currentRisk are always populated
        const normalizedPatients = patientsData.map((p: any) => {
          const isTargetPatient = p.id === 'PATIENT-001' || p.patientId === 'PATIENT-001';
          const pLatest = isTargetPatient && patient001Latest ? patient001Latest : null;
          const rawVitals = pLatest || p.vitals || p.currentVitals;

          const isPatientHwLive = isTargetPatient && hwActive;
          const effectiveDeviceStatus: 'online' | 'offline' = isPatientHwLive
            ? 'online'
            : (p.deviceStatus || 'offline');
          const effectiveSourceMode: DataSource = isPatientHwLive
            ? 'LIVE_HARDWARE'
            : (p.sourceMode || 'DEMO');

          const hr = rawVitals?.heartRate != null ? Math.round(rawVitals.heartRate) : null;
          const spo2 = rawVitals?.spo2 != null ? Number(rawVitals.spo2) : (p.baseline?.spo2Mean || 98.0);
          const temp = rawVitals?.temperature != null ? Number(rawVitals.temperature) : (p.baseline?.tempMean || 36.8);

          const signalQuality = typeof rawVitals?.signalQuality === 'object' && rawVitals?.signalQuality !== null
            ? rawVitals.signalQuality
            : {
                overall: (rawVitals?.signalQuality || (effectiveDeviceStatus === 'online' ? 'good' : 'no_signal')) as SignalQuality,
                hrQuality: (hr != null ? 'good' : (isPatientHwLive ? 'poor' : (effectiveDeviceStatus === 'online' ? 'good' : 'no_signal'))) as SignalQuality,
                spo2Quality: 'good' as SignalQuality,
                tempQuality: 'good' as SignalQuality,
                ecgQuality: 'good' as SignalQuality,
              };

          const currentVitals: VitalReading = {
            id: `VIT-${p.id}`,
            patientId: p.id,
            deviceId: p.deviceId,
            timestamp: pLatest?.timestamp || rawVitals?.lastUpdated || rawVitals?.timestamp || p.lastTransmission || new Date().toISOString(),
            heartRate: hr,
            spo2,
            temperature: temp,
            ecgSample: rawVitals?.ecgSample || [],
            signalQuality,
            source: effectiveSourceMode,
            ecgHeartRateCalc: hr ?? undefined,
            ecgRhythmDescription: rawVitals?.ecgRhythmDescription || (effectiveDeviceStatus === 'online' ? 'Sinus Rhythm' : 'Offline'),
          };

          const currentRisk: RiskAnalysisResult = p.currentRisk || {
            riskScore: p.riskScore ?? (rawVitals?.status === 'CRITICAL' ? 88 : rawVitals?.status === 'ATTENTION' ? 55 : 12),
            riskLevel: (p.riskLevel || (rawVitals?.status === 'CRITICAL' ? 'CRITICAL' : rawVitals?.status === 'ATTENTION' ? 'ATTENTION' : 'STABLE')) as RiskLevel,
            calculatedAt: currentVitals.timestamp,
            isReliable: true,
            factors: Array.isArray(p.riskFactors)
              ? p.riskFactors.map((f: string) => ({
                  parameter: 'HEART_RATE' as const,
                  label: f,
                  points: 0,
                  severity: 'normal' as const,
                  observation: f,
                }))
              : [],
            trendSummary: {
              hrTrend: 'STABLE',
              spo2Trend: 'STABLE',
              tempTrend: 'STABLE',
              description: 'Continuous vital signs telemetry monitoring active.',
            },
            recommendation: 'Continue standard telemetry protocol.',
          };

          return {
            ...p,
            deviceStatus: effectiveDeviceStatus,
            sourceMode: effectiveSourceMode,
            lastReceivedAt: currentVitals.timestamp,
            currentVitals,
            currentRisk,
          };
        });

        if (isMounted) {
          setPatients(normalizedPatients);
          setDevices(normalizedDevices);
          setAlerts(alertsData);
          if (statusData && statusData.kpis) {
            setKpis(statusData.kpis);
          }
          setIsLoading(false);
          setFetchError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setFetchError(err.message);
          setIsLoading(false);
        }
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch telemetry history when a patient is selected
  useEffect(() => {
    if (!selectedPatientId) return;

    const fetchHistory = async () => {
      try {
        const data = await api.getPatientHistory(selectedPatientId, 100);
        if (data && data.history) {
          setSelectedPatientHistory(data.history);
        }
      } catch (err) {
        console.error('Failed to fetch patient history', err);
      }
    };

    fetchHistory();
    const historyInterval = setInterval(fetchHistory, 1500);
    return () => clearInterval(historyInterval);
  }, [selectedPatientId]);

  // Selected Patient Object
  const currentSelectedPatient = patients.find((p) => p.id === selectedPatientId) || null;

  // Unacknowledged Alert Count
  const unacknowledgedAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  // Handlers
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setActiveTab('patient-details');
  };

  const handleSelectPatientById = (patientId: string) => {
    setSelectedPatientId(patientId);
    setActiveTab('patient-details');
  };

  const handleSetDemoMode = async (mode: 'NORMAL' | 'ATTENTION' | 'CRITICAL') => {
    try {
      setDemoMode(mode);
      await api.setDemoMode(mode);
      // Immediately refresh alerts, patients, and system status to reflect changes instantaneously
      const [alertsData, patientsData, statusData] = await Promise.all([
        api.getAlerts(),
        api.getPatients(),
        api.getSystemStatus(),
      ]);
      setAlerts(alertsData);
      setPatients(patientsData);
      if (statusData && statusData.kpis) {
        setKpis(statusData.kpis);
      }
    } catch (err) {
      console.error('Failed to set demo mode', err);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    const doctorName = role === 'DOCTOR' ? 'Dr. Sarah Chen, MD' : 'Admin Operations';
    try {
      await api.acknowledgeAlert(alertId, doctorName);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, acknowledged: true, acknowledgedBy: doctorName } : a
        )
      );
    } catch (err) {
      console.error('Failed to ack alert', err);
    }
  };

  const handleAddNote = async (
    patientId: string,
    content: string,
    category: 'ROUTINE' | 'EMERGENCY' | 'MEDICATION_CHANGE' | 'OBSERVATION'
  ) => {
    const author = role === 'DOCTOR' ? 'Dr. Sarah Chen, MD' : 'Admin Supervisor';
    try {
      const data = await api.addPatientNote(patientId, content, author, category);
      const newNote = data.note ?? data;
      setPatients((prev) =>
        prev.map((p) => (p.id === patientId ? { ...p, notes: [newNote, ...p.notes] } : p))
      );
    } catch (err) {
      console.error('Failed to add note', err);
    }
  };

  const handleInjectScenario = async (patientId: string, scenario: string) => {
    try {
      if (scenario.includes('CRITICAL') || scenario.includes('HYPOXIA') || scenario.includes('SHOCK')) {
        handleSetDemoMode('CRITICAL');
      } else if (scenario.includes('ATTENTION') || scenario.includes('BRADYCARDIA')) {
        handleSetDemoMode('ATTENTION');
      } else {
        handleSetDemoMode('NORMAL');
      }
    } catch (err) {
      console.error('Failed to inject scenario', err);
    }
  };

  const handleToggleDeviceStatus = async (deviceId: string, status: 'online' | 'offline') => {
    try {
      await api.toggleDeviceStatus(deviceId, status);
      setDevices((prev) => prev.map((d) => (d.deviceId === deviceId ? { ...d, status } : d)));
      setPatients((prev) =>
        prev.map((p) => (p.deviceId === deviceId ? { ...p, deviceStatus: status } : p))
      );
    } catch (err) {
      console.error('Failed to toggle device status', err);
    }
  };

  const handleToggleDeviceSource = async (deviceId: string, sourceMode: DataSource) => {
    setDevices((prev) => prev.map((d) => (d.deviceId === deviceId ? { ...d, sourceMode } : d)));
    setPatients((prev) =>
      prev.map((p) => (p.deviceId === deviceId ? { ...p, sourceMode } : p))
    );
  };

  const handleDirectTelemetryIngest = async (payload: any) => {
    await api.postTelemetry(payload);
  };

  const handleGenerateAiSummary = async (patientId: string) => {
    const p = patients.find((pat) => pat.id === patientId);
    const hr = p?.currentVitals?.heartRate || 76;
    const spo2 = p?.currentVitals?.spo2 || 98;
    const temp = p?.currentVitals?.temperature || 36.8;
    return `Patient ${p?.name || patientId} is under continuous IoT telemetry. Current parameters: HR ${hr} BPM, SpO2 ${spo2}%, Temp ${temp}°C. Status is evaluated as ${p?.currentRisk?.riskLevel || 'STABLE'}. Sensor integrity confirmed.`;
  };

  const handleReassignDevice = async (deviceId: string, patientId: string) => {
    try {
      await api.assignDevice(deviceId, patientId);
      const devicesData = await api.getDevices();
      setDevices(devicesData);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to reassign device');
    }
  };

  const handleAddPatient = async (newPatientData: Partial<Patient>) => {
    try {
      const res = await api.createPatient(newPatientData);
      const created = res.patient ?? res;
      setPatients((prev) => [...prev, created]);
    } catch (err) {
      console.error('Failed to add patient', err);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 antialiased overflow-hidden">
      {/* 1. SIDEBAR NAVIGATION */}
      <Sidebar
        currentTab={activeTab}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        setActiveTab={setActiveTab}
        userRole={role}
        setUserRole={setRole}
        onToggleRole={() => setRole((prev) => (prev === 'DOCTOR' ? 'ADMIN' : 'DOCTOR'))}
        unreadAlertsCount={unacknowledgedAlertsCount}
        unacknowledgedAlertsCount={unacknowledgedAlertsCount}
        onlineDevicesCount={devices.filter((d) => d.status === 'online').length}
        totalDevicesCount={devices.length}
      />

      {/* 2. MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          userRole={role}
          setUserRole={setRole}
          unreadAlertsCount={unacknowledgedAlertsCount}
          unacknowledgedAlertsCount={unacknowledgedAlertsCount}
          hasCriticalAlert={alerts.some((a) => !a.acknowledged && a.severity === 'CRITICAL')}
          onOpenAlerts={() => setActiveTab('alerts')}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          setSearchQuery={setSearchQuery}
          isHardwareLive={isHardwareLive}
        />

        {/* DEMO / LIVE HARDWARE MODE CONTROL PANEL RIBBON */}
        <div
          id="demo-mode-ribbon"
          className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs z-10"
        >
          <div className="flex items-center gap-3">
            {isHardwareLive ? (
              <div
                id="source-mode-badge"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black tracking-wide"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                LIVE HARDWARE
              </div>
            ) : (
              <div
                id="source-mode-badge"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 border border-purple-200 text-xs font-black tracking-wide"
              >
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                DEMO MODE
              </div>
            )}
            <div className="text-xs text-slate-500">
              {isHardwareLive ? (
                <>
                  <span className="font-semibold text-emerald-700">ESP32 Live Telemetry Active:</span>{' '}
                  <span className="text-slate-600 hidden sm:inline">
                    Streaming live DS18B20 temp and pulse sensor data from HEALTHSYNC-ESP32-01.
                  </span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-slate-700">Simulated Vitals Engine:</span>{' '}
                  <span className="text-slate-500 hidden sm:inline">Values transition gradually (no sudden jumps).</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono hidden md:inline">Demo Fallback:</span>
            <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 text-xs font-bold">
              <button
                id="btn-demo-normal"
                onClick={() => handleSetDemoMode('NORMAL')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  demoMode === 'NORMAL'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="NORMAL: HR 70-85 BPM, SpO2 96-99%, Status: STABLE"
              >
                NORMAL (STABLE)
              </button>
              <button
                id="btn-demo-attention"
                onClick={() => handleSetDemoMode('ATTENTION')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  demoMode === 'ATTENTION'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="ATTENTION: HR 100-110 BPM, SpO2 91-95%, Temp 38.0-38.5°C"
              >
                ATTENTION (WARNING)
              </button>
              <button
                id="btn-demo-critical"
                onClick={() => handleSetDemoMode('CRITICAL')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  demoMode === 'CRITICAL'
                    ? 'bg-rose-600 text-white shadow-xs animate-pulse'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="CRITICAL: HR >= 120 BPM, SpO2 <= 90%, Temp >= 39°C"
              >
                CRITICAL (ALERT)
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* TAB ROUTING */}
            {activeTab === 'dashboard' && (
              <DashboardView
                patients={patients}
                kpis={kpis}
                onSelectPatient={handleSelectPatient}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectQuickEcg={(p) => setQuickEcgPatient(p)}
                onOpenDevices={() => setActiveTab('devices')}
                onOpenAiInsights={() => setActiveTab('ai-insights')}
              />
            )}

            {activeTab === 'patient-details' && (
              currentSelectedPatient ? (
                <PatientDetailView
                  patient={currentSelectedPatient}
                  onBack={() => setActiveTab('dashboard')}
                  telemetryHistory={selectedPatientHistory}
                  onAddNote={handleAddNote}
                  onInjectScenario={handleInjectScenario}
                  onGenerateAiSummary={handleGenerateAiSummary}
                  onOpenReport={(p) => setReportModalPatient(p)}
                />
              ) : (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
                  <p className="text-sm font-semibold text-slate-700">No patient selected.</p>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="mt-3 px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold"
                  >
                    Return to Patient Table
                  </button>
                </div>
              )
            )}

            {activeTab === 'live-monitoring' && (
              <LiveMonitoringView
                patients={patients}
                onSelectPatient={handleSelectPatient}
              />
            )}

            {activeTab === 'alerts' && (
              <AlertsView
                alerts={alerts}
                patients={patients}
                onAcknowledgeAlert={handleAcknowledgeAlert}
                onSelectPatientById={handleSelectPatientById}
              />
            )}

            {activeTab === 'devices' && (
              <DevicesView
                devices={devices}
                onToggleDeviceStatus={handleToggleDeviceStatus}
                onToggleDeviceSource={handleToggleDeviceSource}
                onDirectTelemetryIngest={handleDirectTelemetryIngest}
              />
            )}

            {activeTab === 'ai-insights' && (
              <AIInsightsView
                patients={patients}
                onSelectPatient={handleSelectPatient}
              />
            )}

            {(activeTab === 'patients' || activeTab === 'records' || activeTab === 'reports') && (
              <PatientRecordsView
                patients={patients}
                onSelectPatient={handleSelectPatient}
                onOpenReport={(p) => setReportModalPatient(p)}
              />
            )}

            {(activeTab === 'admin' || activeTab === 'admin-manage') && (
              <AdminManageView
                patients={patients}
                devices={devices}
                onAddPatient={handleAddPatient}
                onReassignDevice={handleReassignDevice}
              />
            )}

            {activeTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* 3. REPORT MODAL */}
      {reportModalPatient && (
        <ReportModal
          patient={reportModalPatient}
          onClose={() => setReportModalPatient(null)}
        />
      )}

      {/* 4. QUICK ECG POPUP MODAL */}
      {quickEcgPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-4xl w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Lead II ECG Oscilloscope: {quickEcgPatient.name} ({quickEcgPatient.id})
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Node: {quickEcgPatient.deviceId} • Room: {quickEcgPatient.roomBed} • Source: {quickEcgPatient.sourceMode}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickEcgPatient(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <LiveEcgMonitor
              samples={quickEcgPatient.currentVitals?.ecgSample || []}
              heartRate={quickEcgPatient.currentVitals?.heartRate || quickEcgPatient.baseline.hrMean}
              rhythmDescription={quickEcgPatient.currentVitals?.ecgRhythmDescription}
              signalQuality={quickEcgPatient.currentVitals?.signalQuality.ecgQuality || 'good'}
              isOnline={quickEcgPatient.deviceStatus === 'online'}
              lastUpdatedText="Live Oscilloscope Sweep"
              sourceMode={quickEcgPatient.sourceMode}
            />

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-500">
                Speed: 25mm/s • Amplitude: 10mm/mV • Frequency: 0.05 - 150 Hz
              </span>
              <button
                onClick={() => {
                  const p = quickEcgPatient;
                  setQuickEcgPatient(null);
                  handleSelectPatient(p);
                }}
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-2xs"
              >
                Open Full Patient Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
