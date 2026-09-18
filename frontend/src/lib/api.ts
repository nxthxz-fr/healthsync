/**
 * HealthSync API Client
 * Configured with VITE_API_BASE_URL (defaults to http://localhost:5000)
 */

const FALLBACK_PROD_URL = 'https://healthsync-backend-ulqj.onrender.com';
const FALLBACK_DEV_URL = 'http://localhost:5000';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? FALLBACK_PROD_URL : FALLBACK_DEV_URL)
).replace(/\/+$/, '');

export async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const errBody = await res.json();
      if (errBody && errBody.error) errorMsg = errBody.error;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return res.json();
}

// 1. Patients APIs
export const api = {
  getBaseUrl: () => API_BASE_URL,

  // Patients
  getPatients: () => fetchJson<any[]>('/api/patients'),
  getPatientById: (patientId: string) => fetchJson<any>(`/api/patients/${encodeURIComponent(patientId)}`),
  createPatient: (patientData: any) =>
    fetchJson<any>('/api/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    }),
  updatePatient: (patientId: string, patientData: any) =>
    fetchJson<any>(`/api/patients/${encodeURIComponent(patientId)}`, {
      method: 'PUT',
      body: JSON.stringify(patientData),
    }),
  deletePatient: (patientId: string) =>
    fetchJson<any>(`/api/patients/${encodeURIComponent(patientId)}`, {
      method: 'DELETE',
    }),
  getPatientLatest: (patientId: string) =>
    fetchJson<any>(`/api/patients/${encodeURIComponent(patientId)}/latest`),
  getPatientHistory: (patientId: string, limit = 100) =>
    fetchJson<{ patientId: string; history: any[] }>(`/api/patients/${encodeURIComponent(patientId)}/history?limit=${limit}`),
  getPatientAlerts: (patientId: string) =>
    fetchJson<any[]>(`/api/patients/${encodeURIComponent(patientId)}/alerts`),
  addPatientNote: (patientId: string, content: string, author?: string, category?: string) =>
    fetchJson<any>(`/api/patients/${encodeURIComponent(patientId)}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content, author, category }),
    }),

  // Devices
  getDevices: () => fetchJson<any[]>('/api/devices'),
  toggleDeviceStatus: (deviceId: string, status: 'online' | 'offline') =>
    fetchJson<any>('/api/iot/device-toggle', {
      method: 'POST',
      body: JSON.stringify({ deviceId, status }),
    }),
  assignDevice: (deviceId: string, patientId: string) =>
    fetchJson<any>(`/api/devices/${encodeURIComponent(deviceId)}/assign`, {
      method: 'POST',
      body: JSON.stringify({ patientId }),
    }),

  // Telemetry
  postTelemetry: (telemetry: any) =>
    fetchJson<any>('/api/iot/telemetry', {
      method: 'POST',
      body: JSON.stringify(telemetry),
    }),

  // Alerts
  getAlerts: (unacknowledged = false) =>
    fetchJson<any[]>(`/api/alerts${unacknowledged ? '?unacknowledged=true' : ''}`),
  acknowledgeAlert: (alertId: string, acknowledgedBy?: string) =>
    fetchJson<any>(`/api/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ acknowledgedBy }),
    }),

  // Demo Simulation & ECG
  getDemoEcg: (limit = 300) =>
    fetchJson<{ timestamp: string; value: number }[]>(`/api/demo/ecg?limit=${limit}`),
  getDemoVitals: () => fetchJson<any>('/api/demo/vitals'),
  getDemoMode: () => fetchJson<{ mode: string }>('/api/demo/mode'),
  setDemoMode: (mode: 'NORMAL' | 'ATTENTION' | 'CRITICAL') =>
    fetchJson<any>('/api/demo/mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    }),

  // System Status
  getSystemStatus: () => fetchJson<any>('/api/system/status'),
};
