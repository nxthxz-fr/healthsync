import { Router } from 'express';
import { simulationService } from '../services/simulationService.js';
import { healthStatusService } from '../services/healthStatusService.js';
import { db } from '../database/database.js';

const router = Router();

/**
 * GET /api/demo/ecg
 * Return realistic simulated continuous Lead II ECG waveform points.
 * Supports ?limit=300
 */
router.get('/ecg', (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 300, 1000);
    const points = simulationService.getEcgPoints(limit);
    res.json(points);
  } catch (err) {
    console.error('Error fetching simulated ECG:', err);
    res.status(500).json({ success: false, error: 'Failed to generate ECG stream' });
  }
});

/**
 * GET /api/demo/vitals
 * Return live simulated vitals and mode metadata
 */
router.get('/vitals', (req, res) => {
  try {
    const status = simulationService.getDemoStatus();
    res.json(status);
  } catch (err) {
    console.error('Error fetching demo vitals:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve demo vitals' });
  }
});

/**
 * GET /api/demo/mode
 * Return active demo mode ('NORMAL' | 'ATTENTION' | 'CRITICAL')
 */
router.get('/mode', (req, res) => {
  try {
    res.json({
      mode: simulationService.getDemoMode(),
      isDemoMode: true,
      dataMode: 'DEMO',
      ecgMode: 'SIMULATED',
    });
  } catch (err) {
    console.error('Error getting demo mode:', err);
    res.status(500).json({ success: false, error: 'Failed to get demo mode' });
  }
});

/**
 * POST /api/demo/mode
 * Configure demo mode: 'NORMAL' | 'ATTENTION' | 'CRITICAL'
 */
router.post('/mode', async (req, res) => {
  try {
    const { mode } = req.body;
    if (!mode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: mode (Allowed: NORMAL, ATTENTION, CRITICAL)',
      });
    }

    const updated = simulationService.setDemoMode(mode);

    // When NORMAL mode is selected, auto-acknowledge/clear unacknowledged demo alerts for PATIENT-001
    // so that stale CRITICAL ALERT ACTIVE states do not persist on the dashboard.
    if (updated.mode === 'NORMAL') {
      await db.prepare(`
        UPDATE ALERTS 
        SET acknowledged = 1 
        WHERE patientId = 'PATIENT-001' AND acknowledged = 0
      `).run();
    } else if (updated.mode === 'CRITICAL' || updated.mode === 'ATTENTION') {
      // If ATTENTION or CRITICAL selected, clear throttle for PATIENT-001 so demo alert triggers immediately
      for (const key of healthStatusService.recentAlertTimestamps.keys()) {
        if (key.startsWith('PATIENT-001_')) {
          healthStatusService.recentAlertTimestamps.delete(key);
        }
      }
      await healthStatusService.evaluateAndGenerateAlerts({
        patientId: 'PATIENT-001',
        deviceId: 'HEALTHSYNC-ESP32-01',
        heartRate: updated.targets.heartRate,
        spo2: updated.targets.spo2,
        temperature: updated.targets.temperature,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: `Demo mode transitioned to ${updated.mode}`,
      demo: updated,
    });
  } catch (err) {
    console.error('Error setting demo mode:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
