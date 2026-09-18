import { Router } from 'express';
import { db } from '../database/database.js';

const router = Router();

/**
 * GET /api/alerts
 * Return all alerts, ordered by timestamp descending.
 */
router.get('/', async (req, res) => {
  try {
    const { patientId, unacknowledged } = req.query;

    let query = 'SELECT * FROM ALERTS WHERE 1=1';
    const params = [];

    if (patientId) {
      query += ' AND patientId = ?';
      params.push(patientId);
    }

    if (unacknowledged === 'true') {
      query += ' AND acknowledged = 0';
    }

    query += ' ORDER BY timestamp DESC LIMIT 100';

    const stmt = db.prepare(query);
    const rows = await stmt.all(...params);

    // Format rows for frontend compatibility
    const formatted = await Promise.all(
      rows.map(async (a) => {
        let patientName = a.patientId;
        try {
          const p = await db.prepare('SELECT fullName FROM PATIENTS WHERE patientId = ?').get(a.patientId);
          if (p) patientName = p.fullName;
        } catch (e) {}

        return {
          id: String(a.id),
          patientId: a.patientId,
          patientName,
          deviceId: a.deviceId,
          roomBed: 'Cardio Telemetry Ward',
          timestamp: a.timestamp,
          severity: a.severity, // 'CRITICAL' | 'ATTENTION'
          title: a.type,
          description: a.message,
          value: a.value,
          vitalsSnapshot: {
            heartRate: a.type.includes('HEART') ? a.value : 76,
            spo2: a.type.includes('SpO2') ? a.value : 98,
            temperature: a.type.includes('TEMPERATURE') ? a.value : 36.8,
            signalQuality: 'good',
          },
          acknowledged: Boolean(a.acknowledged),
        };
      })
    );

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve alerts' });
  }
});

/**
 * POST /api/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.post('/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy } = req.body;

    const existing = await db.prepare('SELECT * FROM ALERTS WHERE id = ?').get(Number(alertId));
    if (!existing) {
      return res.status(404).json({ success: false, error: `Alert '${alertId}' not found` });
    }

    await db.prepare('UPDATE ALERTS SET acknowledged = 1 WHERE id = ?').run(Number(alertId));

    res.json({
      success: true,
      message: `Alert ${alertId} acknowledged`,
      alert: {
        ...existing,
        acknowledged: true,
        acknowledgedBy: acknowledgedBy || 'Dr. Sarah Chen, MD',
        acknowledgedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Error acknowledging alert:', err);
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
  }
});

export default router;
