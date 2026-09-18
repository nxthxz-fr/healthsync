# HealthSync Cloud Deployment Guide

This guide details how to deploy the complete **HealthSync IoT Remote Patient Monitoring Platform** online using free, production-grade cloud services.

Once deployed, **your development laptop does NOT need to remain running or connected to the internet.** The dashboard, backend REST APIs, continuous ECG synthesis, database, and ESP32 telemetry ingestion will operate 24/7 in the cloud and can be accessed from any smartphone, tablet, or computer worldwide.

---

## 1. Architecture Overview

```
                                  ESP32 IoT Node (Wi-Fi)
                                            │
                                            ▼ HTTPS POST /api/iot/telemetry
📱 Smartphone / 💻 Any Computer  ───────►  Render Web Service (Node.js/Express)
  (https://healthsync.vercel.app)            (https://healthsync-api.onrender.com)
            │                                       │
            │ REST & SSE                            ▼
            └──────────────────────────────► Neon Serverless PostgreSQL
                                              (Persistent Cloud Database)
```

---

## 2. Recommended Cloud Services

| Layer | Recommended Service | Free Tier Capabilities | Why Recommended |
|---|---|---|---|
| **Frontend** | **Vercel** (vercel.com) | Unlimited deployments, global Edge CDN, free automatic HTTPS | Zero-config Vite/React deployment, instant updates on Git push, mobile-responsive |
| **Backend** | **Render** (render.com) | Free Web Service (Node.js 20+), free HTTPS, automatic Git deployments | Native Express support, automatic environment variable binding (`PORT`), zero credit card required |
| **Database** | **Neon PostgreSQL** (neon.tech) OR **Render PostgreSQL** | 0.5 GB storage (Neon) / 1 GB (Render), always persistent, auto-scaling, SSL | **Solves ephemeral disk data loss**: Render Web Service disks reset on sleep/reboot, but Neon PostgreSQL persists patient records & telemetry forever |

---

## 3. Persistent Database Setup (Neon PostgreSQL)

1. Navigate to [https://neon.tech](https://neon.tech) and sign up (takes 30 seconds, no credit card required).
2. Click **Create Project** and name it `healthsync-db`.
3. Select your preferred region (e.g., US East or Europe).
4. Under **Connection Details**, copy the `postgres://...` connection string:
   ```
   postgresql://[user]:[password]@[endpoint].neon.tech/neondb?sslmode=require
   ```
5. *(Optional alternative)*: You can also use Render's 1-click Free PostgreSQL database directly inside Render by selecting **New + → PostgreSQL**.

> **Automatic Migration**: When the backend starts up with `DATABASE_URL`, HealthSync automatically creates all required tables (`PATIENTS`, `DEVICES`, `TELEMETRY`, `ALERTS`), creates performance indices, and seeds the baseline clinical and demo data.

---

## 4. Backend Deployment (Render)

1. Push your HealthSync project to a GitHub repository (e.g. `github.com/your-username/healthsync`).
2. Go to [https://render.com](https://render.com) and log in.
3. Click **New +** → **Web Service**.
4. Select **Build and deploy from a Git repository** and connect your repository.
5. Configure the service settings:
   - **Name**: `healthsync-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Region**: Same or close to your database region (e.g., Oregon or Ohio)
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
6. Click **Advanced** and add the following **Environment Variables**:

| Variable Name | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations and SSL connection pooling |
| `FRONTEND_URL` | `*` *(or your Vercel URL once generated)* | Configures CORS to allow your deployed frontend |
| `DATABASE_URL` | `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` | Neon or Render PostgreSQL connection string |
| `DEVICE_OFFLINE_TIMEOUT_MS` | `45000` | Device offline detection threshold (45 seconds) |

7. Click **Create Web Service**.
8. Wait ~2 minutes for the build to complete. Render will display your public HTTPS backend URL:
   ```
   https://healthsync-backend-xxxx.onrender.com
   ```
9. Verify the backend deployment by opening:
   ```
   https://healthsync-backend-xxxx.onrender.com/api/health
   ```
   It should return:
   ```json
   {
     "status": "ok",
     "service": "HealthSync Backend REST API",
     "database": "PostgreSQL Connected",
     "databaseEngine": "PostgreSQL (Persistent Cloud)"
   }
   ```

---

## 5. Frontend Deployment (Vercel)

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New...** → **Project**.
3. Import your `healthsync` repository.
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:

| Variable Name | Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://healthsync-backend-xxxx.onrender.com` | Your public Render backend HTTPS URL (from Step 4) |

6. Click **Deploy**.
7. Vercel will build the frontend in ~20 seconds and assign a public HTTPS domain:
   ```
   https://healthsync-dashboard-xxxx.vercel.app
   ```
8. *(Optional)* Update the backend's `FRONTEND_URL` variable in Render to:
   ```
   https://healthsync-dashboard-xxxx.vercel.app
   ```

---

## 6. Exact Production URL Formats

- **Frontend URL**: `https://<your-project-name>.vercel.app`
- **Backend API URL**: `https://<your-service-name>.onrender.com`
- **Telemetry Ingestion Endpoint**: `https://<your-service-name>.onrender.com/api/iot/telemetry`
- **Continuous ECG Stream**: `https://<your-service-name>.onrender.com/api/demo/ecg?limit=300`
- **Health Check Endpoint**: `https://<your-service-name>.onrender.com/api/health`

---

## 7. How to Test from a Smartphone or Other Computer

1. On any smartphone (iPhone / Android) or another computer, open Safari or Chrome.
2. Visit your public Vercel frontend URL: `https://<your-project-name>.vercel.app`
3. **Verify Demo Mode**:
   - The top banner displays **DEMO MODE**.
   - The heart rate and SpO2 cards show simulated dynamic vitals labeled **SIMULATED**.
   - The continuous Lead II ECG graph renders smooth mathematical cardiac waveform sweeps labeled `SIMULATED ECG — DEMO DATA`.
4. **Verify Patient CRUD Persistence**:
   - Navigate to **Patients** or click **+ Add Patient**.
   - Register a new test patient (e.g., *Sarah Jenkins, Age 34, O+, Hypertension*).
   - Refresh the page on your phone or open the link on an incognito window.
   - The newly created patient remains permanently saved in the cloud database!
5. **Verify Demo Mode Transitions**:
   - In Settings or the Demo Controller, switch from `NORMAL` to `CRITICAL` or `ATTENTION`.
   - The dashboard updates vitals and triggers clinical alerts in real-time.
   - Switch back to `NORMAL` to verify the dashboard returns to stable sinus rhythm.

---

## 8. How the ESP32 Connects to the Cloud Backend

The ESP32 microcontroller does **not** connect to your development laptop. It connects directly over any available Wi-Fi hotspot or cellular tether to the public HTTPS backend on Render:

### In your Arduino / ESP-IDF Sketch:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

const char* ssid = "YOUR_WIFI_OR_MOBILE_HOTSPOT";
const char* password = "HOTSPOT_PASSWORD";

// Your Render Backend HTTPS Telemetry Endpoint:
const char* serverUrl = "https://healthsync-backend-xxxx.onrender.com/api/iot/telemetry";

void sendTelemetry(float hr, float spo2, float temp) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure(); // Skip certificate validation for rapid hackathon deployment

    HTTPClient https;
    if (https.begin(client, serverUrl)) {
      https.addHeader("Content-Type", "application/json");

      // Construct JSON payload
      String payload = "{";
      payload += "\"deviceId\":\"HEALTHSYNC-ESP32-01\",";
      payload += "\"patientId\":\"PATIENT-001\",";
      if (hr > 0) {
        payload += "\"heartRate\":" + String(hr, 1) + ",";
      } else {
        payload += "\"heartRate\":null,"; // Sensor unseated / no finger
      }
      payload += "\"spo2\":" + String(spo2, 1) + ",";
      payload += "\"temperature\":" + String(temp, 1) + ",";
      payload += "\"ecg\":0.42,";
      payload += "\"dataMode\":\"HARDWARE\",";
      payload += "\"ecgMode\":\"SIMULATED\"";
      payload += "}";

      int httpResponseCode = https.POST(payload);
      Serial.printf("[HTTP] POST Response code: %d\n", httpResponseCode);
      https.end();
    }
  }
}
```

---

## 9. Free-Tier Cloud Characteristics & Limitations

1. **Render Free Tier Spin-Down ("Cold Starts")**:
   - If no requests are received for **15 minutes**, Render puts the free backend instance to sleep to conserve resources.
   - When the first request arrives (e.g., when you first open the dashboard in the morning), Render boots the container. This initial wake-up takes approximately **30 to 45 seconds**.
   - *Hackathon Tip*: 5 minutes before your demo presentation, open the backend URL (`https://your-backend.onrender.com/api/health`) on your phone to wake the container. Once awake, all requests respond in under 100ms.
2. **Database Persistence**:
   - Render's ephemeral disk wipes local SQLite files when restarting the container.
   - **By using Neon PostgreSQL or Render PostgreSQL via `DATABASE_URL`, this limitation is completely eliminated.** All patient records and telemetry packets persist permanently across container restarts.
3. **Bandwidth & Limits**:
   - Vercel: 100 GB/month (far exceeds any hackathon needs).
   - Render: 750 free instance hours per month (sufficient for continuous 24/7 runtime for 1 service for an entire 31-day month).
   - Neon: 0.5 GB storage with unlimited reads/writes within the free tier.

---

## 10. Local Development (Laptop Still Supported!)

Local development remains 100% functional with zero dependencies:

- **Backend (SQLite)**:
  ```bash
  cd backend
  npm install
  npm start
  ```
  Runs on `http://localhost:5000` using the local `healthsync.db` database.

- **Frontend**:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
  Runs on `http://localhost:5173` connecting to `http://localhost:5000`.
