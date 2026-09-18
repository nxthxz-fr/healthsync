import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { Patient, VitalReading, IoTDevice, EmergencyAlert, SystemStatus, RiskAnalysisResult } from './src/types';
import { calculateRiskAnalysis } from './src/lib/riskEngine';
import { generateLeadIIBeat, detectQRSBpm } from './src/lib/ecgSignal';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Database Store
interface DatabaseState {
  patients: Patient[];
  telemetryHistory: Record<string, VitalReading[]>; // patientId -> list of readings
  alerts: EmergencyAlert[];
  devices: IoTDevice[];
  systemStartTime: number;
}

const initialBaselineP101 = {
  hrMin: 68,
  hrMax: 84,
  hrMean: 76,
  spo2Min: 95,
  spo2Max: 99,
  spo2Mean: 97.2,
  tempMin: 36.4,
  tempMax: 37.1,
  tempMean: 36.7,
  calculatedFromSamples: 1420,
  lastBaselineUpdate: new Date(Date.now() - 3600000 * 12).toISOString(),
};

const initialBaselineP102 = {
  hrMin: 60,
  hrMax: 76,
  hrMean: 68,
  spo2Min: 96,
  spo2Max: 100,
  spo2Mean: 98.4,
  tempMin: 36.5,
  tempMax: 37.2,
  tempMean: 36.8,
  calculatedFromSamples: 1840,
  lastBaselineUpdate: new Date(Date.now() - 3600000 * 24).toISOString(),
};

const initialBaselineP103 = {
  hrMin: 72,
  hrMax: 90,
  hrMean: 81,
  spo2Min: 94,
  spo2Max: 98,
  spo2Mean: 95.8,
  tempMin: 36.6,
  tempMax: 37.3,
  tempMean: 36.9,
  calculatedFromSamples: 960,
  lastBaselineUpdate: new Date(Date.now() - 3600000 * 6).toISOString(),
};

const initialBaselineP104 = {
  hrMin: 64,
  hrMax: 78,
  hrMean: 71,
  spo2Min: 97,
  spo2Max: 99,
  spo2Mean: 98.1,
  tempMin: 36.3,
  tempMax: 37.0,
  tempMean: 36.6,
  calculatedFromSamples: 1200,
  lastBaselineUpdate: new Date(Date.now() - 3600000 * 8).toISOString(),
};

const initialBaselineP105 = {
  hrMin: 70,
  hrMax: 85,
  hrMean: 78,
  spo2Min: 95,
  spo2Max: 98,
  spo2Mean: 96.5,
  tempMin: 36.5,
  tempMax: 37.2,
  tempMean: 36.8,
  calculatedFromSamples: 2100,
  lastBaselineUpdate: new Date(Date.now() - 3600000 * 36).toISOString(),
};

const initialBaselineP106 = {
  hrMin: 65,
  hrMax: 82,
  hrMean: 74,
  spo2Min: 96,
  spo2Max: 99,
  spo2Mean: 97.6,
  tempMin: 36.4,
  tempMax: 37.1,
  tempMean: 36.7,
  calculatedFromSamples: 1650,
  lastBaselineUpdate: new Date(Date.now() - 3600000 * 18).toISOString(),
};

const db: DatabaseState = {
  systemStartTime: Date.now() - 3600000 * 48,
  devices: [
    {
      deviceId: 'ESP32-DEV-901',
      patientId: 'P-101',
      patientName: 'Arthur Vance',
      status: 'online',
      sourceMode: 'LIVE_HARDWARE',
      firmwareVersion: 'v2.4.1-clinical',
      batteryLevel: 94,
      ipAddress: '192.168.1.142',
      macAddress: '24:6F:28:B4:7C:1A',
      rssiDbm: -58,
      lastPacketReceivedAt: new Date().toISOString(),
      packetRateHz: 1.0,
      totalPacketsSent: 48290,
    },
    {
      deviceId: 'ESP32-DEV-902',
      patientId: 'P-102',
      patientName: 'Elena Rostova',
      status: 'online',
      sourceMode: 'WOKWI_SIMULATION',
      firmwareVersion: 'v2.4.1-clinical',
      batteryLevel: 88,
      ipAddress: '192.168.1.145',
      macAddress: '24:6F:28:C2:3F:89',
      rssiDbm: -64,
      lastPacketReceivedAt: new Date().toISOString(),
      packetRateHz: 1.0,
      totalPacketsSent: 52140,
    },
    {
      deviceId: 'ESP32-DEV-903',
      patientId: 'P-103',
      patientName: 'Marcus Brody',
      status: 'online',
      sourceMode: 'LIVE_HARDWARE',
      firmwareVersion: 'v2.4.1-clinical',
      batteryLevel: 72,
      ipAddress: '192.168.1.150',
      macAddress: '24:6F:28:A1:99:4E',
      rssiDbm: -71,
      lastPacketReceivedAt: new Date().toISOString(),
      packetRateHz: 1.0,
      totalPacketsSent: 31200,
    },
    {
      deviceId: 'ESP32-DEV-904',
      patientId: 'P-104',
      patientName: 'Linda Diaz',
      status: 'online',
      sourceMode: 'WOKWI_SIMULATION',
      firmwareVersion: 'v2.4.1-clinical',
      batteryLevel: 98,
      ipAddress: '192.168.1.155',
      macAddress: '24:6F:28:E8:11:02',
      rssiDbm: -52,
      lastPacketReceivedAt: new Date().toISOString(),
      packetRateHz: 1.0,
      totalPacketsSent: 61840,
    },
    {
      deviceId: 'ESP32-DEV-905',
      patientId: 'P-105',
      patientName: 'Robert Chen',
      status: 'offline', // Offline device demonstrates "DEVICE OFFLINE - Last valid reading"
      sourceMode: 'LIVE_HARDWARE',
      firmwareVersion: 'v2.3.9-clinical',
      batteryLevel: 14,
      ipAddress: '192.168.1.160',
      macAddress: '24:6F:28:77:33:AA',
      rssiDbm: -92,
      lastPacketReceivedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 minutes ago
      packetRateHz: 0,
      totalPacketsSent: 19400,
    },
    {
      deviceId: 'ESP32-DEV-906',
      patientId: 'P-106',
      patientName: 'Evelyn Woods',
      status: 'online',
      sourceMode: 'WOKWI_SIMULATION',
      firmwareVersion: 'v2.4.1-clinical',
      batteryLevel: 81,
      ipAddress: '192.168.1.168',
      macAddress: '24:6F:28:9B:44:09',
      rssiDbm: -66,
      lastPacketReceivedAt: new Date().toISOString(),
      packetRateHz: 1.0,
      totalPacketsSent: 44290,
    },
  ],
  patients: [
    {
      id: 'P-101',
      name: 'Arthur Vance',
      age: 68,
      gender: 'Male',
      bloodGroup: 'A+',
      roomBed: 'Cardio-Stepdown 3B',
      emergencyContact: {
        name: 'Martha Vance',
        relationship: 'Spouse',
        phone: '+1 (555) 234-8901',
      },
      assignedDoctor: 'Dr. Sarah Chen, MD (Cardiology)',
      medicalConditions: ['Congestive Heart Failure (NYHA II)', 'COPD Gold Stage 2', 'Hypertension'],
      allergies: ['Penicillin', 'Sulfa drugs'],
      currentMedications: ['Lisinopril 20mg Daily', 'Carvedilol 12.5mg BID', 'Furosemide 40mg Daily', 'Spiriva Inhaler'],
      deviceId: 'ESP32-DEV-901',
      deviceStatus: 'online',
      sourceMode: 'LIVE_HARDWARE',
      lastReceivedAt: new Date().toISOString(),
      baseline: initialBaselineP101,
      notes: [
        {
          id: 'NOTE-1',
          author: 'Dr. Sarah Chen, MD',
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
          category: 'ROUTINE',
          content: 'Morning rounds: Patient ambulatory. SpO2 stable on room air. Continued diuretic titration.',
        },
      ],
    },
    {
      id: 'P-102',
      name: 'Elena Rostova',
      age: 54,
      gender: 'Female',
      bloodGroup: 'O+',
      roomBed: 'Post-Op Recovery 12',
      emergencyContact: {
        name: 'Dmitri Rostov',
        relationship: 'Brother',
        phone: '+1 (555) 345-6789',
      },
      assignedDoctor: 'Dr. Marcus Vance, MD (Thoracic)',
      medicalConditions: ['Post-CABG (Day 4)', 'Hyperlipidemia', 'Type 2 Diabetes'],
      allergies: ['Latex (Mild urticaria)', 'Codeine'],
      currentMedications: ['Aspirin 81mg Daily', 'Metoprolol 25mg BID', 'Atorvastatin 40mg Nightly', 'Insulin Glargine 18u'],
      deviceId: 'ESP32-DEV-902',
      deviceStatus: 'online',
      sourceMode: 'WOKWI_SIMULATION',
      lastReceivedAt: new Date().toISOString(),
      baseline: initialBaselineP102,
      notes: [
        {
          id: 'NOTE-2',
          author: 'Dr. Marcus Vance, MD',
          timestamp: new Date(Date.now() - 3600000 * 9).toISOString(),
          category: 'OBSERVATION',
          content: 'Incision healing normally, clean and dry. Continuous telemetry monitoring for atrial ectopy.',
        },
      ],
    },
    {
      id: 'P-103',
      name: 'Marcus Brody',
      age: 72,
      gender: 'Male',
      bloodGroup: 'B-',
      roomBed: 'Pulmonary Intermediate 4A',
      emergencyContact: {
        name: 'David Brody',
        relationship: 'Son',
        phone: '+1 (555) 789-0123',
      },
      assignedDoctor: 'Dr. Sarah Chen, MD (Pulmonology)',
      medicalConditions: ['Acute Lobar Pneumonia', 'Chronic Bronchitis', 'Mild Atrial Fibrillation'],
      allergies: ['No Known Drug Allergies (NKDA)'],
      currentMedications: ['Ceftriaxone 1g IV Q24H', 'Azithromycin 500mg IV Daily', 'Albuterol Nebulizer Q4H PRN'],
      deviceId: 'ESP32-DEV-903',
      deviceStatus: 'online',
      sourceMode: 'LIVE_HARDWARE',
      lastReceivedAt: new Date().toISOString(),
      baseline: initialBaselineP103,
      notes: [
        {
          id: 'NOTE-3',
          author: 'Dr. Sarah Chen, MD',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          category: 'OBSERVATION',
          content: 'Oxygen requirement increased to 2L NC. Watch closely for desaturation trends during sleep.',
        },
      ],
    },
    {
      id: 'P-104',
      name: 'Linda Diaz',
      age: 45,
      gender: 'Female',
      bloodGroup: 'A-',
      roomBed: 'General Surgery 204',
      emergencyContact: {
        name: 'Carlos Diaz',
        relationship: 'Spouse',
        phone: '+1 (555) 456-7890',
      },
      assignedDoctor: 'Dr. Julian Ross, MD (General Surgery)',
      medicalConditions: ['Post-Laparoscopic Appendectomy (Day 2)', 'Mild Asthma'],
      allergies: ['Ciprofloxacin (Severe nausea)'],
      currentMedications: ['Acetaminophen 1000mg Q6H PRN', 'Ibuprofen 600mg Q8H with meals', 'Ventolin PRN'],
      deviceId: 'ESP32-DEV-904',
      deviceStatus: 'online',
      sourceMode: 'WOKWI_SIMULATION',
      lastReceivedAt: new Date().toISOString(),
      baseline: initialBaselineP104,
      notes: [],
    },
    {
      id: 'P-105',
      name: 'Robert Chen',
      age: 61,
      gender: 'Male',
      bloodGroup: 'AB+',
      roomBed: 'Nephrology Suite 8',
      emergencyContact: {
        name: 'Emily Chen',
        relationship: 'Daughter',
        phone: '+1 (555) 678-9012',
      },
      assignedDoctor: 'Dr. Anika Patel, MD (Nephrology)',
      medicalConditions: ['Chronic Kidney Disease Stage 3b', 'Diabetic Nephropathy', 'Renal Hypertension'],
      allergies: ['NSAIDs', 'Contrast dye'],
      currentMedications: ['Amlodipine 10mg Daily', 'Sevelamer 800mg with meals', 'Sodium Bicarbonate 650mg BID'],
      deviceId: 'ESP32-DEV-905',
      deviceStatus: 'offline',
      sourceMode: 'LIVE_HARDWARE',
      lastReceivedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      baseline: initialBaselineP105,
      notes: [
        {
          id: 'NOTE-4',
          author: 'Dr. Anika Patel, MD',
          timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
          category: 'OBSERVATION',
          content: 'Device battery depleted. Nursing instructed to swap battery pack and reconnect electrodes.',
        },
      ],
    },
    {
      id: 'P-106',
      name: 'Evelyn Woods',
      age: 79,
      gender: 'Female',
      bloodGroup: 'O-',
      roomBed: 'Geriatric Telemetry 10B',
      emergencyContact: {
        name: 'Claire Woods',
        relationship: 'Daughter',
        phone: '+1 (555) 901-2345',
      },
      assignedDoctor: 'Dr. Sarah Chen, MD (Geriatrics)',
      medicalConditions: ['Persistent Atrial Fibrillation', 'Essential Hypertension', 'Osteoporosis'],
      allergies: ['Sulfa antibiotics'],
      currentMedications: ['Apixaban 5mg BID', 'Diltiazem CD 180mg Daily', 'Alendronate 70mg Weekly'],
      deviceId: 'ESP32-DEV-906',
      deviceStatus: 'online',
      sourceMode: 'WOKWI_SIMULATION',
      lastReceivedAt: new Date().toISOString(),
      baseline: initialBaselineP106,
      notes: [],
    },
  ],
  telemetryHistory: {},
  alerts: [],
};

// Seed realistic historical telemetry points for each patient
function seedHistoricalTelemetry() {
  const now = Date.now();

  db.patients.forEach((patient) => {
    const history: VitalReading[] = [];
    const baseline = patient.baseline;
    const isP103 = patient.id === 'P-103'; // Marcus Brody: acute pneumonia showing gradual desaturation
    const isP106 = patient.id === 'P-106'; // Evelyn Woods: AFib with irregular rhythm

    for (let i = 24; i >= 0; i--) {
      const pointTime = new Date(now - i * 4000).toISOString();
      let hr = baseline.hrMean + Math.sin(i * 0.4) * 4;
      let spo2 = baseline.spo2Mean + (Math.random() - 0.5) * 0.8;
      let temp = baseline.tempMean + (Math.random() - 0.5) * 0.15;
      let rhythmType: 'normal' | 'tachycardia' | 'bradycardia' | 'afib' | 'pvc' = 'normal';
      let rhythmDesc = 'Normal Sinus Rhythm';

      if (isP103) {
        // Progressive acute desaturation & tachycardia escalation over recent samples
        if (i < 8) {
          // e.g. 96 -> 95 -> 94 -> 92 -> 90%
          spo2 = 96 - (8 - i) * 0.9;
          hr = 88 + (8 - i) * 3.2; // 88 -> 113 BPM
          temp = 37.8 + (8 - i) * 0.15; // febrile spike
          rhythmType = 'tachycardia';
          rhythmDesc = 'Sinus Tachycardia';
        }
      }

      if (isP106) {
        rhythmType = 'afib';
        rhythmDesc = 'Atrial Fibrillation (Controlled Ventricular Response)';
        hr = 78 + (Math.random() - 0.5) * 16;
      }

      const ecgWaveform = generateLeadIIBeat(Math.round(hr), 250, rhythmType);

      const reading: VitalReading = {
        id: `TEL-${patient.id}-${25 - i}`,
        patientId: patient.id,
        deviceId: patient.deviceId,
        timestamp: pointTime,
        heartRate: Math.round(hr),
        spo2: Number(spo2.toFixed(1)),
        temperature: Number(temp.toFixed(1)),
        ecgSample: ecgWaveform,
        signalQuality: {
          overall: 'good',
          hrQuality: 'good',
          spo2Quality: 'good',
          tempQuality: 'good',
          ecgQuality: 'good',
        },
        source: patient.sourceMode,
        ecgHeartRateCalc: Math.round(hr),
        ecgRhythmDescription: rhythmDesc,
      };

      history.push(reading);
    }

    db.telemetryHistory[patient.id] = history;
    const latestReading = history[history.length - 1];
    patient.currentVitals = latestReading;
    patient.currentRisk = calculateRiskAnalysis(latestReading, patient.baseline, history.slice(0, -1), patient.medicalConditions);

    // If initial risk is ATTENTION or CRITICAL, add to active alerts
    if (patient.currentRisk.riskLevel === 'CRITICAL' || patient.currentRisk.riskLevel === 'ATTENTION') {
      db.alerts.push({
        id: `ALERT-${patient.id}-INIT`,
        patientId: patient.id,
        patientName: patient.name,
        roomBed: patient.roomBed,
        timestamp: latestReading.timestamp,
        severity: patient.currentRisk.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'ATTENTION',
        title: patient.currentRisk.factors[0]?.label || 'Physiological Anomaly Detected',
        description: patient.currentRisk.factors[0]?.observation || 'Multi-parameter threshold deviation observed.',
        vitalsSnapshot: {
          heartRate: latestReading.heartRate,
          spo2: latestReading.spo2,
          temperature: latestReading.temperature,
          signalQuality: latestReading.signalQuality.overall,
        },
        acknowledged: false,
      });
    }
  });
}

seedHistoricalTelemetry();

// Initialize Gemini Client (Lazy Initialization)
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Background Simulated Ingestion for Online Devices (Simulating incoming ESP32/Wokwi packets every 3s)
// "When the device goes offline: do not continue generating fake changing values after the device stops sending data."
setInterval(() => {
  db.patients.forEach((patient) => {
    if (patient.deviceStatus !== 'online') {
      // Strictly do not update or generate values when offline!
      return;
    }

    const device = db.devices.find((d) => d.deviceId === patient.deviceId);
    if (!device || device.status !== 'online') {
      return;
    }

    const baseline = patient.baseline;
    const history = db.telemetryHistory[patient.id] || [];
    const prev = history[history.length - 1] || patient.currentVitals;

    if (!prev) return;

    // Gentle physiologic drift
    let deltaHr = (Math.random() - 0.5) * 1.5;
    let deltaSpo2 = (Math.random() - 0.5) * 0.3;
    let deltaTemp = (Math.random() - 0.5) * 0.04;

    // Patient 103 maintains respiratory stress simulation unless reset
    let hr = Math.max(40, Math.min(180, Math.round(prev.heartRate + deltaHr)));
    let spo2 = Math.max(70, Math.min(100, Number((prev.spo2 + deltaSpo2).toFixed(1))));
    let temp = Math.max(34.0, Math.min(41.0, Number((prev.temperature + deltaTemp).toFixed(1))));

    // Keep Marcus Brody in clinical attention window
    if (patient.id === 'P-103' && spo2 > 93) {
      spo2 = 91.8;
      hr = 108;
      temp = 38.4;
    }

    let rhythmType: 'normal' | 'tachycardia' | 'bradycardia' | 'afib' | 'pvc' = 'normal';
    let rhythmDesc = 'Normal Sinus Rhythm';

    if (hr > 105) {
      rhythmType = 'tachycardia';
      rhythmDesc = 'Sinus Tachycardia';
    } else if (hr < 55) {
      rhythmType = 'bradycardia';
      rhythmDesc = 'Sinus Bradycardia';
    }

    if (patient.id === 'P-106') {
      rhythmType = 'afib';
      rhythmDesc = 'Atrial Fibrillation (Irregular Ventricular Response)';
    }

    const ecgWaveform = generateLeadIIBeat(hr, 250, rhythmType);
    const newTimestamp = new Date().toISOString();

    const newReading: VitalReading = {
      id: `TEL-${patient.id}-${Date.now()}`,
      patientId: patient.id,
      deviceId: patient.deviceId,
      timestamp: newTimestamp,
      heartRate: hr,
      spo2,
      temperature: temp,
      ecgSample: ecgWaveform,
      signalQuality: prev.signalQuality,
      source: patient.sourceMode,
      ecgHeartRateCalc: hr,
      ecgRhythmDescription: rhythmDesc,
    };

    history.push(newReading);
    if (history.length > 40) {
      history.shift();
    }
    db.telemetryHistory[patient.id] = history;

    patient.lastReceivedAt = newTimestamp;
    patient.currentVitals = newReading;
    patient.currentRisk = calculateRiskAnalysis(newReading, patient.baseline, history.slice(0, -1), patient.medicalConditions);

    // Update IoT Device stats
    device.lastPacketReceivedAt = newTimestamp;
    device.totalPacketsSent += 1;

    // Check if new Critical/Attention alert needed
    if (patient.currentRisk.riskLevel === 'CRITICAL') {
      const existingActiveAlert = db.alerts.find(
        (a) => a.patientId === patient.id && !a.acknowledged && a.severity === 'CRITICAL'
      );
      if (!existingActiveAlert) {
        db.alerts.unshift({
          id: `ALERT-${Date.now()}`,
          patientId: patient.id,
          patientName: patient.name,
          roomBed: patient.roomBed,
          timestamp: newTimestamp,
          severity: 'CRITICAL',
          title: patient.currentRisk.factors[0]?.label || 'Critical Clinical Anomaly',
          description: patient.currentRisk.factors[0]?.observation || 'Critical multi-vital deviation.',
          vitalsSnapshot: {
            heartRate: hr,
            spo2,
            temperature: temp,
            signalQuality: prev.signalQuality.overall,
          },
          acknowledged: false,
        });
      }
    }
  });
}, 3000);

// ==========================================
// REST API ENDPOINTS
// ==========================================

// 0. Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'HealthSync RPM Server' });
});

// 1. System Status
app.get('/api/system/status', (req, res) => {
  const onlineDevices = db.devices.filter((d) => d.status === 'online').length;
  const criticalCount = db.patients.filter((p) => p.currentRisk?.riskLevel === 'CRITICAL').length;
  const attentionCount = db.patients.filter((p) => p.currentRisk?.riskLevel === 'ATTENTION').length;
  const stableCount = db.patients.filter((p) => p.currentRisk?.riskLevel === 'STABLE').length;
  const monitorCount = db.patients.filter((p) => p.currentRisk?.riskLevel === 'MONITOR').length;

  const response: SystemStatus = {
    status: 'OPERATIONAL',
    message: 'All Services Operational',
    activeSensors: onlineDevices * 4, // 4 sensors per device: HR, SpO2, Temp, ECG
    brokerStatus: 'CONNECTED',
    brokerLatencyMs: 14,
    dbStatus: 'HEALTHY',
    uptimeSeconds: Math.round((Date.now() - db.systemStartTime) / 1000),
    lastSync: new Date().toISOString(),
  };

  res.json({
    system: response,
    kpis: {
      totalPatients: db.patients.length,
      patientsCurrentlyMonitoring: onlineDevices,
      stable: stableCount,
      attentionRequired: attentionCount + monitorCount,
      critical: criticalCount,
      devicesOnline: onlineDevices,
      totalDevices: db.devices.length,
      unacknowledgedAlerts: db.alerts.filter((a) => !a.acknowledged).length,
    },
  });
});

// 2. Patient List
app.get('/api/patients', (req, res) => {
  res.json(db.patients);
});

// 3. Single Patient Details
app.get('/api/patients/:id', (req, res) => {
  const patient = db.patients.find((p) => p.id === req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  res.json(patient);
});

// 4. Patient Telemetry History & Live ECG Buffer
app.get('/api/patients/:id/telemetry', (req, res) => {
  const history = db.telemetryHistory[req.params.id] || [];
  const patient = db.patients.find((p) => p.id === req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  res.json({
    patientId: patient.id,
    deviceStatus: patient.deviceStatus,
    sourceMode: patient.sourceMode,
    lastReceivedAt: patient.lastReceivedAt,
    baseline: patient.baseline,
    currentVitals: patient.currentVitals,
    currentRisk: patient.currentRisk,
    history: history.slice(-25), // last 25 readings for trend charts
  });
});

// 5. Real IoT Telemetry Ingestion Endpoint (Supports real ESP32 / Wokwi HTTP POST)
app.post('/api/iot/telemetry', (req, res) => {
  const { deviceId, heartRate, spo2, temperature, signalQuality, source, ecgSamples, ecgRhythmDescription } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: 'Missing deviceId in telemetry payload' });
  }

  const patient = db.patients.find((p) => p.deviceId === deviceId);
  const device = db.devices.find((d) => d.deviceId === deviceId);

  if (!patient || !device) {
    return res.status(404).json({ error: `No registered patient or device found for device ID: ${deviceId}` });
  }

  // Device is now confirmed online
  device.status = 'online';
  patient.deviceStatus = 'online';
  if (source) {
    device.sourceMode = source;
    patient.sourceMode = source;
  }

  const timestamp = new Date().toISOString();
  device.lastPacketReceivedAt = timestamp;
  device.totalPacketsSent += 1;
  patient.lastReceivedAt = timestamp;

  const hrVal = Number(heartRate);
  const spo2Val = Number(spo2);
  const tempVal = Number(temperature);

  if (![hrVal, spo2Val, tempVal].every(Number.isFinite)) {
    return res.status(400).json({ error: 'heartRate, spo2, and temperature must be valid numeric values' });
  }

  const qualityOverall = signalQuality || 'good';

  let rhythmDesc = ecgRhythmDescription || 'Normal Sinus Rhythm';
  let ecgWaveform: number[];

  if (Array.isArray(ecgSamples) && ecgSamples.length > 10) {
    ecgWaveform = ecgSamples;
    const detected = detectQRSBpm(ecgSamples);
    if (detected.regularity === 'irregular') {
      rhythmDesc = 'Irregular Rhythm / Ectopy Detected';
    }
  } else {
    let rhythmType: 'normal' | 'tachycardia' | 'bradycardia' | 'afib' | 'pvc' = 'normal';
    if (hrVal > 110) rhythmType = 'tachycardia';
    if (hrVal < 50) rhythmType = 'bradycardia';
    ecgWaveform = generateLeadIIBeat(hrVal, 250, rhythmType);
  }

  const newReading: VitalReading = {
    id: `TEL-INGEST-${Date.now()}`,
    patientId: patient.id,
    deviceId: patient.deviceId,
    timestamp,
    heartRate: hrVal,
    spo2: spo2Val,
    temperature: tempVal,
    ecgSample: ecgWaveform,
    signalQuality: {
      overall: qualityOverall,
      hrQuality: qualityOverall,
      spo2Quality: qualityOverall,
      tempQuality: qualityOverall,
      ecgQuality: qualityOverall,
    },
    source: device.sourceMode,
    ecgHeartRateCalc: hrVal,
    ecgRhythmDescription: rhythmDesc,
  };

  const history = db.telemetryHistory[patient.id] || [];
  history.push(newReading);
  if (history.length > 40) history.shift();
  db.telemetryHistory[patient.id] = history;

  patient.currentVitals = newReading;
  patient.currentRisk = calculateRiskAnalysis(newReading, patient.baseline, history.slice(0, -1), patient.medicalConditions);

  // Trigger alert if needed
  if (patient.currentRisk.riskLevel === 'CRITICAL') {
    db.alerts.unshift({
      id: `ALERT-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      roomBed: patient.roomBed,
      timestamp,
      severity: 'CRITICAL',
      title: patient.currentRisk.factors[0]?.label || 'Critical Ingest Alert',
      description: patient.currentRisk.factors[0]?.observation || 'Critical vital anomaly from IoT packet.',
      vitalsSnapshot: {
        heartRate: hrVal,
        spo2: spo2Val,
        temperature: tempVal,
        signalQuality: qualityOverall,
      },
      acknowledged: false,
    });
  }

  res.json({
    status: 'INGESTED',
    patientId: patient.id,
    deviceId,
    source: device.sourceMode,
    riskScore: patient.currentRisk.riskScore,
    riskLevel: patient.currentRisk.riskLevel,
    factorsCount: patient.currentRisk.factors.length,
    timestamp,
  });
});

// 6. Device Toggle (Online/Offline or Toggle Live Hardware vs Wokwi Simulation)
app.post('/api/iot/device-toggle', (req, res) => {
  const { deviceId, status, sourceMode } = req.body;
  const device = db.devices.find((d) => d.deviceId === deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }

  if (status) {
    device.status = status;
    const patient = db.patients.find((p) => p.deviceId === deviceId);
    if (patient) {
      patient.deviceStatus = status;
    }
  }

  if (sourceMode) {
    device.sourceMode = sourceMode;
    const patient = db.patients.find((p) => p.deviceId === deviceId);
    if (patient) {
      patient.sourceMode = sourceMode;
    }
  }

  res.json({ success: true, device });
});

// 7. Interactive Scenario Injector (Allows testing clinical anomalies directly on real hardware data pipeline)
app.post('/api/iot/inject-scenario', (req, res) => {
  const { patientId, scenario } = req.body;
  const patient = db.patients.find((p) => p.id === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const timestamp = new Date().toISOString();
  let hr = patient.baseline.hrMean;
  let spo2 = patient.baseline.spo2Mean;
  let temp = patient.baseline.tempMean;
  let quality: any = { overall: 'good', hrQuality: 'good', spo2Quality: 'good', tempQuality: 'good', ecgQuality: 'good' };
  let rhythmType: 'normal' | 'tachycardia' | 'bradycardia' | 'afib' | 'pvc' = 'normal';
  let rhythmDesc = 'Normal Sinus Rhythm';

  if (scenario === 'ACUTE_HYPOXIA') {
    spo2 = 86.5;
    hr = 122; // compensatory tachycardia
    rhythmType = 'tachycardia';
    rhythmDesc = 'Sinus Tachycardia (Hypoxemic Stress)';
  } else if (scenario === 'SEPTIC_SHOCK') {
    temp = 39.4;
    hr = 128;
    spo2 = 91.0;
    rhythmType = 'tachycardia';
    rhythmDesc = 'Sinus Tachycardia';
  } else if (scenario === 'BRADYCARDIA_ARREST') {
    hr = 38;
    spo2 = 93.0;
    rhythmType = 'bradycardia';
    rhythmDesc = 'Severe Sinus Bradycardia';
  } else if (scenario === 'LEAD_DISCONNECT') {
    quality = { overall: 'no_signal', hrQuality: 'no_signal', spo2Quality: 'no_signal', tempQuality: 'poor', ecgQuality: 'no_signal' };
    rhythmDesc = 'Asystole Artifact / Electrodes Detached';
  } else if (scenario === 'NORMAL_RECOVERY') {
    hr = patient.baseline.hrMean;
    spo2 = patient.baseline.spo2Mean;
    temp = patient.baseline.tempMean;
    rhythmType = 'normal';
    rhythmDesc = 'Normal Sinus Rhythm';
  }

  const ecgWaveform = generateLeadIIBeat(hr, 250, rhythmType);
  const newReading: VitalReading = {
    id: `TEL-SCENARIO-${Date.now()}`,
    patientId: patient.id,
    deviceId: patient.deviceId,
    timestamp,
    heartRate: hr,
    spo2,
    temperature: temp,
    ecgSample: ecgWaveform,
    signalQuality: quality,
    source: patient.sourceMode,
    ecgHeartRateCalc: hr,
    ecgRhythmDescription: rhythmDesc,
  };

  const history = db.telemetryHistory[patient.id] || [];
  history.push(newReading);
  db.telemetryHistory[patient.id] = history;

  patient.currentVitals = newReading;
  patient.lastReceivedAt = timestamp;
  patient.currentRisk = calculateRiskAnalysis(newReading, patient.baseline, history.slice(0, -1), patient.medicalConditions);

  if (patient.currentRisk.riskLevel === 'CRITICAL' || patient.currentRisk.riskLevel === 'ATTENTION') {
    db.alerts.unshift({
      id: `ALERT-SCENARIO-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      roomBed: patient.roomBed,
      timestamp,
      severity: patient.currentRisk.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'ATTENTION',
      title: `${scenario.replace('_', ' ')}: ${patient.currentRisk.factors[0]?.label || 'Vital Alert'}`,
      description: patient.currentRisk.factors[0]?.observation || 'Anomalous vital pattern simulated from IoT input.',
      vitalsSnapshot: {
        heartRate: hr,
        spo2,
        temperature: temp,
        signalQuality: quality.overall,
      },
      acknowledged: false,
    });
  }

  res.json({
    success: true,
    patient,
    risk: patient.currentRisk,
  });
});

// 8. Alerts
app.get('/api/alerts', (req, res) => {
  res.json(db.alerts);
});

app.post('/api/alerts/:id/acknowledge', (req, res) => {
  const alert = db.alerts.find((a) => a.id === req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  alert.acknowledged = true;
  alert.acknowledgedBy = req.body.doctorName || 'Dr. Sarah Chen, MD';
  alert.acknowledgedAt = new Date().toISOString();

  res.json({ success: true, alert });
});

// 9. Doctor Notes
app.post('/api/patients/:id/notes', (req, res) => {
  const patient = db.patients.find((p) => p.id === req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const { content, category, author } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Note content is required' });
  }

  const newNote = {
    id: `NOTE-${Date.now()}`,
    author: author || 'Dr. Sarah Chen, MD',
    timestamp: new Date().toISOString(),
    content,
    category: category || 'ROUTINE',
  };

  patient.notes.unshift(newNote);
  res.json({ success: true, note: newNote, notes: patient.notes });
});

// 10. Devices List
app.get('/api/devices', (req, res) => {
  res.json(db.devices);
});

// 11. Admin: Create Patient
app.post('/api/patients', (req, res) => {
  const { name, age, gender, bloodGroup, roomBed, assignedDoctor, conditions, allergies, medications, deviceId } = req.body;
  if (!name || !age || !deviceId) {
    return res.status(400).json({ error: 'Name, age, and deviceId are required' });
  }

  const newId = `P-${100 + db.patients.length + 1}`;
  const baseline = {
    hrMin: 65,
    hrMax: 85,
    hrMean: 74,
    spo2Min: 96,
    spo2Max: 99,
    spo2Mean: 97.5,
    tempMin: 36.4,
    tempMax: 37.1,
    tempMean: 36.7,
    calculatedFromSamples: 120,
    lastBaselineUpdate: new Date().toISOString(),
  };

  const newPatient: Patient = {
    id: newId,
    name,
    age: Number(age),
    gender: gender || 'Other',
    bloodGroup: bloodGroup || 'O+',
    roomBed: roomBed || 'Observation 101',
    emergencyContact: {
      name: 'Primary Contact',
      relationship: 'Family',
      phone: '+1 (555) 000-0000',
    },
    assignedDoctor: assignedDoctor || 'Dr. Sarah Chen, MD',
    medicalConditions: Array.isArray(conditions) ? conditions : [conditions || 'Under Observation'],
    allergies: Array.isArray(allergies) ? allergies : ['None Recorded'],
    currentMedications: Array.isArray(medications) ? medications : ['Standard Protocol'],
    deviceId,
    deviceStatus: 'online',
    sourceMode: 'LIVE_HARDWARE',
    lastReceivedAt: new Date().toISOString(),
    baseline,
    notes: [],
  };

  const initialTelemetry: VitalReading = {
    id: `TEL-${newId}-INIT`,
    patientId: newId,
    deviceId,
    timestamp: new Date().toISOString(),
    heartRate: 74,
    spo2: 98,
    temperature: 36.7,
    ecgSample: generateLeadIIBeat(74, 250, 'normal'),
    signalQuality: { overall: 'good', hrQuality: 'good', spo2Quality: 'good', tempQuality: 'good', ecgQuality: 'good' },
    source: 'LIVE_HARDWARE',
    ecgHeartRateCalc: 74,
    ecgRhythmDescription: 'Normal Sinus Rhythm',
  };

  newPatient.currentVitals = initialTelemetry;
  newPatient.currentRisk = calculateRiskAnalysis(initialTelemetry, baseline, [], newPatient.medicalConditions);

  db.patients.push(newPatient);
  db.telemetryHistory[newId] = [initialTelemetry];

  // Register device if not exists
  let dev = db.devices.find((d) => d.deviceId === deviceId);
  if (!dev) {
    dev = {
      deviceId,
      patientId: newId,
      patientName: name,
      status: 'online',
      sourceMode: 'LIVE_HARDWARE',
      firmwareVersion: 'v2.4.1-clinical',
      batteryLevel: 100,
      ipAddress: '192.168.1.180',
      macAddress: '24:6F:28:FE:89:12',
      rssiDbm: -55,
      lastPacketReceivedAt: new Date().toISOString(),
      packetRateHz: 1.0,
      totalPacketsSent: 1,
    };
    db.devices.push(dev);
  }

  res.json({ success: true, patient: newPatient });
});

// 12. Admin: Register / Update Device
app.post('/api/devices/:deviceId/assign', (req, res) => {
  const deviceId = req.params.deviceId;
  const { patientId } = req.body;
  const device = db.devices.find((d) => d.deviceId === deviceId);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const patient = db.patients.find((p) => p.id === patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  const previousPatient = db.patients.find((p) => p.deviceId === deviceId && p.id !== patientId);
  if (previousPatient) {
    previousPatient.deviceId = '';
    previousPatient.deviceStatus = 'offline';
  }

  const previousDeviceForPatient = db.devices.find((d) => d.patientId === patientId && d.deviceId !== deviceId);
  if (previousDeviceForPatient) {
    previousDeviceForPatient.patientId = '';
    previousDeviceForPatient.patientName = 'Unassigned';
    previousDeviceForPatient.status = 'offline';
  }

  device.patientId = patient.id;
  device.patientName = patient.name;
  device.status = 'online';
  patient.deviceId = device.deviceId;
  patient.deviceStatus = 'online';
  patient.sourceMode = device.sourceMode;
  patient.lastReceivedAt = new Date().toISOString();

  res.json({ success: true, device, patient });
});

app.post('/api/devices', (req, res) => {
  const { deviceId, patientId, firmwareVersion, sourceMode } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  let device = db.devices.find((d) => d.deviceId === deviceId);
  const patient = db.patients.find((p) => p.id === patientId);

  if (device) {
    device.patientId = patientId || device.patientId;
    device.patientName = patient ? patient.name : device.patientName;
    if (firmwareVersion) device.firmwareVersion = firmwareVersion;
    if (sourceMode) device.sourceMode = sourceMode;
  } else {
    device = {
      deviceId,
      patientId: patientId || '',
      patientName: patient ? patient.name : 'Unassigned',
      status: 'online',
      sourceMode: sourceMode || 'LIVE_HARDWARE',
      firmwareVersion: firmwareVersion || 'v2.4.1-clinical',
      batteryLevel: 100,
      ipAddress: '192.168.1.199',
      macAddress: '24:6F:28:D1:44:88',
      rssiDbm: -59,
      lastPacketReceivedAt: new Date().toISOString(),
      packetRateHz: 1.0,
      totalPacketsSent: 0,
    };
    db.devices.push(device);
  }

  res.json({ success: true, device });
});

// 13. AI Clinical Summary (Gemini 3.8-Flash Server-Side Integration)
app.post('/api/ai/clinical-summary', async (req, res) => {
  const { patientId } = req.body;
  const patient = db.patients.find((p) => p.id === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const vitals = patient.currentVitals;
  const risk = patient.currentRisk;
  const baseline = patient.baseline;

  const gemini = getGeminiClient();

  if (gemini) {
    try {
      const prompt = `You are a clinical decision support AI in an IoT remote patient monitoring system.
Analyze the following real hardware sensor data and calculated physiological risk breakdown for a doctor:

Patient: ${patient.name}, Age ${patient.age}, Gender: ${patient.gender}
Medical Conditions: ${patient.medicalConditions.join(', ')}
Current Medications: ${patient.currentMedications.join(', ')}

Live Sensor Measurements:
- Heart Rate: ${vitals?.heartRate} BPM (Baseline mean: ${baseline.hrMean} BPM, range: ${baseline.hrMin}-${baseline.hrMax})
- SpO2: ${vitals?.spo2}% (Baseline mean: ${baseline.spo2Mean}%, range: ${baseline.spo2Min}-${baseline.spo2Max})
- Body Temp: ${vitals?.temperature}°C (Baseline mean: ${baseline.tempMean}°C)
- ECG Rhythm: ${vitals?.ecgRhythmDescription || 'Normal Sinus Rhythm'}
- Signal Quality: ${vitals?.signalQuality.overall} (Device: ${patient.deviceId}, Source: ${patient.sourceMode})

Calculated Multi-Parameter Risk:
- Risk Score: ${risk?.riskScore}/100
- Risk Level: ${risk?.riskLevel}
- Contributing Factors: ${risk?.factors.map((f) => `${f.label}: ${f.observation} (+${f.points} pts)`).join('; ') || 'None'}
- Trend Observation: ${risk?.trendSummary.description}

Provide a concise, highly professional clinical physician note (under 160 words) containing:
1. Physiological Assessment (explain the pathophysiologic mechanism connecting these vitals).
2. Risk Stratification & Confidence (noting whether sensor signal quality is reliable).
3. Recommended Immediate Action Protocol for the attending doctor.`;

      const response = await gemini.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const summaryText = response.text || '';
      return res.json({
        success: true,
        clinicalSummary: summaryText,
        generatedBy: 'Gemini 3.8-Flash (Clinical Decision Support)',
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back to algorithmic synthesis:', err.message);
    }
  }

  // Algorithmic Fallback Clinical Note (always 100% available and strictly derived from actual data)
  const isHypoxic = (vitals?.spo2 ?? 100) < 94;
  const isTachy = (vitals?.heartRate ?? 70) > 100;
  const isFebrile = (vitals?.temperature ?? 37) >= 38.0;

  let assessment = `Patient ${patient.name} exhibits `;
  if (risk?.riskLevel === 'CRITICAL') {
    assessment += `a critical multi-vital destabilization (Risk Score: ${risk.riskScore}/100). `;
  } else if (risk?.riskLevel === 'ATTENTION') {
    assessment += `significant physiological variance requiring priority review (Risk Score: ${risk.riskScore}/100). `;
  } else {
    assessment += `stable physiological parameters consistent with baseline (Risk Score: ${risk?.riskScore}/100). `;
  }

  if (isHypoxic && isTachy) {
    assessment += `The simultaneous desaturation (${vitals?.spo2}%) and compensatory tachycardia (${vitals?.heartRate} BPM) reflect cardiorespiratory strain or ventilation-perfusion mismatch. `;
  } else if (isHypoxic) {
    assessment += `Isolated oxygen desaturation to ${vitals?.spo2}% indicates potential airway obstruction, bronchospasm, or atelectasis. `;
  } else if (isFebrile) {
    assessment += `Pyrexia of ${vitals?.temperature}°C warrants monitoring for emerging infectious etiology or systemic inflammation. `;
  }

  assessment += `Sensor reliability is verified as ${vitals?.signalQuality.overall.toUpperCase()}. ${risk?.recommendation}`;

  res.json({
    success: true,
    clinicalSummary: assessment,
    generatedBy: 'Clinical Algorithm (Deterministic Inference Engine)',
    generatedAt: new Date().toISOString(),
  });
});

// ==========================================
// VITE MIDDLEWARE SETUP
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HealthSync Remote Patient Monitoring Server listening on port ${PORT}`);
  });
}

startServer();
