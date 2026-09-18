/**
 * ESP32 Hardware Integration Verification Script
 * Validates all testing requirements specified by user.
 */

const BASE_URL = 'http://localhost:5000';

async function runEsp32Verification() {
  console.log('=== STARTING ESP32 INTEGRATION TESTS ===\n');
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
    // 1 & 2. Verify GET /
    console.log('[Step 1 & 2] Verifying GET /');
    const rootRes = await fetch(`${BASE_URL}/`);
    assert(rootRes.ok, 'GET / returns HTTP 200');
    const rootData = await rootRes.json();
    assert(rootData.status === 'ONLINE', 'Root reports status ONLINE');

    // 3. Verify GET /api/health
    console.log('\n[Step 3] Verifying GET /api/health');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    assert(healthRes.ok, 'GET /api/health returns HTTP 200');
    const healthData = await healthRes.json();
    assert(healthData.status === 'ok', 'Health status is ok');
    assert(healthData.database === 'SQLite Connected', 'SQLite Connected in health check');

    // 4 & 5. Send test POST request to POST /api/iot/telemetry using the exact user payload
    console.log('\n[Step 4 & 5] Sending POST /api/iot/telemetry with physical ESP32 telemetry payload');
    const testTimestamp = new Date().toISOString();
    const payload = {
      deviceId: 'HEALTHSYNC-ESP32-01',
      patientId: 'PATIENT-001',
      heartRate: 78,
      spo2: 98,
      temperature: 33.2,
      ecg: 0.42,
      ecgMode: 'SIMULATED',
      dataMode: 'HARDWARE',
      status: 'STABLE',
      timestamp: testTimestamp,
    };

    const postRes = await fetch(`${BASE_URL}/api/iot/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'ESP32HTTPClient' },
      body: JSON.stringify(payload),
    });
    assert(postRes.ok, 'POST /api/iot/telemetry returns HTTP 200');
    const postData = await postRes.json();
    assert(postData.success === true, 'Telemetry response success is true');
    assert(postData.telemetryId > 0, `Telemetry record inserted with ID: ${postData.telemetryId}`);
    assert(postData.dataMode === 'HARDWARE', 'DataMode in response is HARDWARE');

    // 6. Verify SQLite stores the telemetry
    console.log('\n[Step 6] Verifying SQLite database storage');
    const { db } = await import('./database/database.js');
    const dbRow = db.prepare('SELECT * FROM TELEMETRY WHERE id = ?').get(postData.telemetryId);
    assert(dbRow !== undefined, 'Record found in SQLite TELEMETRY table');
    assert(dbRow.deviceId === 'HEALTHSYNC-ESP32-01', 'SQLite deviceId is HEALTHSYNC-ESP32-01');
    assert(dbRow.heartRate === 78, `SQLite heartRate is 78 (got: ${dbRow.heartRate})`);
    assert(dbRow.temperature === 33.2, `SQLite temperature is 33.2 (got: ${dbRow.temperature})`);
    assert(dbRow.spo2 === 98, `SQLite spo2 is 98 (got: ${dbRow.spo2})`);
    assert(dbRow.dataMode === 'HARDWARE', `SQLite dataMode is HARDWARE (got: ${dbRow.dataMode})`);

    // 7. Verify GET /api/patients/PATIENT-001/latest shows the new telemetry
    console.log('\n[Step 7] Verifying GET /api/patients/PATIENT-001/latest');
    const latestRes = await fetch(`${BASE_URL}/api/patients/PATIENT-001/latest`);
    assert(latestRes.ok, 'GET /api/patients/PATIENT-001/latest returns HTTP 200');
    const latestData = await latestRes.json();
    assert(latestData.heartRate === 78, `Latest heartRate is 78 (got: ${latestData.heartRate})`);
    assert(latestData.temperature === 33.2, `Latest temperature is 33.2 (got: ${latestData.temperature})`);
    assert(latestData.spo2 === 98, `Latest spo2 is 98 (got: ${latestData.spo2})`);
    assert(latestData.dataMode === 'HARDWARE', `Latest dataMode is HARDWARE (got: ${latestData.dataMode})`);

    // 8. Verify GET /api/patients/PATIENT-001/history?limit=25 contains the new record
    console.log('\n[Step 8] Verifying GET /api/patients/PATIENT-001/history?limit=25');
    const histRes = await fetch(`${BASE_URL}/api/patients/PATIENT-001/history?limit=25`);
    assert(histRes.ok, 'GET /api/patients/PATIENT-001/history returns HTTP 200');
    const histData = await histRes.json();
    const foundInHist = histData.history.find(h => h.id === postData.telemetryId);
    assert(foundInHist !== undefined, `Telemetry ID ${postData.telemetryId} present in recent history array`);

    // 9. Verify the device becomes ONLINE and shows LIVE_HARDWARE
    console.log('\n[Step 9] Verifying device status and source mode');
    const devRes = await fetch(`${BASE_URL}/api/devices`);
    assert(devRes.ok, 'GET /api/devices returns HTTP 200');
    const devList = await devRes.json();
    const espDev = devList.find(d => d.deviceId === 'HEALTHSYNC-ESP32-01');
    assert(espDev !== undefined, 'HEALTHSYNC-ESP32-01 found in devices list');
    assert(espDev.connectionStatus === 'ONLINE', `Device status is ONLINE (got: ${espDev.connectionStatus})`);
    assert(espDev.sourceMode === 'LIVE_HARDWARE', `Device sourceMode is LIVE_HARDWARE (got: ${espDev.sourceMode})`);

    // 10. Verify null heartRate when pulse sensor has no reading
    console.log('\n[Step 10] Testing null heartRate (sensor unseated / no finger placed)');
    const nullHrPayload = {
      deviceId: 'HEALTHSYNC-ESP32-01',
      patientId: 'PATIENT-001',
      heartRate: null,
      spo2: 98,
      temperature: 33.4,
      ecg: null,
      dataMode: 'HARDWARE',
    };
    const nullHrRes = await fetch(`${BASE_URL}/api/iot/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nullHrPayload),
    });
    assert(nullHrRes.ok, 'Telemetry with null heartRate accepted with HTTP 200');
    const nullHrData = await nullHrRes.json();
    assert(nullHrData.heartRate === null, 'heartRate is null and not coerced into fake number');

    // 11. Testing validation & malformed payload rejections
    console.log('\n[Step 11] Testing validation: rejecting malformed requests with HTTP 400');
    const badReq1 = await fetch(`${BASE_URL}/api/iot/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heartRate: 75 }), // missing deviceId
    });
    assert(badReq1.status === 400, 'Missing deviceId rejected with HTTP 400');

    const badReq2 = await fetch(`${BASE_URL}/api/iot/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: 'DEV-1', spo2: 98 }), // missing temperature
    });
    assert(badReq2.status === 400, 'Missing temperature rejected with HTTP 400');

    const badReq3 = await fetch(`${BASE_URL}/api/iot/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: 'DEV-1', temperature: 36.5, spo2: 'INVALID_SPO2' }),
    });
    assert(badReq3.status === 400, 'Invalid non-numeric spo2 rejected with HTTP 400');

    console.log(`\n=== ESP32 INTEGRATION SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

runEsp32Verification();
