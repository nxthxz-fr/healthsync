/**
 * Automated Verification Script for HealthSync Backend REST API
 * Tests all required endpoints according to Section 27 specifications.
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:5000';

async function runTests() {
  console.log(`\n========================================================`);
  console.log(` RUNNING HEALTHSYNC API VERIFICATION SUITE`);
  console.log(` Target: ${BASE_URL}`);
  console.log(`========================================================\n`);

  let passCount = 0;
  let failCount = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`• Testing: ${name}... `);
      await fn();
      console.log(`\x1b[32mPASSED\x1b[0m`);
      passCount++;
    } catch (err) {
      console.log(`\x1b[31mFAILED\x1b[0m`);
      console.error(`  Error: ${err.message}`);
      failCount++;
    }
  }

  // 1. GET /
  await test('GET / (Root API Index)', async () => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.project || !data.endpoints) throw new Error('Missing project metadata in root');
  });

  // 2. GET /api/health
  await test('GET /api/health (Health check)', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('Health check status is not ok');
  });

  // 3. GET /api/patients
  await test('GET /api/patients (Retrieve patient list)', async () => {
    const res = await fetch(`${BASE_URL}/api/patients`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const patients = await res.json();
    if (!Array.isArray(patients) || patients.length === 0) {
      throw new Error('Expected non-empty patients array');
    }
    const demo = patients.find((p) => p.patientId === 'PATIENT-001' || p.id === 'PATIENT-001');
    if (!demo) throw new Error('Seeded demo patient PATIENT-001 not found');
  });

  // 4. POST /api/patients
  const testPatientId = `TEST-PAT-${Date.now().toString().slice(-4)}`;
  await test(`POST /api/patients (Create new patient: ${testPatientId})`, async () => {
    const payload = {
      patientId: testPatientId,
      fullName: 'Test Verification Patient',
      age: 40,
      gender: 'Female',
      phone: '1234567890',
      email: 'test@example.com',
      address: 'Testing Ward 101',
      emergencyContactName: 'Test Contact',
      emergencyContactPhone: '9876543210',
      bloodGroup: 'B+',
      medicalNotes: 'Automated test patient verification',
      deviceId: 'TEST-DEVICE-01',
    };

    const res = await fetch(`${BASE_URL}/api/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status !== 201 && res.status !== 200) {
      const err = await res.text();
      throw new Error(`Expected 201 Created, got ${res.status}: ${err}`);
    }
    const data = await res.json();
    if (!data.success || !data.patient) throw new Error('Failed to create patient');
  });

  // 5. GET /api/patients/:patientId
  await test(`GET /api/patients/${testPatientId} (Retrieve single patient profile)`, async () => {
    const res = await fetch(`${BASE_URL}/api/patients/${testPatientId}`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const patient = await res.json();
    if (patient.patientId !== testPatientId && patient.id !== testPatientId) {
      throw new Error(`PatientId mismatch: expected ${testPatientId}`);
    }
  });

  // 6. PUT /api/patients/:patientId
  await test(`PUT /api/patients/${testPatientId} (Update patient profile)`, async () => {
    const res = await fetch(`${BASE_URL}/api/patients/${testPatientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        age: 41,
        address: 'Testing Ward Updated 102',
        medicalNotes: 'Updated clinical observation',
      }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Update returned false success');
  });

  // 7. POST /api/iot/telemetry
  await test('POST /api/iot/telemetry (Ingest ESP32 hardware telemetry)', async () => {
    const telemetryPayload = {
      deviceId: 'HEALTHSYNC-ESP32-01',
      patientId: 'PATIENT-001',
      heartRate: 78,
      spo2: 98,
      temperature: 33.2,
      ecg: 0.42,
      ecgMode: 'SIMULATED',
      dataMode: 'DEMO',
      status: 'STABLE',
      timestamp: new Date().toISOString(),
    };

    const res = await fetch(`${BASE_URL}/api/iot/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telemetryPayload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Status ${res.status}: ${err}`);
    }
    const data = await res.json();
    if (!data.success || !data.telemetryId) throw new Error('Telemetry not stored');
  });

  // 8. GET /api/patients/:patientId/latest
  await test('GET /api/patients/PATIENT-001/latest (Retrieve latest vitals)', async () => {
    const res = await fetch(`${BASE_URL}/api/patients/PATIENT-001/latest`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const vitals = await res.json();
    if (!vitals.patientId || vitals.heartRate == null || vitals.spo2 == null) {
      throw new Error('Incomplete vitals payload');
    }
  });

  // 9. GET /api/patients/:patientId/history
  await test('GET /api/patients/PATIENT-001/history?limit=100 (Retrieve history for plotting)', async () => {
    const res = await fetch(`${BASE_URL}/api/patients/PATIENT-001/history?limit=100`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.history) || data.history.length === 0) {
      throw new Error('Expected non-empty telemetry history array');
    }
  });

  // 10. GET /api/devices
  await test('GET /api/devices (List devices and online status)', async () => {
    const res = await fetch(`${BASE_URL}/api/devices`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const devices = await res.json();
    if (!Array.isArray(devices) || devices.length === 0) throw new Error('Expected devices array');
    const esp = devices.find((d) => d.deviceId === 'HEALTHSYNC-ESP32-01');
    if (!esp) throw new Error('HEALTHSYNC-ESP32-01 device not found');
  });

  // 11. GET /api/demo/vitals
  await test('GET /api/demo/vitals (Simulated vitals with labels)', async () => {
    const res = await fetch(`${BASE_URL}/api/demo/vitals`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const demo = await res.json();
    if (!demo.isDemoMode || !demo.labels) throw new Error('Missing demo mode labels');
    if (!demo.labels.heartRate.includes('SIMULATED') || !demo.labels.spo2.includes('SIMULATED')) {
      throw new Error('Labels must include SIMULATED distinction');
    }
  });

  // 12. GET /api/demo/ecg
  await test('GET /api/demo/ecg?limit=300 (Continuous Lead II waveform points)', async () => {
    const res = await fetch(`${BASE_URL}/api/demo/ecg?limit=300`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const points = await res.json();
    if (!Array.isArray(points) || points.length < 200) {
      throw new Error(`Expected at least 200 ECG points, got ${points?.length}`);
    }
    const sample = points[0];
    if (sample.value == null || !sample.timestamp) throw new Error('Invalid ECG point format');
  });

  // 13. POST /api/demo/mode
  await test('POST /api/demo/mode (Transition to CRITICAL mode and trigger alert)', async () => {
    const res = await fetch(`${BASE_URL}/api/demo/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'CRITICAL' }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.demo.mode !== 'CRITICAL') throw new Error('Mode not set to CRITICAL');
  });

  // 14. GET /api/alerts & POST /api/alerts/:alertId/acknowledge
  await test('GET /api/alerts & Acknowledge alert', async () => {
    const alertsRes = await fetch(`${BASE_URL}/api/alerts`);
    if (!alertsRes.ok) throw new Error(`Status ${alertsRes.status}`);
    const alerts = await alertsRes.json();
    if (!Array.isArray(alerts) || alerts.length === 0) throw new Error('Expected alerts to be present');

    const firstAlert = alerts[0];
    const ackRes = await fetch(`${BASE_URL}/api/alerts/${firstAlert.id}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledgedBy: 'Dr. Test Attending' }),
    });
    if (!ackRes.ok) throw new Error(`Ack failed with status ${ackRes.status}`);
  });

  // Reset demo mode back to NORMAL
  await fetch(`${BASE_URL}/api/demo/mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'NORMAL' }),
  });

  console.log(`\n========================================================`);
  console.log(` TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log(`========================================================\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
