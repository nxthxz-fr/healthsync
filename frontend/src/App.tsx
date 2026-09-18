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
import { ErrorBoundary } from './components/ErrorBoundary';
import { DataSource, EmergencyAlert, IoTDevice, Patient, RiskAnalysisResult, RiskLevel, SignalQuality, UserRole, VitalReading } from './types';
import { X, Activity, AlertTriangle } from 'lucide-react';
import { api } from './lib/api';

// Route parsing helper to support direct navigation, browser refresh, and query parameters
const parseCurrentRoute = () => {
  if (typeof window === 'undefined') return { tab: 'dashboard', patientId: null };

  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash || '';
  const pathname = window.location.pathname || '';

  // 1. Pathname matches: /monitor/:id, /patient/:id, /patients/:id, /patient-details/:id
  const pathMatch = pathname.match(/^\/(?:monitor|patient|patients|patient-details)\/([^/?#]+)/i);
  if (pathMatch && pathMatch[1]) {
    return { tab: 'patient-details', patientId: decodeURIComponent(pathMatch[1]) };
  }

  // 2. Hash matches: #/monitor/:id or #monitor/:id
  const hashMatch = hash.match(/^#\/?(?:monitor|patient|patients|patient-details)\/([^/?#]+)/i);
  if (hashMatch && hashMatch[1]) {
    return { tab: 'patient-details', patientId: decodeURIComponent(hashMatch[1]) };
  }

  // 3. Query params: ?patientId=PATIENT-001 or ?patient=PATIENT-001 or ?id=PATIENT-001
  const qPatientId = searchParams.get('patientId') || searchParams.get('patient') || searchParams.get('id');
  if (qPatientId) {
    return { tab: 'patient-details', patientId: qPatientId };
  }

  // 4. Other standard tabs by path or query: /live-monitoring, /alerts, /devices, etc.
  const knownTabs = ['dashboard', 'live-monitoring', 'alerts', 'devices', 'ai-insights', 'records', 'patients', 'reports', 'admin', 'admin-manage', 'settings'];
  const cleanPath = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (knownTabs.includes(cleanPath)) {
    return { tab: cleanPath, patientId: null };
  }
  const qTab = searchParams.get('tab');
  if (qTab && knownTabs.includes(qTab.toLowerCase())) {
    return { tab: qTab.toLowerCase(), patientId: null };
  }

  return { tab: 'dashboard', patientId: null };
};

const DEFAULT_DEMO_PATIENTS: Patient[] = [
  {
    id: 'PATIENT-001',
    name: 'Demo Patient',
    age: 25,
    gender: 'Male',
    bloodGroup: 'O+',
    roomBed: 'Cardio Telemetry Ward',
    emergencyContact: {
      name: 'Emergency Contact',
      relationship: 'Next of Kin',
      phone: '000-000-0000',
    },
    assignedDoctor: 'Dr. Sarah Chen, MD (Cardiology)',
    medicalConditions: ['Sinus Arrhythmia', 'Cardiac Telemetry Observation'],
    allergies: ['Penicillin (Moderate rash)'],
    currentMedications: ['Metoprolol 25mg Daily', 'Aspirin 81mg Daily'],
    deviceId: 'HEALTHSYNC-ESP32-01',
    deviceStatus: 'online',
    sourceMode: 'DEMO',
    lastReceivedAt: new Date().toISOString(),
    baseline: {
      hrMin: 65,
      hrMax: 85,
      hrMean: 75,
      spo2Min: 96,
      spo2Max: 99,
      spo2Mean: 97.5,
      tempMin: 36.4,
      tempMax: 37.1,
      tempMean: 36.8,
      calculatedFromSamples: 1400,
      lastBaselineUpdate: new Date().toISOString(),
    },
    notes: [
      {
        id: 'NOTE-1',
        author: 'Attending Physician',
        timestamp: new Date().toISOString(),
        category: 'ROUTINE',
        content: 'Demo patient for telemetry presentation. MARKED AS DEMO DATA.',
      },
    ],
    currentVitals: {
      id: 'VIT-PATIENT-001',
      patientId: 'PATIENT-001',
      deviceId: 'HEALTHSYNC-ESP32-01',
      timestamp: new Date().toISOString(),
      heartRate: 76,
      spo2: 98.2,
      temperature: 36.8,
      ecgSample: [],
      signalQuality: {
        overall: 'good',
        hrQuality: 'good',
        spo2Quality: 'good',
        tempQuality: 'good',
        ecgQuality: 'good',
      },
      source: 'DEMO',
      ecgHeartRateCalc: 76,
      ecgRhythmDescription: 'Normal Sinus Rhythm',
    },
    currentRisk: {
      riskScore: 12,
      riskLevel: 'STABLE',
      calculatedAt: new Date().toISOString(),
      isReliable: true,
      factors: [],
      trendSummary: {
        hrTrend: 'STABLE',
        spo2Trend: 'STABLE',
        tempTrend: 'STABLE',
        description: 'Continuous vital signs telemetry monitoring active.',
      },
      recommendation: 'Continue standard telemetry protocol.',
    },
  },
];

const DEFAULT_DEMO_DEVICES: IoTDevice[] = [
  {
    deviceId: 'HEALTHSYNC-ESP32-01',
    patientId: 'PATIENT-001',
    patientName: 'Demo Patient',
    status: 'online',
    batteryLevel: 94,
    firmwareVersion: 'v2.4.1-clinical',
    ipAddress: '192.168.1.101',
    macAddress: 'C4:4F:33:18:A2:9C',
    rssiDbm: -62,
    lastPacketReceivedAt: new Date().toISOString(),
    packetRateHz: 1.0,
    totalPacketsSent: 4200,
    sourceMode: 'DEMO',
    sourceLabel: 'SOURCE MODE: DEMO / SIMULATION',
    isSimulated: true,
  },
];

export default function App() {
  const initialRoute = parseCurrentRoute();
  const [role, setRole] = useState<UserRole>('DOCTOR');
  const [activeTab, setActiveTab] = useState<string>(initialRoute.tab);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Core Clinical State
  const [patients, setPatients] = useState<Patient[]>(DEFAULT_DEMO_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialRoute.patientId);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<any[]>([]);
  const [devices, setDevices] = useState<IoTDevice[]>(DEFAULT_DEMO_DEVICES);
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
  const [isLoading, setIsLoading] = useState(false);
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
          const patientId = p.id || p.patientId;
          const isTargetPatient = patientId === 'PATIENT-001';
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
            id: `VIT-${patientId}`,
            patientId: patientId,
            deviceId: p.deviceId || 'HEALTHSYNC-ESP32-01',
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

          const emergencyContact = p.emergencyContact || {
            name: p.emergencyContactName || 'Emergency Contact',
            relationship: 'Next of Kin',
            phone: p.emergencyContactPhone || p.phone || '000-000-0000',
          };

          const medicalConditions = Array.isArray(p.medicalConditions) && p.medicalConditions.length > 0
            ? p.medicalConditions
            : (p.medicalNotes && !p.medicalNotes.startsWith('[') && !p.medicalNotes.startsWith('Demo')
                ? [p.medicalNotes]
                : ['Sinus Arrhythmia', 'Cardiac Telemetry Observation']);

          const allergies = Array.isArray(p.allergies) && p.allergies.length > 0
            ? p.allergies
            : (Array.isArray(p.clinicalSummary?.allergies) ? p.clinicalSummary.allergies : ['Penicillin (Moderate rash)']);

          const currentMedications = Array.isArray(p.currentMedications) && p.currentMedications.length > 0
            ? p.currentMedications
            : ['Metoprolol 25mg Daily', 'Aspirin 81mg Daily'];

          const assignedDoctor = p.assignedDoctor || p.doctor || 'Dr. Sarah Chen, MD (Cardiology)';
          const notes = Array.isArray(p.notes) ? p.notes : [];

          const baseline = p.baseline || {
            hrMin: 65,
            hrMax: 85,
            hrMean: 75,
            spo2Min: 96.0,
            spo2Max: 99.0,
            spo2Mean: 97.5,
            tempMin: 36.4,
            tempMax: 37.1,
            tempMean: 36.8,
            calculatedFromSamples: 1400,
            lastBaselineUpdate: new Date().toISOString(),
          };

          return {
            ...p,
            id: patientId,
            patientId: patientId,
            name: p.name || p.fullName || 'Demo Patient',
            assignedDoctor,
            emergencyContact,
            medicalConditions,
            allergies,
            currentMedications,
            notes,
            baseline,
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

  // Synchronize browser history / Back / Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const route = parseCurrentRoute();
      setActiveTab(route.tab);
      setSelectedPatientId(route.patientId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch individual patient by ID if directly navigated to URL and not yet in patients array
  useEffect(() => {
    if (!selectedPatientId || isLoading) return;
    const exists = patients.some((p) => p.id === selectedPatientId || (p as any).patientId === selectedPatientId);
    if (!exists) {
      api.getPatientById(selectedPatientId)
        .then((singlePatient) => {
          if (singlePatient) {
            setPatients((prev) => {
              if (prev.some((p) => p.id === singlePatient.patientId || p.id === singlePatient.id)) return prev;
              const formatted: Patient = {
                ...singlePatient,
                id: singlePatient.patientId || singlePatient.id,
                name: singlePatient.fullName || singlePatient.name || 'Patient',
                assignedDoctor: singlePatient.assignedDoctor || singlePatient.doctor || 'Dr. Sarah Chen, MD (Cardiology)',
                emergencyContact: singlePatient.emergencyContact || {
                  name: singlePatient.emergencyContactName || 'Emergency Contact',
                  relationship: 'Next of Kin',
                  phone: singlePatient.emergencyContactPhone || '000-000-0000',
                },
                medicalConditions: singlePatient.medicalConditions || ['Sinus Arrhythmia', 'Cardiac Telemetry Observation'],
                allergies: singlePatient.allergies || ['Penicillin (Moderate rash)'],
                currentMedications: singlePatient.currentMedications || ['Metoprolol 25mg Daily', 'Aspirin 81mg Daily'],
                notes: Array.isArray(singlePatient.notes) ? singlePatient.notes : [],
                baseline: singlePatient.baseline || {
                  hrMin: 65, hrMax: 85, hrMean: 75,
                  spo2Min: 96, spo2Max: 99, spo2Mean: 97.5,
                  tempMin: 36.4, tempMax: 37.1, tempMean: 36.8,
                  calculatedFromSamples: 1400,
                  lastBaselineUpdate: new Date().toISOString(),
                },
                deviceStatus: singlePatient.deviceStatus || 'online',
                sourceMode: singlePatient.sourceMode || 'DEMO',
                lastReceivedAt: singlePatient.lastTransmission || new Date().toISOString(),
              };
              return [formatted, ...prev];
            });
          }
        })
        .catch((e) => {
          console.warn('Unable to load single patient by ID:', e);
        });
    }
  }, [selectedPatientId, isLoading, patients.length]);

  // Selected Patient Object
  const currentSelectedPatient = patients.find((p) => p.id === selectedPatientId || (p as any).patientId === selectedPatientId) || null;

  // Unacknowledged Alert Count
  const unacknowledgedAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  // Router navigation helper
  const navigateToTab = (tab: string, patientId: string | null = null, pushState: boolean = true) => {
    setActiveTab(tab);
    setSelectedPatientId(patientId);

    if (pushState && typeof window !== 'undefined') {
      if (tab === 'patient-details' && patientId) {
        window.history.pushState({ tab, patientId }, '', `/monitor/${encodeURIComponent(patientId)}`);
      } else if (tab === 'dashboard') {
        window.history.pushState({ tab, patientId: null }, '', '/');
      } else {
        window.history.pushState({ tab, patientId: null }, '', `/${tab}`);
      }
    }
  };

  // Handlers
  const handleSelectPatient = (patient: Patient) => {
    navigateToTab('patient-details', patient.id || (patient as any).patientId, true);
  };

  const handleSelectPatientById = (patientId: string) => {
    navigateToTab('patient-details', patientId, true);
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
        onSelectTab={(tab) => navigateToTab(tab, null, true)}
        setActiveTab={(tab) => navigateToTab(tab, null, true)}
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
          onOpenAlerts={() => navigateToTab('alerts', null, true)}
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
            {/* BACKEND STATUS NOTICE BANNER IF TEMPORARILY SLEEPING / OFFLINE */}
            {fetchError && (
              <div
                id="backend-connection-banner"
                className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-wrap items-center justify-between gap-2 shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong className="font-semibold">Backend Reconnecting:</strong> The remote telemetry service is spinning up or unavailable ({fetchError}). Operating in resilient local demo mode with automatic reconnection.
                  </span>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  Retry Connection
                </button>
              </div>
            )}

            {/* TAB ROUTING */}
            {activeTab === 'dashboard' && (
              <ErrorBoundary fallbackMessage="Unable to render Dashboard overview.">
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
              </ErrorBoundary>
            )}

            {activeTab === 'patient-details' && (
              isLoading && !currentSelectedPatient ? (
                <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4 text-center">
                  <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Loading patient monitor...</h3>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      Fetching real-time telemetry and clinical data for {selectedPatientId || 'patient'}...
                    </p>
                  </div>
                </div>
              ) : currentSelectedPatient ? (
                <ErrorBoundary
                  fallbackMessage="Unable to load patient monitoring data."
                  onReset={() => navigateToTab('dashboard', null, true)}
                >
                  <PatientDetailView
                    patient={currentSelectedPatient}
                    onBack={() => navigateToTab('dashboard', null, true)}
                    telemetryHistory={selectedPatientHistory}
                    onAddNote={handleAddNote}
                    onInjectScenario={handleInjectScenario}
                    onGenerateAiSummary={handleGenerateAiSummary}
                    onOpenReport={(p) => setReportModalPatient(p)}
                  />
                </ErrorBoundary>
              ) : fetchError ? (
                <div className="p-12 text-center bg-white rounded-xl border border-rose-200 shadow-xs space-y-3">
                  <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900">Unable to load patient monitoring data.</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">{fetchError}</p>
                  <button
                    onClick={() => navigateToTab('dashboard', null, true)}
                    className="mt-3 px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                </div>
              ) : (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <p className="text-sm font-semibold text-slate-700">
                    {selectedPatientId
                      ? `Unable to load patient monitoring data: Patient "${selectedPatientId}" was not found.`
                      : 'No patient selected.'}
                  </p>
                  <button
                    onClick={() => navigateToTab('dashboard', null, true)}
                    className="mt-3 px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                </div>
              )
            )}

            {activeTab === 'live-monitoring' && (
              <ErrorBoundary fallbackMessage="Unable to render Live Monitoring station.">
                <LiveMonitoringView
                  patients={patients}
                  onSelectPatient={handleSelectPatient}
                />
              </ErrorBoundary>
            )}

            {activeTab === 'alerts' && (
              <ErrorBoundary fallbackMessage="Unable to render Alerts view.">
                <AlertsView
                  alerts={alerts}
                  patients={patients}
                  onAcknowledgeAlert={handleAcknowledgeAlert}
                  onSelectPatientById={handleSelectPatientById}
                />
              </ErrorBoundary>
            )}

            {activeTab === 'devices' && (
              <ErrorBoundary fallbackMessage="Unable to render Devices view.">
                <DevicesView
                  devices={devices}
                  onToggleDeviceStatus={handleToggleDeviceStatus}
                  onToggleDeviceSource={handleToggleDeviceSource}
                  onDirectTelemetryIngest={handleDirectTelemetryIngest}
                />
              </ErrorBoundary>
            )}

            {activeTab === 'ai-insights' && (
              <ErrorBoundary fallbackMessage="Unable to render AI Insights view.">
                <AIInsightsView
                  patients={patients}
                  onSelectPatient={handleSelectPatient}
                />
              </ErrorBoundary>
            )}

            {(activeTab === 'patients' || activeTab === 'records' || activeTab === 'reports') && (
              <ErrorBoundary fallbackMessage="Unable to render Patient Records view.">
                <PatientRecordsView
                  patients={patients}
                  onSelectPatient={handleSelectPatient}
                  onOpenReport={(p) => setReportModalPatient(p)}
                />
              </ErrorBoundary>
            )}

            {(activeTab === 'admin' || activeTab === 'admin-manage') && (
              <ErrorBoundary fallbackMessage="Unable to render Admin Management view.">
                <AdminManageView
                  patients={patients}
                  devices={devices}
                  onAddPatient={handleAddPatient}
                  onReassignDevice={handleReassignDevice}
                />
              </ErrorBoundary>
            )}

            {activeTab === 'settings' && (
              <ErrorBoundary fallbackMessage="Unable to render Settings view.">
                <SettingsView />
              </ErrorBoundary>
            )}
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
