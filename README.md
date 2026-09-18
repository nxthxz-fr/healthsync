# HealthSync — IoT-Enabled Remote Patient Health Monitoring Platform

HealthSync is a complete, full-stack, local-first IoT patient health monitoring system developed for college hackathons. It integrates real hardware telemetry (ESP32 microcontroller with a DS18B20 digital temperature probe and an optical pulse sensor), simulated biomedical data (continuous Lead II ECG waveform generator and SpO2 model), a local SQLite database, and an intuitive, real-time clinical monitoring dashboard.

---

## Architecture Overview

```
               [ HARDWARE LAYER ]
  ESP32 DevKit + DS18B20 Temp + Pulse Sensor + AD8232 ECG
  Status LEDs (Green/Yellow/Red) + Emergency Buzzer
                         │
                         │ Wi-Fi HTTP POST (JSON)
                         ▼
             [ HEALTHSYNC BACKEND (PORT 5000) ]
  Node.js + Express REST API + CORS + SQLite (healthsync.db)
  • /api/patients       (CRUD, Baselines, Profiles)
  • /api/iot/telemetry  (Ingestion, Timestamping, Liveness)
  • /api/devices        (Device Fleet Management)
  • /api/alerts         (Threshold Evaluator & Acknowledgments)
  • /api/demo           (P-Q-R-S-T ECG Synthesizer, Mode Transitions)
                         │
                         │ REST / Polling (1s Interval)
                         ▼
             [ HEALTHSYNC FRONTEND (PORT 5173) ]
  React + Vite + Tailwind CSS + Lucide Icons
  • Patient Profiles & Bed Management
  • Real-Time Vitals Display (HR, SpO2, Temperature)
  • Live Lead II ECG Oscilloscope Sweep (200-300 Points)
  • Demo Mode Controls (NORMAL, ATTENTION, CRITICAL)
  • Historical Telemetry Graphs (BPM, SpO2, Temp over time)
  • Emergency Alert Notification & Acknowledgment Panel
```

---

## Technology Stack

- **Backend**: Node.js (v20+ / v24), Express.js, CORS, Dotenv.
- **Database**: SQLite (`node:sqlite` native zero-dependency engine; data persisted in `backend/database/healthsync.db`).
- **Frontend**: React 19, Vite 6, Tailwind CSS v4, Lucide React icons.
- **Hardware**: ESP32 DevKit V1, Dallas DS18B20 digital temperature probe, optical pulse sensor, AD8232 ECG module, 3 status LEDs, active buzzer.

---

## Quick Start (Run Locally)

### 1. Installation
In the project root directory, run:
```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Return to root
cd ..
```

### 2. Start Both Backend and Frontend Concurrently
From the root folder:
```bash
npm run dev
```

Or start them in separate terminal windows:
```bash
# Terminal 1: Backend (Port 5000)
cd backend
npm run dev

# Terminal 2: Frontend (Port 5173)
cd frontend
npm run dev
```

### 3. Open in Browser
- **Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## Environment Variables

### Frontend (`frontend/.env`)
```ini
VITE_API_BASE_URL=http://localhost:5000
```

### Backend (`backend/.env`)
```ini
PORT=5000
NODE_ENV=development
CORS_ORIGIN=*
DATABASE_PATH=./database/healthsync.db
```

---

## REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | API status and endpoint catalog |
| `GET` | `/api/health` | Health check & uptime |
| `GET` | `/api/system/status` | System health, active devices, and KPI counts |
| `GET` | `/api/patients` | List all registered patients |
| `GET` | `/api/patients/:patientId` | Get single patient profile & recent history |
| `POST` | `/api/patients` | Register new patient (patientId, fullName, age, etc.) |
| `PUT` | `/api/patients/:patientId` | Update patient demographic or medical data |
| `DELETE` | `/api/patients/:patientId` | Safely remove patient (preserves telemetry logs) |
| `GET` | `/api/patients/:patientId/latest` | Retrieve latest recorded vital parameters |
| `GET` | `/api/patients/:patientId/history` | Historical telemetry records (`?limit=100`) |
| `GET` | `/api/patients/:patientId/alerts` | List alerts for specific patient |
| `POST` | `/api/patients/:patientId/notes` | Add physician clinical note |
| `POST` | `/api/iot/telemetry` | Ingest telemetry packet from ESP32 or demo sender |
| `GET` | `/api/devices` | List registered IoT devices and online/offline status |
| `POST` | `/api/devices/:deviceId/assign` | Bind IoT node to patient |
| `POST` | `/api/iot/device-toggle` | Toggle device connection status |
| `GET` | `/api/alerts` | List all emergency alerts (`?unacknowledged=true`) |
| `POST` | `/api/alerts/:alertId/acknowledge` | Acknowledge alert with responder signature |
| `GET` | `/api/demo/ecg` | Continuous simulated Lead II ECG waveform points (`?limit=300`) |
| `GET` | `/api/demo/vitals` | Current simulated parameters and label metadata |
| `GET` | `/api/demo/mode` | Get active demo mode |
| `POST` | `/api/demo/mode` | Switch demo mode (`NORMAL`, `ATTENTION`, `CRITICAL`) |

---

## Testing

Run the automated backend test suite (verifies all 14 endpoints and database persistence):
```bash
npm run test:api
# or
node backend/test_api.js
```

---

## Hardware Telemetry (ESP32)

See `esp32/healthsync_esp32.ino` for the full Arduino sketch.
- **Payload Format sent to `POST /api/iot/telemetry`**:
```json
{
  "deviceId": "HEALTHSYNC-ESP32-01",
  "patientId": "PATIENT-001",
  "heartRate": 76.5,
  "spo2": 98.0,
  "temperature": 36.75,
  "ecg": 0.42,
  "ecgMode": "SIMULATED",
  "dataMode": "HARDWARE",
  "status": "STABLE",
  "timestamp": "2026-09-18T10:00:00Z"
}
```
