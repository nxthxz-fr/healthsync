export type SignalQuality = 'good' | 'fair' | 'poor' | 'no_signal';
export type DataSource = 'LIVE_HARDWARE' | 'WOKWI_SIMULATION' | 'DEMO';
export type RiskLevel = 'STABLE' | 'MONITOR' | 'ATTENTION' | 'CRITICAL';
export type UserRole = 'DOCTOR' | 'ADMIN';

export interface VitalReading {
  id: string;
  patientId: string;
  deviceId: string;
  timestamp: string; // ISO string
  heartRate: number | null; // BPM (null when no finger detected)
  spo2: number; // %
  temperature: number; // °C
  ecgSample: number[]; // Array of mV values for waveform
  signalQuality: {
    overall: SignalQuality;
    hrQuality: SignalQuality;
    spo2Quality: SignalQuality;
    tempQuality: SignalQuality;
    ecgQuality: SignalQuality;
  };
  source: DataSource;
  ecgHeartRateCalc?: number;
  ecgRhythmDescription?: string;
  noiseDetected?: boolean;
}

export interface PatientBaseline {
  hrMin: number;
  hrMax: number;
  hrMean: number;
  spo2Min: number;
  spo2Max: number;
  spo2Mean: number;
  tempMin: number;
  tempMax: number;
  tempMean: number;
  calculatedFromSamples: number;
  lastBaselineUpdate: string;
}

export interface RiskFactorContribution {
  parameter: 'HEART_RATE' | 'SPO2' | 'TEMPERATURE' | 'ECG' | 'TREND' | 'MULTI_PARAM' | 'SIGNAL_QUALITY';
  label: string;
  points: number; // 0 to 40 contribution
  severity: 'normal' | 'minor' | 'moderate' | 'severe';
  observation: string;
  deviationText?: string;
}

export interface RiskAnalysisResult {
  riskScore: number; // 0 to 100
  riskLevel: RiskLevel;
  calculatedAt: string;
  isReliable: boolean;
  reliabilityWarning?: string;
  factors: RiskFactorContribution[];
  trendSummary: {
    hrTrend: 'STABLE' | 'RISING' | 'FALLING' | 'RAPID_CLIMB' | 'SEVERE_DROP';
    spo2Trend: 'STABLE' | 'DECLINING' | 'RAPID_DESATURATION' | 'IMPROVING';
    tempTrend: 'STABLE' | 'FEBRILE_SPIKE' | 'HYPOTHERMIC_DROP';
    description: string;
  };
  recommendation: string;
  clinicalContext?: {
    level: 'LOWER' | 'ELEVATED' | 'HIGH';
    conditions: string[];
    note: string;
  };
}

export interface DoctorNote {
  id: string;
  author: string;
  timestamp: string;
  content: string;
  category: 'ROUTINE' | 'EMERGENCY' | 'MEDICATION_CHANGE' | 'OBSERVATION';
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  roomBed: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  assignedDoctor: string;
  medicalConditions: string[];
  allergies: string[];
  currentMedications: string[];
  deviceId: string;
  deviceStatus: 'online' | 'offline';
  sourceMode: DataSource;
  lastReceivedAt: string; // ISO string
  baseline: PatientBaseline;
  currentVitals?: VitalReading;
  currentRisk?: RiskAnalysisResult;
  notes: DoctorNote[];
}

export interface EmergencyAlert {
  id: string;
  patientId: string;
  patientName: string;
  roomBed: string;
  timestamp: string;
  severity: 'CRITICAL' | 'ATTENTION' | 'MONITOR';
  title: string;
  description: string;
  vitalsSnapshot: {
    heartRate: number;
    spo2: number;
    temperature: number;
    signalQuality: SignalQuality;
  };
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface IoTDevice {
  deviceId: string;
  patientId: string;
  patientName: string;
  status: 'online' | 'offline';
  sourceMode: DataSource;
  sourceLabel?: string;
  isSimulated?: boolean;
  firmwareVersion: string;
  batteryLevel: number; // percentage
  batteryLabel?: string;
  ipAddress: string;
  macAddress: string;
  rssiDbm: number; // e.g. -62 dBm
  rssiLabel?: string;
  lastPacketReceivedAt: string;
  packetRateHz: number;
  packetRateLabel?: string;
  totalPacketsSent: number;
}

export interface SystemStatus {
  status: 'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE';
  message: string;
  activeSensors: number;
  brokerStatus: 'CONNECTED' | 'DISCONNECTED';
  brokerLatencyMs: number;
  dbStatus: 'HEALTHY' | 'SYNCING';
  uptimeSeconds: number;
  lastSync: string;
}
