import { db } from '../database/database.js';

/**
 * Prototype Health Status & Alert Evaluation Service
 *
 * NOTE: These are hackathon prototype alert thresholds only.
 * This system monitors vital sign boundaries and does NOT diagnose disease.
 */
class HealthStatusService {
  constructor() {
    // Threshold configuration matching specifications
    this.thresholds = {
      hrCriticalHigh: 120,
      hrAttentionHigh: 100,
      hrAttentionLow: 50,
      spo2CriticalLow: 90.0,
      spo2AttentionLow: 95.0,
      tempCriticalHigh: 39.0,
      tempAttentionHigh: 38.0,
    };

    // Alert throttle tracker to avoid spamming the database every second
    this.recentAlertTimestamps = new Map(); // key: `${patientId}_${type}` -> epoch ms
  }

  /**
   * Evaluates vitals and determines health status: 'CRITICAL' | 'ATTENTION' | 'STABLE' | 'MONITOR'
   */
  evaluateHealthStatus(heartRate, spo2, temperature) {
    if (heartRate == null || spo2 == null || temperature == null) {
      return 'MONITOR';
    }

    const hr = Number(heartRate);
    const o2 = Number(spo2);
    const temp = Number(temperature);

    if (!Number.isFinite(hr) || !Number.isFinite(o2) || !Number.isFinite(temp)) {
      return 'MONITOR';
    }

    // Critical check
    if (hr >= this.thresholds.hrCriticalHigh || o2 <= this.thresholds.spo2CriticalLow || temp >= this.thresholds.tempCriticalHigh) {
      return 'CRITICAL';
    }

    // Attention check
    if (
      hr >= this.thresholds.hrAttentionHigh ||
      hr <= this.thresholds.hrAttentionLow ||
      o2 <= this.thresholds.spo2AttentionLow ||
      temp >= this.thresholds.tempAttentionHigh
    ) {
      return 'ATTENTION';
    }

    return 'STABLE';
  }

  /**
   * Checks for breached thresholds and inserts alert records into ALERTS table
   */
  async evaluateAndGenerateAlerts({ patientId, deviceId, heartRate, spo2, temperature, timestamp }) {
    if (!patientId) return [];

    const hr = Number(heartRate);
    const o2 = Number(spo2);
    const temp = Number(temperature);
    const alertTime = timestamp || new Date().toISOString();
    const generatedAlerts = [];

    // 1. Check Heart Rate
    if (Number.isFinite(hr)) {
      if (hr >= this.thresholds.hrCriticalHigh) {
        const alert = await this._createAlert({
          patientId,
          deviceId,
          type: 'HIGH HEART RATE',
          severity: 'CRITICAL',
          message: `Critical tachycardia: Heart rate reached ${Math.round(hr)} BPM (Critical threshold >= ${this.thresholds.hrCriticalHigh} BPM).`,
          value: hr,
          timestamp: alertTime,
        });
        if (alert) generatedAlerts.push(alert);
      } else if (hr >= this.thresholds.hrAttentionHigh) {
        const alert = await this._createAlert({
          patientId,
          deviceId,
          type: 'HIGH HEART RATE',
          severity: 'ATTENTION',
          message: `Elevated heart rate: ${Math.round(hr)} BPM (Attention threshold >= ${this.thresholds.hrAttentionHigh} BPM).`,
          value: hr,
          timestamp: alertTime,
        });
        if (alert) generatedAlerts.push(alert);
      } else if (hr <= this.thresholds.hrAttentionLow && hr > 0) {
        const alert = await this._createAlert({
          patientId,
          deviceId,
          type: 'LOW HEART RATE',
          severity: 'ATTENTION',
          message: `Bradycardia alert: Heart rate dropped to ${Math.round(hr)} BPM (Threshold <= ${this.thresholds.hrAttentionLow} BPM).`,
          value: hr,
          timestamp: alertTime,
        });
        if (alert) generatedAlerts.push(alert);
      }
    }

    // 2. Check SpO2
    if (Number.isFinite(o2)) {
      if (o2 <= this.thresholds.spo2CriticalLow) {
        const alert = await this._createAlert({
          patientId,
          deviceId,
          type: 'LOW SpO2',
          severity: 'CRITICAL',
          message: `Critical desaturation: SpO2 dropped to ${o2.toFixed(1)}% (Critical threshold <= ${this.thresholds.spo2CriticalLow}%). Immediate airway/oxygen assessment required.`,
          value: o2,
          timestamp: alertTime,
        });
        if (alert) generatedAlerts.push(alert);
      } else if (o2 <= this.thresholds.spo2AttentionLow) {
        const alert = await this._createAlert({
          patientId,
          deviceId,
          type: 'LOW SpO2',
          severity: 'ATTENTION',
          message: `Sub-optimal oxygen saturation: SpO2 at ${o2.toFixed(1)}% (Attention threshold <= ${this.thresholds.spo2AttentionLow}%).`,
          value: o2,
          timestamp: alertTime,
        });
        if (alert) generatedAlerts.push(alert);
      }
    }

    // 3. Check Temperature
    if (Number.isFinite(temp)) {
      if (temp >= this.thresholds.tempCriticalHigh) {
        const alert = await this._createAlert({
          patientId,
          deviceId,
          type: 'HIGH TEMPERATURE',
          severity: 'CRITICAL',
          message: `Hyperpyrexia alert: Body temperature reached ${temp.toFixed(1)}°C (Critical threshold >= ${this.thresholds.tempCriticalHigh}°C).`,
          value: temp,
          timestamp: alertTime,
        });
        if (alert) generatedAlerts.push(alert);
      } else if (temp >= this.thresholds.tempAttentionHigh) {
        const alert = await this._createAlert({
          patientId,
          deviceId,
          type: 'HIGH TEMPERATURE',
          severity: 'ATTENTION',
          message: `Febrile temperature observed: ${temp.toFixed(1)}°C (Attention threshold >= ${this.thresholds.tempAttentionHigh}°C).`,
          value: temp,
          timestamp: alertTime,
        });
        if (alert) generatedAlerts.push(alert);
      }
    }

    return generatedAlerts;
  }

  /**
   * Internal helper to insert alert into database with throttling (max 1 alert per type/patient per 25 seconds)
   */
  async _createAlert({ patientId, deviceId, type, severity, message, value, timestamp }) {
    const throttleKey = `${patientId}_${type}_${severity}`;
    const lastTriggered = this.recentAlertTimestamps.get(throttleKey) || 0;
    const now = Date.now();

    // Check if duplicate unacknowledged alert already exists in last 25 seconds
    if (now - lastTriggered < 25000) {
      return null;
    }

    try {
      const insert = db.prepare(`
        INSERT INTO ALERTS (patientId, deviceId, type, severity, message, value, acknowledged, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `);

      const result = await insert.run(
        patientId,
        deviceId || '',
        type,
        severity,
        message,
        value != null ? Number(value) : null,
        timestamp
      );

      this.recentAlertTimestamps.set(throttleKey, now);

      return {
        id: Number(result.lastInsertRowid),
        patientId,
        deviceId,
        type,
        severity,
        message,
        value,
        acknowledged: false,
        timestamp,
      };
    } catch (err) {
      console.error('[HealthStatusService] Failed to insert alert:', err.message);
      return null;
    }
  }
}

export const healthStatusService = new HealthStatusService();
