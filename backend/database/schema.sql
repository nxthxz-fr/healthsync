-- ========================================================
-- HEALTHSYNC DATABASE SCHEMA (SQLite)
-- IoT Remote Patient Monitoring Platform
-- ========================================================

CREATE TABLE IF NOT EXISTS PATIENTS (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patientId TEXT UNIQUE NOT NULL,
  fullName TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  emergencyContactName TEXT,
  emergencyContactPhone TEXT,
  bloodGroup TEXT,
  medicalNotes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS DEVICES (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deviceId TEXT UNIQUE NOT NULL,
  patientId TEXT,
  deviceName TEXT,
  connectionStatus TEXT DEFAULT 'OFFLINE',
  lastSeen TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS TELEMETRY (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deviceId TEXT NOT NULL,
  patientId TEXT NOT NULL,
  heartRate REAL,
  spo2 REAL NOT NULL,
  temperature REAL NOT NULL,
  ecg REAL,
  ecgMode TEXT NOT NULL DEFAULT 'SIMULATED', -- 'SIMULATED' | 'REAL'
  dataMode TEXT NOT NULL DEFAULT 'DEMO',     -- 'DEMO' | 'HARDWARE'
  status TEXT NOT NULL DEFAULT 'STABLE',     -- 'STABLE' | 'ATTENTION' | 'CRITICAL' | 'MONITOR'
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ALERTS (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patientId TEXT NOT NULL,
  deviceId TEXT,
  type TEXT NOT NULL,                        -- e.g. 'HIGH HEART RATE', 'LOW SpO2', 'HIGH TEMPERATURE'
  severity TEXT NOT NULL,                    -- 'ATTENTION' | 'CRITICAL'
  message TEXT NOT NULL,
  value REAL,
  acknowledged INTEGER DEFAULT 0,            -- 0 = unacknowledged, 1 = acknowledged
  timestamp TEXT NOT NULL
);

-- Indices for rapid real-time queries
CREATE INDEX IF NOT EXISTS idx_telemetry_patient_time ON TELEMETRY (patientId, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON TELEMETRY (deviceId, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_patient_time ON ALERTS (patientId, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_ack ON ALERTS (acknowledged);
CREATE INDEX IF NOT EXISTS idx_devices_patient ON DEVICES (patientId);
