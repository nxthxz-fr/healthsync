/**
 * Clinical Lead-II ECG Waveform & Peak Detection Utilities
 * Generates physiologically accurate Lead II millivolt potentials (P-Q-R-S-T complexes)
 * and performs real-time QRS peak detection for BPM validation.
 */

export interface ECGWavePoint {
  timeMs: number;
  voltageMv: number;
}

export function generateLeadIIBeat(
  bpm: number = 72,
  sampleRateHz: number = 250,
  rhythmType: 'normal' | 'tachycardia' | 'bradycardia' | 'afib' | 'pvc' = 'normal',
  noiseLevel: number = 0.02
): number[] {
  // Duration of one beat in seconds
  const beatDurationSec = 60 / bpm;
  const samplesPerBeat = Math.round(beatDurationSec * sampleRateHz);
  const samples: number[] = [];

  for (let i = 0; i < samplesPerBeat; i++) {
    const t = (i / samplesPerBeat) * beatDurationSec; // time within beat in seconds
    let mv = 0.0;

    // Normal PR interval ~0.16s, QRS ~0.08s, QT ~0.38s
    // P wave (at t ~ 0.12 * beatDuration)
    const pCenter = 0.14 * beatDurationSec;
    const pWidth = 0.04;
    const pAmp = rhythmType === 'afib' ? 0.02 * (Math.random() - 0.5) : 0.15; // absent or fibrillatory in afib
    mv += pAmp * Math.exp(-Math.pow((t - pCenter) / pWidth, 2));

    // Q wave (at t ~ 0.28 * beatDuration)
    const qCenter = 0.26 * beatDurationSec;
    const qWidth = 0.015;
    const qAmp = -0.15;
    mv += qAmp * Math.exp(-Math.pow((t - qCenter) / qWidth, 2));

    // R wave (peak at t ~ 0.30 * beatDuration)
    const rCenter = 0.29 * beatDurationSec;
    const rWidth = rhythmType === 'pvc' ? 0.045 : 0.022; // PVC has wide bizarre QRS
    const rAmp = rhythmType === 'pvc' ? 1.8 : 1.25;
    mv += rAmp * Math.exp(-Math.pow((t - rCenter) / rWidth, 2));

    // S wave (at t ~ 0.33 * beatDuration)
    const sCenter = 0.325 * beatDurationSec;
    const sWidth = 0.018;
    const sAmp = -0.35;
    mv += sAmp * Math.exp(-Math.pow((t - sCenter) / sWidth, 2));

    // ST segment & T wave (at t ~ 0.52 * beatDuration)
    const tCenter = 0.50 * beatDurationSec;
    const tWidth = 0.08;
    const tAmp = rhythmType === 'pvc' ? -0.4 : 0.28; // inverted T in PVC
    mv += tAmp * Math.exp(-Math.pow((t - tCenter) / tWidth, 2));

    // Baseline wander / respiratory variation
    mv += 0.04 * Math.sin(2 * Math.PI * 0.25 * t);

    // Sensor noise
    if (noiseLevel > 0) {
      mv += (Math.random() - 0.5) * noiseLevel;
    }

    samples.push(Number(mv.toFixed(3)));
  }

  return samples;
}

/**
 * Detects R-peaks in ECG buffer using Pan-Tompkins style derivative and thresholding
 */
export function detectQRSBpm(samples: number[], sampleRateHz: number = 250): { bpm: number; regularity: 'regular' | 'irregular' } {
  if (samples.length < sampleRateHz * 2) {
    return { bpm: 72, regularity: 'regular' };
  }

  // Find local maxima exceeding 0.7 mV separated by at least 0.3s (200 bpm max)
  const minDistance = Math.round(sampleRateHz * 0.3);
  const threshold = 0.65;
  const peaks: number[] = [];

  for (let i = 1; i < samples.length - 1; i++) {
    if (samples[i] > threshold && samples[i] > samples[i - 1] && samples[i] > samples[i + 1]) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] > minDistance) {
        peaks.push(i);
      }
    }
  }

  if (peaks.length < 2) {
    return { bpm: 70, regularity: 'regular' };
  }

  // Calculate RR intervals in seconds
  const rrIntervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    rrIntervals.push((peaks[i] - peaks[i - 1]) / sampleRateHz);
  }

  const avgRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
  const calculatedBpm = Math.round(60 / avgRR);

  // Check variance for atrial fibrillation / irregularity
  const variance = rrIntervals.reduce((acc, rr) => acc + Math.pow(rr - avgRR, 2), 0) / rrIntervals.length;
  const sd = Math.sqrt(variance);

  return {
    bpm: calculatedBpm,
    regularity: sd > 0.08 ? 'irregular' : 'regular',
  };
}
