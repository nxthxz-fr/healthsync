/**
 * HealthSync Integration Audit Test Suite
 * Validates all 13 user requirements and integration points.
 */

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('=== STARTING HEALTHSYNC INTEGRATION AUDIT TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Reset hardware packets before test run so demo mode starts fresh
    const { db } = await import('./database/database.js');
    db.prepare("DELETE FROM TELEMETRY WHERE dataMode = 'HARDWARE'").run();

    // 1. GET /
    console.log('[1] Testing GET /');
    const rootRes = await fetch(`${BASE_URL}/`);
    assert(rootRes.ok, 'Root endpoint returns HTTP 200');
    const rootData = await rootRes.json();
    assert(rootData.project.includes('HealthSync'), 'Root metadata includes HealthSync');

    // 2. GET /api/health
    console.log('\n[2] Testing GET /api/health');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    assert(healthRes.ok, 'Health endpoint returns HTTP 200');
    const healthData = await healthRes.json();
    assert(healthData.status === 'ok', 'Health status is ok');

    // 3. GET /api/patients
    console.log('\n[3] Testing GET /api/patients');
    const patientsRes = await fetch(`${BASE_URL}/api/patients`);
    assert(patientsRes.ok, 'Patients endpoint returns HTTP 200');
    const patientsData = await patientsRes.json();
    assert(Array.isArray(patientsData) && patientsData.length >= 4, `Returns list of patients (count: ${patientsData.length})`);

    // 4. GET /api/patients/PATIENT-001
    console.log('\n[4] Testing GET /api/patients/PATIENT-001');
    const p1Res = await fetch(`${BASE_URL}/api/patients/PATIENT-001`);
    assert(p1Res.ok, 'PATIENT-001 profile returns HTTP 200');
    const p1Data = await p1Res.json();
    assert(p1Data.patientId === 'PATIENT-001', 'Patient ID matches PATIENT-001');
    assert(p1Data.sourceMode === 'DEMO', `Demo patient sourceMode is DEMO (got: ${p1Data.sourceMode})`);

    // 5. GET /api/patients/PATIENT-001/latest
    console.log('\n[5] Testing GET /api/patients/PATIENT-001/latest');
    const latestRes = await fetch(`${BASE_URL}/api/patients/PATIENT-001/latest`);
    assert(latestRes.ok, 'PATIENT-001 latest vitals returns HTTP 200');
    const latestData = await latestRes.json();
    assert(typeof latestData.heartRate === 'number', `Latest HR is dynamic number (${latestData.heartRate})`);
    assert(typeof latestData.spo2 === 'number', `Latest SpO2 is dynamic number (${latestData.spo2})`);

    // 6. GET /api/patients/PATIENT-001/history?limit=25
    console.log('\n[6] Testing GET /api/patients/PATIENT-001/history?limit=25');
    const histRes = await fetch(`${BASE_URL}/api/patients/PATIENT-001/history?limit=25`);
    assert(histRes.ok, 'History endpoint returns HTTP 200');
    const histData = await histRes.json();
    assert(Array.isArray(histData.history), 'History field is an array');

    // 7. GET /api/demo/vitals
    console.log('\n[7] Testing GET /api/demo/vitals');
    const vitalsRes = await fetch(`${BASE_URL}/api/demo/vitals`);
    assert(vitalsRes.ok, 'Demo vitals returns HTTP 200');
    const vitalsData = await vitalsRes.json();
    assert(vitalsData.isDemoMode === true, 'isDemoMode flag is true');
    assert(vitalsData.labels.heartRate === 'SIMULATED BPM', 'Heart rate labeled SIMULATED BPM');
    assert(vitalsData.labels.spo2 === 'SIMULATED SpO2', 'SpO2 labeled SIMULATED SpO2');
    assert(vitalsData.labels.ecg === 'SIMULATED ECG — DEMO DATA', 'ECG labeled SIMULATED ECG — DEMO DATA');

    // 8. GET /api/demo/ecg?limit=300
    console.log('\n[8] Testing GET /api/demo/ecg?limit=300');
    const ecgRes = await fetch(`${BASE_URL}/api/demo/ecg?limit=300`);
    assert(ecgRes.ok, 'Demo ECG returns HTTP 200');
    const ecgData = await ecgRes.json();
    assert(Array.isArray(ecgData) && ecgData.length === 300, `Returns 300 continuous ECG points (got ${ecgData.length})`);
    assert(typeof ecgData[0].value === 'number', `ECG point value is numeric (${ecgData[0].value} mV)`);

    // 9. GET /api/devices
    console.log('\n[9] Testing GET /api/devices');
    const devRes = await fetch(`${BASE_URL}/api/devices`);
    assert(devRes.ok, 'Devices endpoint returns HTTP 200');
    const devData = await devRes.json();
    const espDev = devData.find(d => d.deviceId === 'HEALTHSYNC-ESP32-01');
    assert(espDev !== undefined, 'HEALTHSYNC-ESP32-01 found in devices');
    assert(espDev.sourceMode === 'DEMO', `HEALTHSYNC-ESP32-01 sourceMode is DEMO when no hardware telemetry received (got: ${espDev.sourceMode})`);
    assert(espDev.ipAddress.includes('DEMO') || espDev.ipAddress.includes('SIMULATED'), `Fake IP is labeled DEMO/SIMULATED (got: ${espDev.ipAddress})`);
    assert(espDev.macAddress.includes('DEMO') || espDev.macAddress.includes('SIMULATED'), `Fake MAC is labeled DEMO/SIMULATED (got: ${espDev.macAddress})`);

    // 10. GET /api/alerts (NORMAL mode)
    console.log('\n[10] Testing GET /api/alerts (Check for stale unacknowledged critical alerts in NORMAL mode)');
    // First ensure mode is NORMAL
    await fetch(`${BASE_URL}/api/demo/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'NORMAL' }),
    });
    const alertsRes = await fetch(`${BASE_URL}/api/alerts`);
    assert(alertsRes.ok, 'Alerts endpoint returns HTTP 200');
    const alertsData = await alertsRes.json();
    const unackCritical = alertsData.filter(a => !a.acknowledged && a.severity === 'CRITICAL');
    assert(unackCritical.length === 0, `Zero unacknowledged critical alerts in NORMAL mode (got: ${unackCritical.length})`);

    // 11. Demo Mode Transitions (NORMAL -> CRITICAL -> NORMAL)
    console.log('\n[11] Testing Demo Mode Transitions');
    // Transition to CRITICAL
    const critRes = await fetch(`${BASE_URL}/api/demo/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'CRITICAL' }),
    });
    assert(critRes.ok, 'Set CRITICAL mode returns HTTP 200');
    const critAlerts = await (await fetch(`${BASE_URL}/api/alerts`)).json();
    const hasActiveCrit = critAlerts.some(a => !a.acknowledged && a.severity === 'CRITICAL');
    assert(hasActiveCrit, 'CRITICAL mode successfully generated active critical alert for PATIENT-001');

    // Transition back to NORMAL
    const normRes = await fetch(`${BASE_URL}/api/demo/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'NORMAL' }),
    });
    assert(normRes.ok, 'Set NORMAL mode returns HTTP 200');
    const normVitals = await (await fetch(`${BASE_URL}/api/demo/vitals`)).json();
    assert(normVitals.vitals.status === 'STABLE', `NORMAL mode status is immediately STABLE (got: ${normVitals.vitals.status})`);
    assert(normVitals.vitals.heartRate >= 70 && normVitals.vitals.heartRate <= 85, `NORMAL HR in 70-85 range (got: ${normVitals.vitals.heartRate})`);
    assert(normVitals.vitals.spo2 >= 96 && normVitals.vitals.spo2 <= 99, `NORMAL SpO2 in 96-99% range (got: ${normVitals.vitals.spo2})`);
    const afterNormAlerts = await (await fetch(`${BASE_URL}/api/alerts`)).json();
    const activeCritAfterNorm = afterNormAlerts.filter(a => !a.acknowledged && a.severity === 'CRITICAL' && a.patientId === 'PATIENT-001');
    assert(activeCritAfterNorm.length === 0, 'Stale critical alerts for PATIENT-001 were acknowledged upon returning to NORMAL');

    // 12. Real hardware telemetry ingestion
    console.log('\n[12] Testing Real Hardware Telemetry Ingestion');
    const now = new Date().toISOString();
    const telRes = await fetch(`${BASE_URL}/api/iot/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'HEALTHSYNC-ESP32-01',
        patientId: 'PATIENT-001',
        heartRate: 77,
        spo2: 98.4,
        temperature: 36.8,
        ecg: 0.52,
        dataMode: 'HARDWARE',
        timestamp: now,
      }),
    });
    assert(telRes.ok, 'Hardware telemetry POST returns HTTP 200');
    // Now verify device reflects LIVE_HARDWARE
    const devAfterHw = await (await fetch(`${BASE_URL}/api/devices`)).json();
    const espAfterHw = devAfterHw.find(d => d.deviceId === 'HEALTHSYNC-ESP32-01');
    assert(espAfterHw.sourceMode === 'LIVE_HARDWARE', `Device now reports sourceMode === 'LIVE_HARDWARE' when telemetry arrived (got: ${espAfterHw.sourceMode})`);

    // Clean up hardware packet so demo mode remains default
    db.prepare("DELETE FROM TELEMETRY WHERE dataMode = 'HARDWARE'").run();

    // 13. Patient Creation & SQLite Persistence
    console.log('\n[13] Testing Patient Creation & SQLite Persistence');
    const testPatientId = `AUDIT-PAT-${Date.now().toString().slice(-4)}`;
    const createRes = await fetch(`${BASE_URL}/api/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: testPatientId,
        fullName: 'Audit Verification Patient',
        age: 38,
        gender: 'Female',
        phone: '555-0199',
        bloodGroup: 'B+',
        medicalNotes: 'Automated persistence verification note.',
      }),
    });
    assert(createRes.ok, 'Patient creation returned HTTP 200');
    const createdPatient = await (await fetch(`${BASE_URL}/api/patients/${testPatientId}`)).json();
    assert(createdPatient.patientId === testPatientId, `Patient profile retrieved by ID: ${testPatientId}`);

    // Verify directly from SQLite DB
    const dbRow = db.prepare('SELECT * FROM PATIENTS WHERE patientId = ?').get(testPatientId);
    assert(dbRow !== undefined && dbRow.fullName === 'Audit Verification Patient', 'Patient is verified stored in SQLite database');

    console.log(`\n=== AUDIT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution exception:', err);
    process.exit(1);
  }
}

runTests();
