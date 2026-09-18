import { Router } from 'express';
import { db } from '../database/database.js';
import { healthStatusService } from '../services/healthStatusService.js';

const router = Router();

/**
 * POST /api/iot/telemetry
 * Ingest telemetry packets from real ESP32 or simulation agent.
 */
router.post('/telemetry', async (req, res) => {
  try {
    const {
      deviceId,
      patientId: incomingPatientId,
      heartRate,
      spo2,
      temperature,
      ecg,
      ecgMode,
      dataMode,
      status: incomingStatus,
      timestamp,
    } = req.body;

    // 1. Validate deviceId (required, non-empty string)
    if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
      return res.status(400).json({ success: false, error: 'Missing or invalid required field: deviceId' });
    }

    // 2. Validate patientId
    let patientId = incomingPatientId;
    if (patientId !== undefined && patientId !== null && typeof patientId !== 'string') {
      return res.status(400).json({ success: false, error: 'patientId must be a string' });
    }
    if (!patientId) {
      const devRow = await db.prepare('SELECT patientId FROM DEVICES WHERE deviceId = ?').get(deviceId);
      patientId = devRow?.patientId || 'PATIENT-001';
    }

    // 3. Validate heartRate: allow null/undefined if sensor has no reading, or a finite number
    let hr = null;
    if (heartRate !== null && heartRate !== undefined && heartRate !== '') {
      const parsedHr = Number(heartRate);
      if (!Number.isFinite(parsedHr) || parsedHr < 0 || parsedHr > 300) {
        return res.status(400).json({
          success: false,
          error: 'heartRate must be a valid number between 0 and 300 or null when sensor is unseated',
        });
      }
      hr = parsedHr;
    }

    // 4. Validate temperature (required, finite number)
    if (temperature === null || temperature === undefined || temperature === '') {
      return res.status(400).json({ success: false, error: 'Missing required field: temperature' });
    }
    const temp = Number(temperature);
    if (!Number.isFinite(temp) || temp < 0 || temp > 100) {
      return res.status(400).json({ success: false, error: 'temperature must be a valid number between 0 and 100' });
    }

    // 5. Validate spo2 (required, finite number)
    if (spo2 === null || spo2 === undefined || spo2 === '') {
      return res.status(400).json({ success: false, error: 'Missing required field: spo2' });
    }
    const o2 = Number(spo2);
    if (!Number.isFinite(o2) || o2 < 0 || o2 > 100) {
      return res.status(400).json({ success: false, error: 'spo2 must be a valid number between 0 and 100' });
    }

    // 6. Validate ecg (optional number or null)
    let ecgVal = null;
    if (ecg !== null && ecg !== undefined && ecg !== '') {
      const parsedEcg = Number(ecg);
      if (!Number.isFinite(parsedEcg)) {
        return res.status(400).json({ success: false, error: 'ecg must be a valid number or null' });
      }
      ecgVal = parsedEcg;
    }

    // 7. Validate timestamp (optional, but if provided must be a valid date)
    let chosenTimestamp = new Date().toISOString();
    if (timestamp) {
      const parsedTime = new Date(timestamp).getTime();
      if (Number.isNaN(parsedTime)) {
        return res.status(400).json({ success: false, error: 'timestamp must be a valid date/ISO 8601 string' });
      }
      chosenTimestamp = new Date(timestamp).toISOString();
    }

    // 8. Determine final modes
    const chosenDataMode = dataMode || (req.headers['user-agent']?.includes('ESP32') ? 'HARDWARE' : 'HARDWARE');
    const chosenEcgMode = ecgMode || 'SIMULATED';

    // 9. Evaluate health status
    const calculatedStatus = healthStatusService.evaluateHealthStatus(hr ?? 75, o2, temp);
    const finalStatus = incomingStatus || calculatedStatus;

    // 10. Insert into TELEMETRY table
    const insertStmt = db.prepare(`
      INSERT INTO TELEMETRY (
        deviceId, patientId, heartRate, spo2, temperature, ecg,
        ecgMode, dataMode, status, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await insertStmt.run(
      deviceId,
      patientId,
      hr,
      o2,
      temp,
      ecgVal,
      chosenEcgMode,
      chosenDataMode,
      finalStatus,
      chosenTimestamp
    );

    // 11. Update Device status & lastSeen in DEVICES table
    const updateDeviceStmt = db.prepare(`
      UPDATE DEVICES 
      SET connectionStatus = 'ONLINE', lastSeen = ? 
      WHERE deviceId = ?
    `);
    const devUpdateResult = await updateDeviceStmt.run(chosenTimestamp, deviceId);

    // If device was not previously registered, register it automatically assigned to patientId
    if (devUpdateResult.changes === 0) {
      await db.prepare(`
        INSERT INTO DEVICES (deviceId, patientId, deviceName, connectionStatus, lastSeen, createdAt)
        VALUES (?, ?, ?, 'ONLINE', ?, ?)
      `).run(deviceId, patientId, `HealthSync ESP32 Node (${deviceId})`, chosenTimestamp, chosenTimestamp);
    }

    // 12. Evaluate & generate emergency alerts if thresholds are breached
    let alertsGenerated = [];
    if (hr != null) {
      alertsGenerated = await healthStatusService.evaluateAndGenerateAlerts({
        patientId,
        deviceId,
        heartRate: hr,
        spo2: o2,
        temperature: temp,
        timestamp: chosenTimestamp,
      });
    }

    // 13. Concise Terminal Logging for ESP32 Physical Telemetry
    if (chosenDataMode === 'HARDWARE') {
      console.log(`[ESP32] ${deviceId}`);
      console.log(`Patient: ${patientId}`);
      console.log(`HR: ${hr != null ? hr : '-- (No Sensor Reading)'}`);
      console.log(`SpO2: ${o2} (SIMULATED)`);
      console.log(`Temperature: ${temp}`);
      console.log(`ECG: ${chosenEcgMode === 'SIMULATED' ? 'SIMULATED' : 'LIVE'}`);
      console.log(`Status: ${finalStatus}\n`);
    }

    res.status(200).json({
      success: true,
      message: 'Telemetry ingested successfully',
      telemetryId: Number(result.lastInsertRowid),
      patientId,
      deviceId,
      heartRate: hr,
      spo2: o2,
      temperature: temp,
      status: finalStatus,
      dataMode: chosenDataMode,
      ecgMode: chosenEcgMode,
      alertsTriggered: alertsGenerated.length,
      timestamp: chosenTimestamp,
    });
  } catch (err) {
    console.error('[Telemetry] Ingestion error:', err);
    res.status(500).json({ success: false, error: 'Internal error processing telemetry packet' });
  }
});

export default router;
