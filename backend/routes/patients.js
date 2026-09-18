import { Router } from 'express';
import { db } from '../database/database.js';
import { healthStatusService } from '../services/healthStatusService.js';
import { simulationService } from '../services/simulationService.js';

const router = Router();

/**
 * Format a database patient row into a comprehensive response object
 * providing full compatibility with both the hackathon specifications
 * and the existing HealthSync dashboard views.
 */
async function formatPatient(row) {
  if (!row) return null;

  // Retrieve assigned device
  let deviceRow = null;
  try {
    const devStmt = db.prepare('SELECT * FROM DEVICES WHERE patientId = ? LIMIT 1');
    deviceRow = await devStmt.get(row.patientId);
  } catch (e) {}

  // Retrieve latest telemetry record
  let latestTelemetry = null;
  try {
    const telStmt = db.prepare('SELECT * FROM TELEMETRY WHERE patientId = ? ORDER BY timestamp DESC LIMIT 1');
    latestTelemetry = await telStmt.get(row.patientId);
  } catch (e) {}

  // If this is PATIENT-001 (demo patient), provide simulated live vitals from simulationService
  // UNLESS real hardware telemetry has arrived through POST /api/iot/telemetry with dataMode === 'HARDWARE'
  if (row.patientId === 'PATIENT-001') {
    let hasRealHardware = false;
    try {
      const realHw = await db.prepare(`
        SELECT * FROM TELEMETRY 
        WHERE patientId = 'PATIENT-001' AND dataMode = 'HARDWARE' 
        ORDER BY timestamp DESC LIMIT 1
      `).get();

      if (realHw && (Date.now() - new Date(realHw.timestamp).getTime() < 60000)) {
        latestTelemetry = realHw;
        hasRealHardware = true;
      }
    } catch (e) {}

    if (!hasRealHardware) {
      const demoStatus = simulationService.getDemoStatus();
      latestTelemetry = {
        id: 999999,
        deviceId: deviceRow?.deviceId || 'HEALTHSYNC-ESP32-01',
        patientId: 'PATIENT-001',
        heartRate: demoStatus.vitals.heartRate,
        spo2: demoStatus.vitals.spo2,
        temperature: demoStatus.vitals.temperature,
        ecg: 0.42,
        ecgMode: 'SIMULATED',
        dataMode: 'DEMO',
        status: demoStatus.vitals.status,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Calculate health status
  const currentStatus = latestTelemetry
    ? latestTelemetry.status || healthStatusService.evaluateHealthStatus(
        latestTelemetry.heartRate,
        latestTelemetry.spo2,
        latestTelemetry.temperature
      )
    : 'MONITOR';

  // Check device online status (within 60s)
  let isOnline = false;
  if (deviceRow && deviceRow.lastSeen) {
    const diffMs = Date.now() - new Date(deviceRow.lastSeen).getTime();
    isOnline = diffMs < 60000;
  }
  // Keep PATIENT-001 online for demonstration
  if (row.patientId === 'PATIENT-001') {
    isOnline = true;
  }

  // Parse notes if JSON or plain text
  let parsedNotes = [];
  try {
    if (row.medicalNotes && row.medicalNotes.startsWith('[')) {
      parsedNotes = JSON.parse(row.medicalNotes);
    } else if (row.medicalNotes) {
      parsedNotes = [
        {
          id: `NOTE-${row.id}`,
          author: 'Attending Physician',
          timestamp: row.createdAt,
          category: 'ROUTINE',
          content: row.medicalNotes,
        },
      ];
    }
  } catch (e) {
    parsedNotes = [];
  }

  // Generate baseline
  const baseline = {
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
    lastBaselineUpdate: row.updatedAt,
  };

  const riskLevel = currentStatus === 'CRITICAL' ? 'CRITICAL' : currentStatus === 'ATTENTION' ? 'ATTENTION' : 'STABLE';
  const riskScore = currentStatus === 'CRITICAL' ? 88 : currentStatus === 'ATTENTION' ? 55 : 12;

  return {
    // Specification Fields
    id: row.patientId, // Dashboard uses string IDs like 'P-101'
    dbId: row.id,
    patientId: row.patientId,
    fullName: row.fullName,
    name: row.fullName, // Frontend compatibility
    age: row.age,
    gender: row.gender,
    phone: row.phone,
    email: row.email,
    address: row.address,
    emergencyContactName: row.emergencyContactName,
    emergencyContactPhone: row.emergencyContactPhone,
    bloodGroup: row.bloodGroup,
    medicalNotes: row.medicalNotes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,

    // Clinical Details for Dashboard
    roomBed: row.address?.startsWith('Room') ? row.address : 'Cardio Telemetry Ward',
    doctor: 'Dr. Sarah Chen, MD (Cardiology)',
    nurse: 'Nurse James Miller, RN',
    department: 'Cardiac Telemetry & Acute Care',
    admissionDate: row.createdAt ? row.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),

    // Device Attachment
    deviceId: deviceRow?.deviceId || 'HEALTHSYNC-ESP32-01',
    deviceStatus: isOnline ? 'online' : 'offline',
    deviceType: 'ESP32 IoT Vital Node',
    firmwareVersion: 'v2.4.1-clinical',
    batteryLevel: 94,
    signalStrength: -62,
    lastTransmission: latestTelemetry ? latestTelemetry.timestamp : row.updatedAt,

    // Vitals
    vitals: {
      heartRate: latestTelemetry ? (latestTelemetry.heartRate != null ? Math.round(latestTelemetry.heartRate) : null) : 76,
      spo2: latestTelemetry ? Number(latestTelemetry.spo2) : 98.2,
      temperature: latestTelemetry ? Number(latestTelemetry.temperature) : 36.8,
      ecg: latestTelemetry ? latestTelemetry.ecg : 0.42,
      respiratoryRate: 16,
      bloodPressureSys: 122,
      bloodPressureDia: 78,
      signalQuality: isOnline ? 'good' : 'poor',
      lastUpdated: latestTelemetry ? latestTelemetry.timestamp : row.updatedAt,
      dataMode: latestTelemetry ? latestTelemetry.dataMode : 'DEMO',
      ecgMode: latestTelemetry ? latestTelemetry.ecgMode : 'SIMULATED',
      status: currentStatus,
      isSimulated: latestTelemetry ? latestTelemetry.dataMode === 'DEMO' : true,
    },

    // Source indicators for hackathon
    sourceMode: latestTelemetry?.dataMode === 'HARDWARE' ? 'LIVE_HARDWARE' : 'DEMO',
    sourceLabel: latestTelemetry?.dataMode === 'HARDWARE' ? 'LIVE HARDWARE' : 'SOURCE MODE: DEMO / SIMULATION',

    // Calculated Clinical Status
    status: currentStatus,
    riskScore,
    riskLevel,
    riskFactors:
      currentStatus === 'CRITICAL'
        ? ['Severe Desaturation / Arrhythmia Alert', 'Clinical Intervention Required']
        : currentStatus === 'ATTENTION'
        ? ['Vital sign variance exceeds baseline threshold', 'Increased monitoring protocol']
        : ['Stable sinus rhythm within normal limits', 'Baseline maintained'],

    activeAlertCount: currentStatus === 'CRITICAL' ? 2 : currentStatus === 'ATTENTION' ? 1 : 0,
    baseline,
    notes: parsedNotes,
    clinicalSummary: {
      chiefComplaint: 'Continuous Cardiac & Oxygen Monitoring',
      allergies: ['Penicillin (Moderate rash)'],
      dietaryOrder: 'Low Sodium / Cardiac',
      codeStatus: 'FULL CODE',
      fallRisk: row.age && row.age > 65 ? 'Moderate' : 'Low',
    },
  };
}

// 1. GET /api/patients - Return all registered patients
router.get('/', async (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM PATIENTS ORDER BY id ASC');
    const rows = await stmt.all();
    const formatted = await Promise.all(rows.map(formatPatient));
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching patients:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve patients' });
  }
});

// 2. GET /api/patients/:patientId - Return one patient's complete profile
router.get('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const stmt = db.prepare('SELECT * FROM PATIENTS WHERE patientId = ? OR id = ? LIMIT 1');
    const row = await stmt.get(patientId, Number(patientId) || -1);

    if (!row) {
      return res.status(404).json({ success: false, error: `Patient '${patientId}' not found` });
    }

    const patient = await formatPatient(row);

    // Also fetch recent telemetry history for charting
    const historyStmt = db.prepare(`
      SELECT * FROM TELEMETRY 
      WHERE patientId = ? 
      ORDER BY timestamp DESC 
      LIMIT 25
    `);
    const historyRows = (await historyStmt.all(row.patientId)).reverse();

    res.json({
      ...patient,
      history: historyRows,
    });
  } catch (err) {
    console.error('Error fetching patient profile:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve patient profile' });
  }
});

// 3. POST /api/patients - Create a new patient
router.post('/', async (req, res) => {
  try {
    const {
      patientId,
      fullName,
      name,
      age,
      gender,
      phone,
      email,
      address,
      emergencyContactName,
      emergencyContactPhone,
      bloodGroup,
      medicalNotes,
      deviceId,
    } = req.body;

    const chosenName = fullName || name;
    if (!chosenName) {
      return res.status(400).json({ success: false, error: 'fullName (or name) is required' });
    }

    // Auto-generate patientId if not supplied
    let chosenId = patientId;
    if (!chosenId) {
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM PATIENTS');
      const countRes = await countStmt.get();
      const count = countRes?.count || 0;
      chosenId = `PATIENT-${String(count + 1).padStart(3, '0')}`;
    }

    // Check uniqueness of patientId
    const existsStmt = db.prepare('SELECT id FROM PATIENTS WHERE patientId = ?');
    const existing = await existsStmt.get(chosenId);
    if (existing) {
      return res.status(400).json({ success: false, error: `Patient ID '${chosenId}' already exists` });
    }

    const now = new Date().toISOString();
    const insertPatient = db.prepare(`
      INSERT INTO PATIENTS (
        patientId, fullName, age, gender, phone, email, address,
        emergencyContactName, emergencyContactPhone, bloodGroup, medicalNotes,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await insertPatient.run(
      chosenId,
      chosenName,
      age != null ? Number(age) : null,
      gender || 'Other',
      phone || '',
      email || '',
      address || '',
      emergencyContactName || '',
      emergencyContactPhone || '',
      bloodGroup || 'O+',
      medicalNotes || '',
      now,
      now
    );

    // If deviceId provided, assign device
    if (deviceId) {
      const checkDev = db.prepare('SELECT id FROM DEVICES WHERE deviceId = ?');
      const devExists = await checkDev.get(deviceId);
      if (devExists) {
        await db.prepare('UPDATE DEVICES SET patientId = ?, lastSeen = ? WHERE deviceId = ?').run(chosenId, now, deviceId);
      } else {
        await db.prepare(`
          INSERT INTO DEVICES (deviceId, patientId, deviceName, connectionStatus, lastSeen, createdAt)
          VALUES (?, ?, ?, 'ONLINE', ?, ?)
        `).run(deviceId, chosenId, `ESP32 Node (${deviceId})`, now, now);
      }
    }

    // Seed initial baseline telemetry record
    const insertTel = db.prepare(`
      INSERT INTO TELEMETRY (deviceId, patientId, heartRate, spo2, temperature, ecg, ecgMode, dataMode, status, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, 'SIMULATED', 'DEMO', 'STABLE', ?)
    `);
    await insertTel.run(
      deviceId || 'HEALTHSYNC-ESP32-01',
      chosenId,
      76.0,
      98.0,
      36.7,
      0.42,
      now
    );

    const newRow = await db.prepare('SELECT * FROM PATIENTS WHERE patientId = ?').get(chosenId);
    const createdPatient = await formatPatient(newRow);

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      patient: createdPatient,
    });
  } catch (err) {
    console.error('Error creating patient:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create patient' });
  }
});

// 4. PUT /api/patients/:patientId - Update patient information
router.put('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const existing = await db.prepare('SELECT * FROM PATIENTS WHERE patientId = ?').get(patientId);

    if (!existing) {
      return res.status(404).json({ success: false, error: `Patient '${patientId}' not found` });
    }

    const {
      fullName,
      name,
      age,
      gender,
      phone,
      email,
      address,
      emergencyContactName,
      emergencyContactPhone,
      bloodGroup,
      medicalNotes,
    } = req.body;

    const now = new Date().toISOString();
    const updateStmt = db.prepare(`
      UPDATE PATIENTS SET
        fullName = ?,
        age = ?,
        gender = ?,
        phone = ?,
        email = ?,
        address = ?,
        emergencyContactName = ?,
        emergencyContactPhone = ?,
        bloodGroup = ?,
        medicalNotes = ?,
        updatedAt = ?
      WHERE patientId = ?
    `);

    await updateStmt.run(
      fullName || name || existing.fullName,
      age != null ? Number(age) : existing.age,
      gender || existing.gender,
      phone != null ? phone : existing.phone,
      email != null ? email : existing.email,
      address != null ? address : existing.address,
      emergencyContactName != null ? emergencyContactName : existing.emergencyContactName,
      emergencyContactPhone != null ? emergencyContactPhone : existing.emergencyContactPhone,
      bloodGroup || existing.bloodGroup,
      medicalNotes != null ? medicalNotes : existing.medicalNotes,
      now,
      patientId
    );

    const updatedRow = await db.prepare('SELECT * FROM PATIENTS WHERE patientId = ?').get(patientId);
    res.json({
      success: true,
      message: 'Patient updated successfully',
      patient: await formatPatient(updatedRow),
    });
  } catch (err) {
    console.error('Error updating patient:', err);
    res.status(500).json({ success: false, error: 'Failed to update patient' });
  }
});

// 5. DELETE /api/patients/:patientId - Safe deletion
router.delete('/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const existing = await db.prepare('SELECT id FROM PATIENTS WHERE patientId = ?').get(patientId);

    if (!existing) {
      return res.status(404).json({ success: false, error: `Patient '${patientId}' not found` });
    }

    // Do NOT delete historical telemetry accidentally; dissociate device and mark patient inactive or remove patient record
    await db.prepare('UPDATE DEVICES SET patientId = NULL WHERE patientId = ?').run(patientId);
    await db.prepare('DELETE FROM PATIENTS WHERE patientId = ?').run(patientId);

    res.json({
      success: true,
      message: `Patient '${patientId}' removed safely. Historical telemetry records preserved.`,
    });
  } catch (err) {
    console.error('Error deleting patient:', err);
    res.status(500).json({ success: false, error: 'Failed to delete patient' });
  }
});

// 6. GET /api/patients/:patientId/latest - Return latest vitals
router.get('/:patientId/latest', async (req, res) => {
  try {
    const { patientId } = req.params;

    // First check if real hardware telemetry exists for this patient
    const hwRecord = await db.prepare(`
      SELECT * FROM TELEMETRY 
      WHERE patientId = ? AND dataMode = 'HARDWARE' 
      ORDER BY timestamp DESC 
      LIMIT 1
    `).get(patientId);

    const offlineTimeoutMs = Number(process.env.DEVICE_OFFLINE_TIMEOUT_MS) || 45000;
    if (hwRecord && (Date.now() - new Date(hwRecord.timestamp).getTime() < offlineTimeoutMs)) {
      return res.json({
        patientId: hwRecord.patientId,
        deviceId: hwRecord.deviceId,
        heartRate: hwRecord.heartRate != null ? Math.round(hwRecord.heartRate) : null,
        spo2: Number(hwRecord.spo2),
        temperature: Number(hwRecord.temperature),
        ecg: hwRecord.ecg,
        ecgMode: hwRecord.ecgMode,
        dataMode: hwRecord.dataMode,
        status: hwRecord.status,
        timestamp: hwRecord.timestamp,
      });
    }

    // PATIENT-001 returns dynamic simulation values when no active hardware telemetry
    if (patientId === 'PATIENT-001') {
      const demo = simulationService.getDemoStatus();
      return res.json({
        patientId: 'PATIENT-001',
        deviceId: 'HEALTHSYNC-ESP32-01',
        heartRate: demo.vitals.heartRate,
        spo2: demo.vitals.spo2,
        temperature: demo.vitals.temperature,
        ecg: 0.42,
        ecgMode: 'SIMULATED',
        dataMode: 'DEMO',
        status: demo.vitals.status,
        timestamp: new Date().toISOString(),
      });
    }

    const stmt = db.prepare(`
      SELECT * FROM TELEMETRY 
      WHERE patientId = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `);
    const record = await stmt.get(patientId);

    if (!record) {
      return res.status(404).json({ success: false, error: `No telemetry found for patient '${patientId}'` });
    }

    res.json({
      patientId: record.patientId,
      deviceId: record.deviceId,
      heartRate: record.heartRate != null ? Math.round(record.heartRate) : null,
      spo2: Number(record.spo2),
      temperature: Number(record.temperature),
      ecg: record.ecg,
      ecgMode: record.ecgMode,
      dataMode: record.dataMode,
      status: record.status,
      timestamp: record.timestamp,
    });
  } catch (err) {
    console.error('Error getting latest vitals:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve latest vitals' });
  }
});

// 7. GET /api/patients/:patientId/history - Return telemetry history
router.get('/:patientId/history', async (req, res) => {
  try {
    const { patientId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const stmt = db.prepare(`
      SELECT * FROM TELEMETRY 
      WHERE patientId = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    const rows = (await stmt.all(patientId, limit)).reverse();

    res.json({
      patientId,
      count: rows.length,
      history: rows,
    });
  } catch (err) {
    console.error('Error fetching telemetry history:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve history' });
  }
});

// 8. GET /api/patients/:patientId/alerts - Return alerts for this patient
router.get('/:patientId/alerts', async (req, res) => {
  try {
    const { patientId } = req.params;
    const stmt = db.prepare(`
      SELECT * FROM ALERTS 
      WHERE patientId = ? 
      ORDER BY timestamp DESC 
      LIMIT 50
    `);
    const rows = await stmt.all(patientId);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching patient alerts:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve alerts' });
  }
});

// 9. POST /api/patients/:patientId/notes - Add doctor note
router.post('/:patientId/notes', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { content, author, category } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Note content is required' });
    }

    const patient = await db.prepare('SELECT * FROM PATIENTS WHERE patientId = ?').get(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const newNote = {
      id: `NOTE-${Date.now()}`,
      author: author || 'Dr. Sarah Chen, MD',
      timestamp: new Date().toISOString(),
      category: category || 'ROUTINE',
      content,
    };

    let notesList = [];
    try {
      if (patient.medicalNotes && patient.medicalNotes.startsWith('[')) {
        notesList = JSON.parse(patient.medicalNotes);
      }
    } catch (e) {}

    notesList.unshift(newNote);

    await db.prepare('UPDATE PATIENTS SET medicalNotes = ?, updatedAt = ? WHERE patientId = ?').run(
      JSON.stringify(notesList),
      new Date().toISOString(),
      patientId
    );

    res.json({ success: true, note: newNote, notes: notesList });
  } catch (err) {
    console.error('Error adding patient note:', err);
    res.status(500).json({ success: false, error: 'Failed to add note' });
  }
});

export default router;
