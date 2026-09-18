import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect if PostgreSQL database connection is provided via DATABASE_URL
const databaseUrl = process.env.DATABASE_URL?.trim();
const isPostgres = Boolean(
  databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))
);

/**
 * Normalizes row field names from PostgreSQL (which lowercase unquoted identifiers)
 * to camelCase property names expected by the HealthSync frontend and API consumers.
 */
export function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const normalized = { ...row };
  const keyMap = {
    patientid: 'patientId',
    fullname: 'fullName',
    emergencycontactname: 'emergencyContactName',
    emergencycontactphone: 'emergencyContactPhone',
    bloodgroup: 'bloodGroup',
    medicalnotes: 'medicalNotes',
    createdat: 'createdAt',
    updatedat: 'updatedAt',
    deviceid: 'deviceId',
    devicename: 'deviceName',
    connectionstatus: 'connectionStatus',
    lastseen: 'lastSeen',
    heartrate: 'heartRate',
    ecgmode: 'ecgMode',
    datamode: 'dataMode',
  };

  for (const [k, v] of Object.entries(row)) {
    const mapped = keyMap[k.toLowerCase()];
    if (mapped && normalized[mapped] === undefined) {
      normalized[mapped] = v;
    }
  }

  // Ensure numeric count
  if ('count' in normalized) {
    normalized.count = Number(normalized.count);
  }

  return normalized;
}

/**
 * Convert standard '?' SQLite parameter placeholders to PostgreSQL '$1, $2, ...' placeholders.
 */
function convertPlaceholders(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

let pool = null;
let sqliteDb = null;

if (isPostgres) {
  console.log('[Database] Connecting to Persistent PostgreSQL database (Neon/Cloud)...');
  const useSsl =
    process.env.NODE_ENV === 'production' ||
    databaseUrl.includes('neon.tech') ||
    databaseUrl.includes('render.com') ||
    databaseUrl.includes('sslmode=require');

  pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Handle idle client disconnects cleanly (vital for Neon serverless auto-suspend)
  pool.on('error', (err) => {
    console.error('[Database] Unexpected PostgreSQL pool client error:', err.message);
  });
} else {
  // SQLite Local Development Engine
  const dbDir = path.resolve(__dirname);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.join(dbDir, 'healthsync.db');

  const { DatabaseSync } = await import('node:sqlite');
  sqliteDb = new DatabaseSync(dbPath);
}

/**
 * Unified Database Interface
 * Compatible with synchronous and asynchronous query execution across SQLite and PostgreSQL.
 */
export const db = {
  isPostgres,
  pool,
  sqliteDb,

  prepare(sql) {
    if (isPostgres) {
      return {
        get: async (...params) => {
          const pgSql = convertPlaceholders(sql);
          const res = await pool.query(pgSql, params);
          return res.rows[0] ? normalizeRow(res.rows[0]) : null;
        },
        all: async (...params) => {
          const pgSql = convertPlaceholders(sql);
          const res = await pool.query(pgSql, params);
          return (res.rows || []).map(normalizeRow);
        },
        run: async (...params) => {
          let pgSql = convertPlaceholders(sql);
          const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
          if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
            pgSql += ' RETURNING id';
          }
          const res = await pool.query(pgSql, params);
          const lastInsertRowid = res.rows?.[0]?.id || null;
          return { changes: res.rowCount, lastInsertRowid };
        },
      };
    } else {
      const stmt = sqliteDb.prepare(sql);
      return {
        get: (...params) => normalizeRow(stmt.get(...params)),
        all: (...params) => (stmt.all(...params) || []).map(normalizeRow),
        run: (...params) => stmt.run(...params),
      };
    }
  },

  exec(sql) {
    if (isPostgres) {
      return pool.query(sql);
    } else {
      return sqliteDb.exec(sql);
    }
  },

  async get(sql, ...params) {
    return this.prepare(sql).get(...params);
  },

  async all(sql, ...params) {
    return this.prepare(sql).all(...params);
  },

  async run(sql, ...params) {
    return this.prepare(sql).run(...params);
  },
};

/**
 * Initialize Schema, Tables, Indices, and Baseline Demo Data
 */
export async function initDatabase() {
  if (isPostgres) {
    console.log('[Database] Ensuring PostgreSQL schema & tables exist...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS PATIENTS (
        id SERIAL PRIMARY KEY,
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
        id SERIAL PRIMARY KEY,
        deviceId TEXT UNIQUE NOT NULL,
        patientId TEXT,
        deviceName TEXT,
        connectionStatus TEXT DEFAULT 'OFFLINE',
        lastSeen TEXT,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS TELEMETRY (
        id SERIAL PRIMARY KEY,
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

      CREATE TABLE IF NOT EXISTS ALERTS (
        id SERIAL PRIMARY KEY,
        patientId TEXT NOT NULL,
        deviceId TEXT,
        type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        value REAL,
        acknowledged INTEGER DEFAULT 0,
        timestamp TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_telemetry_patient_time ON TELEMETRY (patientId, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON TELEMETRY (deviceId, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_alerts_patient_time ON ALERTS (patientId, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_alerts_ack ON ALERTS (acknowledged);
      CREATE INDEX IF NOT EXISTS idx_devices_patient ON DEVICES (patientId);
    `);

    // Ensure heartRate is nullable in case table was previously created with NOT NULL
    try {
      await pool.query('ALTER TABLE TELEMETRY ALTER COLUMN heartRate DROP NOT NULL');
    } catch (e) {}
  } else {
    console.log('[Database] Initializing SQLite schema & tables...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    sqliteDb.exec(schemaSql);
  }

  // Clear stale unacknowledged demo alerts for PATIENT-001 so startup state is clean in NORMAL mode
  try {
    await db.prepare("UPDATE ALERTS SET acknowledged = 1 WHERE patientId = 'PATIENT-001' AND acknowledged = 0").run();
  } catch (e) {}

  // Check if PATIENTS table is empty; if so, seed demo patient & devices
  const checkResult = await db.prepare('SELECT COUNT(*) as count FROM PATIENTS').get();
  const count = Number(checkResult?.count || 0);

  if (count === 0) {
    console.log('[Database] Empty database detected. Seeding initial demo patient and device...');
    const now = new Date().toISOString();

    // 1. Primary Demo Patient as required by specifications
    const insertPatient = db.prepare(`
      INSERT INTO PATIENTS (
        patientId, fullName, age, gender, phone, email, address,
        emergencyContactName, emergencyContactPhone, bloodGroup, medicalNotes,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await insertPatient.run(
      'PATIENT-001',
      'Demo Patient',
      25,
      'Male',
      '0000000000',
      'demo@example.com',
      'Demo Address',
      'Emergency Contact',
      '0000000000',
      'O+',
      'Demo patient for hackathon presentation. MARKED AS DEMO DATA.',
      now,
      now
    );

    // 2. Primary Device as required
    const insertDevice = db.prepare(`
      INSERT INTO DEVICES (deviceId, patientId, deviceName, connectionStatus, lastSeen, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    await insertDevice.run(
      'HEALTHSYNC-ESP32-01',
      'PATIENT-001',
      'ESP32 DevKit Node 01',
      'ONLINE',
      now,
      now
    );

    // 3. Initial Telemetry Record for Demo Patient
    const insertTelemetry = db.prepare(`
      INSERT INTO TELEMETRY (deviceId, patientId, heartRate, spo2, temperature, ecg, ecgMode, dataMode, status, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await insertTelemetry.run(
      'HEALTHSYNC-ESP32-01',
      'PATIENT-001',
      76.0,
      98.2,
      36.8,
      0.42,
      'SIMULATED',
      'DEMO',
      'STABLE',
      now
    );

    // 4. Seed companion clinical demo patients for rich dashboard showcase
    const companionPatients = [
      {
        id: 'P-101',
        name: 'Arthur Vance',
        age: 68,
        gender: 'Male',
        phone: '+1 (555) 234-8901',
        email: 'arthur.vance@example.com',
        address: 'Room Cardio-Stepdown 3B',
        contact: 'Martha Vance',
        cphone: '+1 (555) 234-8902',
        blood: 'A+',
        notes: 'Congestive Heart Failure (NYHA II), COPD Gold Stage 2, Hypertension. Lisinopril 20mg.',
        device: 'ESP32-DEV-901',
        devName: 'Cardio Telemetry Unit 1',
        hr: 76,
        spo2: 97.4,
        temp: 36.7,
        status: 'STABLE',
      },
      {
        id: 'P-102',
        name: 'Elena Rostova',
        age: 54,
        gender: 'Female',
        phone: '+1 (555) 345-6789',
        email: 'elena.rostova@example.com',
        address: 'Room Post-Op Recovery 12',
        contact: 'Dmitri Rostov',
        cphone: '+1 (555) 345-6790',
        blood: 'O+',
        notes: 'Post-CABG (Day 4), Hyperlipidemia, Type 2 Diabetes. Metoprolol 25mg BID.',
        device: 'ESP32-DEV-902',
        devName: 'Recovery Ward Unit 2',
        hr: 70,
        spo2: 98.5,
        temp: 36.8,
        status: 'STABLE',
      },
      {
        id: 'P-103',
        name: 'Marcus Brody',
        age: 72,
        gender: 'Male',
        phone: '+1 (555) 789-0123',
        email: 'marcus.brody@example.com',
        address: 'Room Pulmonary Intermediate 4A',
        contact: 'David Brody',
        cphone: '+1 (555) 789-0124',
        blood: 'B-',
        notes: 'Acute Lobar Pneumonia, Chronic Bronchitis. Desaturation observed during sleep.',
        device: 'ESP32-DEV-903',
        devName: 'Pulmonary Monitor 3',
        hr: 104,
        spo2: 92.5,
        temp: 38.3,
        status: 'ATTENTION',
      },
      {
        id: 'P-104',
        name: 'Linda Diaz',
        age: 45,
        gender: 'Female',
        phone: '+1 (555) 456-7890',
        email: 'linda.diaz@example.com',
        address: 'Room General Surgery 204',
        contact: 'Carlos Diaz',
        cphone: '+1 (555) 456-7891',
        blood: 'A-',
        notes: 'Post-Laparoscopic Appendectomy (Day 2), Mild Asthma. Healing well.',
        device: 'ESP32-DEV-904',
        devName: 'General Surgery Unit 4',
        hr: 72,
        spo2: 98.8,
        temp: 36.6,
        status: 'STABLE',
      },
      {
        id: 'P-105',
        name: 'Robert Chen',
        age: 61,
        gender: 'Male',
        phone: '+1 (555) 678-9012',
        email: 'robert.chen@example.com',
        address: 'Room Nephrology Suite 8',
        contact: 'Emily Chen',
        cphone: '+1 (555) 678-9013',
        blood: 'AB+',
        notes: 'Chronic Kidney Disease Stage 3b, Diabetic Nephropathy. Offline battery check.',
        device: 'ESP32-DEV-905',
        devName: 'Nephrology Ward Unit 5',
        hr: 74,
        spo2: 96.5,
        temp: 36.8,
        status: 'STABLE',
      },
    ];

    for (const p of companionPatients) {
      await insertPatient.run(
        p.id,
        p.name,
        p.age,
        p.gender,
        p.phone,
        p.email,
        p.address,
        p.contact,
        p.cphone,
        p.blood,
        p.notes,
        now,
        now
      );

      await insertDevice.run(
        p.device,
        p.id,
        p.devName,
        p.id === 'P-105' ? 'OFFLINE' : 'ONLINE',
        p.id === 'P-105' ? new Date(Date.now() - 1000 * 60 * 25).toISOString() : now,
        now
      );

      // Seed 10 recent historical telemetry points for each
      for (let i = 10; i >= 0; i--) {
        const t = new Date(Date.now() - i * 5000).toISOString();
        await insertTelemetry.run(
          p.device,
          p.id,
          p.hr + (Math.random() - 0.5) * 2,
          Number((p.spo2 + (Math.random() - 0.5) * 0.4).toFixed(1)),
          Number((p.temp + (Math.random() - 0.5) * 0.1).toFixed(1)),
          0.38,
          'SIMULATED',
          'DEMO',
          p.status,
          t
        );
      }
    }

    // Seed initial attention alert for Marcus Brody (P-103)
    const insertAlert = db.prepare(`
      INSERT INTO ALERTS (patientId, deviceId, type, severity, message, value, acknowledged, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await insertAlert.run(
      'P-103',
      'ESP32-DEV-903',
      'LOW SpO2',
      'ATTENTION',
      'Oxygen saturation dropped to 92.5% (Threshold <= 95%). Respiratory rate evaluation advised.',
      92.5,
      0,
      now
    );

    console.log('[Database] Seeding completed successfully.');
  }
}
