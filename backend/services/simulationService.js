/**
 * ========================================================
 * HEALTHSYNC SIMULATION SERVICE
 * ========================================================
 * Generates realistic physiologic parameters and continuous
 * Lead II ECG waveforms (P-Q-R-S-T morphology).
 *
 * All values generated here are explicitly labeled as:
 * - "DEMO MODE"
 * - "SIMULATED DATA"
 * - "SIMULATED BPM"
 * - "SIMULATED SpO2"
 * - "SIMULATED TEMPERATURE"
 * - "SIMULATED ECG — DEMO DATA"
 * ========================================================
 */

class SimulationService {
  constructor() {
    this.currentMode = 'NORMAL';

    // Target values configured per demo mode
    this.modeConfigs = {
      NORMAL: {
        hrMin: 72,
        hrMax: 82,
        spo2Min: 97.0,
        spo2Max: 99.0,
        tempMin: 36.6,
        tempMax: 37.0,
        status: 'STABLE',
      },
      ATTENTION: {
        hrMin: 102,
        hrMax: 108,
        spo2Min: 92.0,
        spo2Max: 94.5,
        tempMin: 38.1,
        tempMax: 38.5,
        status: 'ATTENTION',
      },
      CRITICAL: {
        hrMin: 124,
        hrMax: 135,
        spo2Min: 86.0,
        spo2Max: 89.5,
        tempMin: 39.2,
        tempMax: 39.8,
        status: 'CRITICAL',
      },
    };

    // Current smoothed vitals state
    this.currentVitals = {
      heartRate: 76.0,
      spo2: 98.2,
      temperature: 36.8,
      status: 'STABLE',
    };

    // Target vitals towards which current values smoothly glide
    this.targetVitals = {
      heartRate: 76.0,
      spo2: 98.2,
      temperature: 36.8,
      status: 'STABLE',
    };

    // ECG Buffer: keeps recent 300 points
    this.ecgBuffer = [];
    this.maxEcgPoints = 300;
    this.ecgSampleRateHz = 100; // 100 samples/sec for smooth network transmission & charting
    this.ecgPhase = 0; // Phase tracker [0, 1)

    // Initialize ECG buffer
    this._initializeEcgBuffer();

    // Start background simulation loops
    this._startVitalsUpdateLoop();
    this._startEcgGeneratorLoop();
  }

  /**
   * Set Demo Mode: 'NORMAL' | 'ATTENTION' | 'CRITICAL'
   * Transitions vitals smoothly over time.
   */
  setDemoMode(mode) {
    const validModes = ['NORMAL', 'ATTENTION', 'CRITICAL'];
    const selected = mode?.toUpperCase();
    if (!validModes.includes(selected)) {
      throw new Error(`Invalid demo mode '${mode}'. Allowed: ${validModes.join(', ')}`);
    }

    this.currentMode = selected;
    const cfg = this.modeConfigs[selected];

    // Pick a new target in that range
    this.targetVitals.heartRate = (cfg.hrMin + cfg.hrMax) / 2;
    this.targetVitals.spo2 = (cfg.spo2Min + cfg.spo2Max) / 2;
    this.targetVitals.temperature = (cfg.tempMin + cfg.tempMax) / 2;
    this.targetVitals.status = cfg.status;

    // Ensure immediate clinical status alignment with chosen mode
    if (selected === 'NORMAL') {
      this.currentVitals.status = 'STABLE';
      if (this.currentVitals.heartRate > 85) this.currentVitals.heartRate = 80.0;
      if (this.currentVitals.spo2 < 96) this.currentVitals.spo2 = 98.0;
      if (this.currentVitals.temperature > 37.2) this.currentVitals.temperature = 36.8;
    } else if (selected === 'ATTENTION') {
      this.currentVitals.status = 'ATTENTION';
      if (this.currentVitals.heartRate < 98) this.currentVitals.heartRate = 104.0;
      if (this.currentVitals.spo2 > 95) this.currentVitals.spo2 = 93.0;
    } else if (selected === 'CRITICAL') {
      this.currentVitals.status = 'CRITICAL';
      if (this.currentVitals.heartRate < 120) this.currentVitals.heartRate = 126.0;
      if (this.currentVitals.spo2 > 90) this.currentVitals.spo2 = 88.0;
    }

    console.log(`[SimulationService] Demo mode transitioned to: ${this.currentMode}`);
    return this.getDemoStatus();
  }

  getDemoMode() {
    return this.currentMode;
  }

  getDemoStatus() {
    return {
      mode: this.currentMode,
      isDemoMode: true,
      dataMode: 'DEMO',
      ecgMode: 'SIMULATED',
      labels: {
        mode: 'DEMO MODE',
        heartRate: 'SIMULATED BPM',
        spo2: 'SIMULATED SpO2',
        temperature: 'SIMULATED TEMPERATURE',
        ecg: 'SIMULATED ECG — DEMO DATA',
      },
      vitals: {
        heartRate: Math.round(this.currentVitals.heartRate),
        spo2: Number(this.currentVitals.spo2.toFixed(1)),
        temperature: Number(this.currentVitals.temperature.toFixed(1)),
        status: this.currentVitals.status,
      },
      targets: { ...this.targetVitals },
    };
  }

  /**
   * Return recent ECG points for dashboard (e.g. limit = 300)
   */
  getEcgPoints(limit = 300) {
    const count = Math.min(limit, this.ecgBuffer.length);
    return this.ecgBuffer.slice(-count);
  }

  /**
   * Compute single Lead II ECG point at given phase [0, 1) of a cardiac beat
   * Uses Gaussian bell superposition for P, Q, R, S, T waves.
   */
  _calculateEcgVoltage(phase) {
    // Normal sinus Lead II morphology
    const gaussian = (p, mu, sigma, amp) => {
      const diff = p - mu;
      return amp * Math.exp(-(diff * diff) / (2 * sigma * sigma));
    };

    // Wave parameters: [center, width (sigma), amplitude (mV)]
    const pWave = gaussian(phase, 0.16, 0.024, 0.16);
    const qWave = gaussian(phase, 0.28, 0.009, -0.16);
    const rWave = gaussian(phase, 0.32, 0.012, 1.35);
    const sWave = gaussian(phase, 0.36, 0.011, -0.36);
    const tWave = gaussian(phase, 0.58, 0.045, 0.32);

    // Subtle baseline respiratory wander (0.2 Hz)
    const wander = 0.02 * Math.sin(Date.now() / 800);
    // Micro physiological noise (not random chaos)
    const microNoise = (Math.random() - 0.5) * 0.015;

    return Number((pWave + qWave + rWave + sWave + tWave + wander + microNoise).toFixed(3));
  }

  /**
   * Pre-fill the buffer with 300 continuous points so the graph is never blank
   */
  _initializeEcgBuffer() {
    const now = Date.now();
    const dt = 1000 / this.ecgSampleRateHz;
    let phase = 0;

    for (let i = this.maxEcgPoints; i > 0; i--) {
      const timestamp = new Date(now - i * dt).toISOString();
      const value = this._calculateEcgVoltage(phase);
      this.ecgBuffer.push({ timestamp, value });

      // Advance beat phase based on heart rate
      const beatPeriodSec = 60 / this.currentVitals.heartRate;
      phase = (phase + (dt / 1000) / beatPeriodSec) % 1.0;
    }
    this.ecgPhase = phase;
  }

  /**
   * Generates continuous ECG points in real time
   */
  _startEcgGeneratorLoop() {
    const dtMs = 1000 / this.ecgSampleRateHz; // 10ms per sample

    setInterval(() => {
      const beatPeriodSec = 60 / Math.max(40, this.currentVitals.heartRate);
      const phaseDelta = (dtMs / 1000) / beatPeriodSec;

      this.ecgPhase = (this.ecgPhase + phaseDelta) % 1.0;
      const val = this._calculateEcgVoltage(this.ecgPhase);

      const pt = {
        timestamp: new Date().toISOString(),
        value: val,
      };

      this.ecgBuffer.push(pt);
      if (this.ecgBuffer.length > this.maxEcgPoints) {
        this.ecgBuffer.shift();
      }
    }, dtMs);
  }

  /**
   * Smoothly glides current vitals towards target vitals with gradual physiologic drift
   */
  _startVitalsUpdateLoop() {
    setInterval(() => {
      const cfg = this.modeConfigs[this.currentMode];

      // Subtle physiologic fluctuations around target
      const hrJitter = (Math.random() - 0.5) * 0.8;
      const spo2Jitter = (Math.random() - 0.5) * 0.15;
      const tempJitter = (Math.random() - 0.5) * 0.02;

      const targetHr = Math.min(cfg.hrMax, Math.max(cfg.hrMin, this.targetVitals.heartRate + hrJitter));
      const targetSpo2 = Math.min(cfg.spo2Max, Math.max(cfg.spo2Min, this.targetVitals.spo2 + spo2Jitter));
      const targetTemp = Math.min(cfg.tempMax, Math.max(cfg.tempMin, this.targetVitals.temperature + tempJitter));

      // Exponential smoothing (LERP) for gradual natural transition (alpha = 0.15)
      const alpha = 0.15;
      this.currentVitals.heartRate += (targetHr - this.currentVitals.heartRate) * alpha;
      this.currentVitals.spo2 += (targetSpo2 - this.currentVitals.spo2) * alpha;
      this.currentVitals.temperature += (targetTemp - this.currentVitals.temperature) * alpha;

      // Determine clinical status based on prototype thresholds & active demo mode
      if (this.currentMode === 'NORMAL') {
        this.currentVitals.status = 'STABLE';
      } else if (this.currentVitals.heartRate >= 120 || this.currentVitals.spo2 <= 90 || this.currentVitals.temperature >= 39.0) {
        this.currentVitals.status = 'CRITICAL';
      } else if (
        this.currentVitals.heartRate >= 100 ||
        this.currentVitals.heartRate <= 50 ||
        this.currentVitals.spo2 <= 95 ||
        this.currentVitals.temperature >= 38.0
      ) {
        this.currentVitals.status = 'ATTENTION';
      } else {
        this.currentVitals.status = 'STABLE';
      }
    }, 1000);
  }
}

export const simulationService = new SimulationService();
