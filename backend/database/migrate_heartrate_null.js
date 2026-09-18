import { db } from './database.js';

try {
  console.log('[Migration] Migrating TELEMETRY table to allow NULL heartRate...');
  db.exec(`
    PRAGMA foreign_keys=off;
    BEGIN TRANSACTION;
    ALTER TABLE TELEMETRY RENAME TO _TELEMETRY_old;
    CREATE TABLE TELEMETRY (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deviceId TEXT NOT NULL,
      patientId TEXT NOT NULL,
      heartRate REAL,
      spo2 REAL NOT NULL,
      temperature REAL NOT NULL,
      ecg REAL,
      ecgMode TEXT NOT NULL DEFAULT 'SIMULATED',
      dataMode TEXT NOT NULL DEFAULT 'DEMO',
      status TEXT NOT NULL DEFAULT 'STABLE',
      timestamp TEXT NOT NULL
    );
    INSERT INTO TELEMETRY (id, deviceId, patientId, heartRate, spo2, temperature, ecg, ecgMode, dataMode, status, timestamp)
      SELECT id, deviceId, patientId, heartRate, spo2, temperature, ecg, ecgMode, dataMode, status, timestamp FROM _TELEMETRY_old;
    DROP TABLE _TELEMETRY_old;
    CREATE INDEX IF NOT EXISTS idx_telemetry_patient_time ON TELEMETRY (patientId, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON TELEMETRY (deviceId, timestamp DESC);
    COMMIT;
    PRAGMA foreign_keys=on;
  `);
  console.log('[Migration] Completed successfully!');
} catch (err) {
  console.error('[Migration] Error:', err);
  process.exit(1);
}
