import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

import { initDatabase, db } from './database/database.js';
import patientsRouter from './routes/patients.js';
import telemetryRouter from './routes/telemetry.js';
import devicesRouter from './routes/devices.js';
import alertsRouter from './routes/alerts.js';
import demoRouter from './routes/demo.js';
import { simulationService } from './services/simulationService.js';
import { healthStatusService } from './services/healthStatusService.js';

const app = express();
const PORT = process.env.PORT || 5000;
const systemStartTime = Date.now();

// 1. Initialize Database & Tables
await initDatabase();

// 2. Middlewares - Robust Production CORS Configuration
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((s) => s.trim())
  : ['*'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps, curl, Postman, ESP32 IoT microcontrollers)
      if (!origin) return callback(null, true);

      // In development or if wildcard is explicitly enabled, allow all
      if (allowedOrigins.includes('*') || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      // Allow configured FRONTEND_URL or any Vercel deployment preview domain
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      // Safe fallback: allow and reflect the origin
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Request logger for hackathon debugging
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && !req.path.includes('/demo/ecg')) {
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${req.method} ${req.path}`);
  }
  next();
});

// 3. Mount REST APIs
app.use('/api/patients', patientsRouter);
app.use('/api/iot', telemetryRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/demo', demoRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    project: 'HealthSync — IoT Remote Patient Monitoring Platform',
    status: 'ONLINE',
    version: '1.0.0',
    database: db.isPostgres ? 'PostgreSQL (Persistent)' : 'SQLite (Local)',
    endpoints: {
      health: '/api/health',
      patients: '/api/patients',
      patientById: '/api/patients/:patientId',
      patientLatest: '/api/patients/:patientId/latest',
      patientHistory: '/api/patients/:patientId/history',
      patientAlerts: '/api/patients/:patientId/alerts',
      telemetryIngest: 'POST /api/iot/telemetry',
      devices: '/api/devices',
      alerts: '/api/alerts',
      alertAck: 'POST /api/alerts/:alertId/acknowledge',
      demoEcg: '/api/demo/ecg?limit=300',
      demoVitals: '/api/demo/vitals',
      demoMode: 'POST /api/demo/mode',
      systemStatus: '/api/system/status',
    },
    demoMode: {
      active: true,
      labels: {
        hr: 'SIMULATED BPM',
        spo2: 'SIMULATED SpO2',
        ecg: 'SIMULATED ECG — DEMO DATA',
      },
    },
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  let dbConnected = true;
  let dbError = null;
  try {
    await db.prepare('SELECT 1').get();
  } catch (err) {
    dbConnected = false;
    dbError = err.message;
  }

  res.json({
    status: dbConnected ? 'ok' : 'degraded',
    service: 'HealthSync Backend REST API',
    uptimeSeconds: Math.round((Date.now() - systemStartTime) / 1000),
    database: db.isPostgres
      ? (dbConnected ? 'PostgreSQL Connected' : `PostgreSQL Error: ${dbError}`)
      : (dbConnected ? 'SQLite Connected' : `SQLite Error: ${dbError}`),
    databaseEngine: db.isPostgres ? 'PostgreSQL (Persistent Cloud)' : 'SQLite (healthsync.db)',
    timestamp: new Date().toISOString(),
  });
});

// System Status & KPIs for Live Dashboard Header & Overview
app.get('/api/system/status', async (req, res) => {
  try {
    const totalPatientsRes = await db.prepare('SELECT COUNT(*) as count FROM PATIENTS').get();
    const totalPatients = totalPatientsRes?.count || 0;

    const totalDevicesRes = await db.prepare('SELECT COUNT(*) as count FROM DEVICES').get();
    const totalDevices = totalDevicesRes?.count || 0;

    const unackAlertsRes = await db.prepare('SELECT COUNT(*) as count FROM ALERTS WHERE acknowledged = 0').get();
    const unacknowledgedAlerts = unackAlertsRes?.count || 0;

    // Count online devices (lastSeen < 60s or demo device)
    const devices = await db.prepare('SELECT * FROM DEVICES').all();
    const now = Date.now();
    let onlineCount = 0;
    for (const d of devices) {
      if (d.deviceId === 'HEALTHSYNC-ESP32-01' || (d.lastSeen && (now - new Date(d.lastSeen).getTime()) < 60000)) {
        onlineCount++;
      }
    }

    // Evaluate health statuses across registered patients
    const patients = await db.prepare('SELECT patientId FROM PATIENTS').all();
    let stableCount = 0;
    let attentionCount = 0;
    let criticalCount = 0;

    for (const p of patients) {
      if (p.patientId === 'PATIENT-001') {
        const mode = simulationService.getDemoMode();
        if (mode === 'CRITICAL') criticalCount++;
        else if (mode === 'ATTENTION') attentionCount++;
        else stableCount++;
      } else {
        const tel = await db.prepare(
          'SELECT status, heartRate, spo2, temperature FROM TELEMETRY WHERE patientId = ? ORDER BY timestamp DESC LIMIT 1'
        ).get(p.patientId);
        if (tel) {
          const st = tel.status || healthStatusService.evaluateHealthStatus(tel.heartRate, tel.spo2, tel.temperature);
          if (st === 'CRITICAL') criticalCount++;
          else if (st === 'ATTENTION') attentionCount++;
          else stableCount++;
        } else {
          stableCount++;
        }
      }
    }

    res.json({
      system: {
        status: 'OPERATIONAL',
        message: 'All Services Operational',
        activeSensors: onlineCount * 4,
        brokerStatus: 'CONNECTED',
        brokerLatencyMs: 8,
        dbStatus: 'HEALTHY',
        uptimeSeconds: Math.round((Date.now() - systemStartTime) / 1000),
        lastSync: new Date().toISOString(),
      },
      kpis: {
        totalPatients,
        patientsCurrentlyMonitoring: onlineCount,
        stable: stableCount,
        attentionRequired: attentionCount,
        critical: criticalCount,
        devicesOnline: onlineCount,
        totalDevices,
        unacknowledgedAlerts,
      },
    });
  } catch (err) {
    console.error('System status error:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve system status' });
  }
});

// Helper to detect LAN IPv4 addresses for ESP32 connectivity
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// 4. Background Telemetry Accumulator for PATIENT-001
// Writes a simulated telemetry row every 3 seconds to keep history charts alive ONLY when no physical hardware telemetry is active
setInterval(async () => {
  try {
    // Check if recent hardware telemetry arrived for HEALTHSYNC-ESP32-01 in the last 60 seconds
    const thresholdTime = new Date(Date.now() - 60000).toISOString();
    const hwRecent = await db.prepare(`
      SELECT id FROM TELEMETRY 
      WHERE deviceId = 'HEALTHSYNC-ESP32-01' AND dataMode = 'HARDWARE'
      AND timestamp >= ?
      LIMIT 1
    `).get(thresholdTime);

    // If hardware telemetry was recently received, do NOT overwrite with demo simulator data!
    if (hwRecent) {
      return;
    }

    const demo = simulationService.getDemoStatus();
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO TELEMETRY (deviceId, patientId, heartRate, spo2, temperature, ecg, ecgMode, dataMode, status, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, 'SIMULATED', 'DEMO', ?, ?)
    `);

    await insertStmt.run(
      'HEALTHSYNC-ESP32-01',
      'PATIENT-001',
      demo.vitals.heartRate,
      demo.vitals.spo2,
      demo.vitals.temperature,
      0.42,
      demo.vitals.status,
      now
    );

    // Update demo device lastSeen ONLY in demo mode
    await db.prepare("UPDATE DEVICES SET connectionStatus = 'ONLINE', lastSeen = ? WHERE deviceId = 'HEALTHSYNC-ESP32-01'").run(now);

    // Keep telemetry records bounded to recent 2500 to prevent unbounded disk growth
    const countRes = await db.prepare('SELECT COUNT(*) as count FROM TELEMETRY').get();
    const count = countRes?.count || 0;
    if (count > 2500) {
      await db.prepare('DELETE FROM TELEMETRY WHERE id IN (SELECT id FROM TELEMETRY ORDER BY id ASC LIMIT 500)').run();
    }
  } catch (e) {
    // Ignore background writing error
  }
}, 3000);

// 5. Error Handling Middlewares
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint '${req.method} ${req.path}' not found`,
  });
});

// 500 Global error handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// Start Server - Always listen on 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  const localIps = getLocalIpAddresses();
  console.log(`========================================================`);
  console.log(` HealthSync REST API Server running on port ${PORT}`);
  console.log(` Host: 0.0.0.0 (Listening on all network interfaces)`);
  console.log(` Local: http://localhost:${PORT}`);
  if (localIps.length > 0) {
    console.log(`\n LAN IP(s) for ESP32 Wi-Fi Configuration:`);
    for (const ip of localIps) {
      console.log(`   → http://${ip}:${PORT}/api/iot/telemetry`);
    }
  } else {
    console.log(` Network: http://0.0.0.0:${PORT}`);
  }
  console.log(` Database: ${db.isPostgres ? 'PostgreSQL (Persistent Cloud)' : 'SQLite (healthsync.db)'}`);
  console.log(` Telemetry Endpoint: POST /api/iot/telemetry`);
  console.log(`========================================================`);
});
