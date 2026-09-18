import { PatientBaseline, RiskAnalysisResult, RiskFactorContribution, RiskLevel, SignalQuality, VitalReading } from '../types';

/**
 * Deterministic Clinical Multi-Parameter Risk Engine
 * Implements clinical early warning criteria (NEWS2-adapted) + Patient Personal Baseline + Trend slopes.
 * NEVER generates random or arbitrary values.
 */
export function calculateRiskAnalysis(
  current: VitalReading,
  baseline: PatientBaseline,
  recentHistory: VitalReading[] = [],
  medicalConditions: string[] = []
): RiskAnalysisResult {
  const factors: RiskFactorContribution[] = [];
  let totalScore = 0;

  const hr = current.heartRate;
  const spo2 = current.spo2;
  const temp = current.temperature;
  const signalQuality = current.signalQuality;

  // 1. SIGNAL QUALITY VERIFICATION
  let isReliable = true;
  let reliabilityWarning: string | undefined = undefined;

  if (signalQuality.overall === 'no_signal') {
    isReliable = false;
    reliabilityWarning = 'CRITICAL: No sensor signal received from device electrodes/probes.';
    factors.push({
      parameter: 'SIGNAL_QUALITY',
      label: 'Sensor Disconnect / Zero Signal',
      points: 20,
      severity: 'severe',
      observation: 'Leads detached or wireless connection packet dropped.',
      deviationText: 'Signal: 0%',
    });
    totalScore += 20;
  } else if (signalQuality.overall === 'poor') {
    isReliable = false;
    reliabilityWarning = 'High noise / motion artifact detected. Sensor values may be inaccurate.';
    factors.push({
      parameter: 'SIGNAL_QUALITY',
      label: 'Poor Signal Impedance',
      points: 10,
      severity: 'moderate',
      observation: 'Signal SNR below clinical threshold. Verify probe placement.',
      deviationText: 'High Artifact',
    });
    totalScore += 10;
  }

  // 2. HEART RATE ANALYSIS (Vs Clinical Thresholds & Patient Baseline)
  let hrPoints = 0;
  let hrSeverity: 'normal' | 'minor' | 'moderate' | 'severe' = 'normal';
  let hrObs = 'Heart rate within acceptable parameters.';

  if (hr !== null) {
    const hrBaselineDelta = hr - baseline.hrMean;

    if (hr < 40) {
      hrPoints = 35;
      hrSeverity = 'severe';
      hrObs = `Severe life-threatening bradycardia (${hr} BPM).`;
    } else if (hr < 50) {
      hrPoints = 25;
      hrSeverity = 'moderate';
      hrObs = `Marked bradycardia (${hr} BPM).`;
    } else if (hr < 60) {
      if (baseline.hrMin > 62) {
        hrPoints = 12;
        hrSeverity = 'minor';
        hrObs = `Mild sinus bradycardia below patient baseline range (${baseline.hrMin}-${baseline.hrMax} BPM).`;
      }
    } else if (hr > 135) {
      hrPoints = 35;
      hrSeverity = 'severe';
      hrObs = `Severe tachycardia (${hr} BPM), extreme cardiac workload.`;
    } else if (hr > 115) {
      hrPoints = 25;
      hrSeverity = 'moderate';
      hrObs = `Moderate tachycardia (${hr} BPM).`;
    } else if (hr > 95) {
      if (hr > baseline.hrMax + 10) {
        hrPoints = 14;
        hrSeverity = 'minor';
        hrObs = `Elevated heart rate (+${Math.round(hrBaselineDelta)} BPM over personal baseline).`;
      }
    }

    // Add baseline deviation penalty if significant
    if (Math.abs(hrBaselineDelta) > 25 && hrPoints < 25) {
      hrPoints += 8;
    }

    if (hrPoints > 0) {
      factors.push({
        parameter: 'HEART_RATE',
        label: 'Heart Rate Deviation',
        points: hrPoints,
        severity: hrSeverity,
        observation: hrObs,
        deviationText: `${hrBaselineDelta >= 0 ? '+' : ''}${Math.round(hrBaselineDelta)} BPM from baseline (${baseline.hrMean})`,
      });
      totalScore += hrPoints;
    }
  }

  // 3. SpO2 OXYGEN SATURATION ANALYSIS
  let spo2Points = 0;
  let spo2Severity: 'normal' | 'minor' | 'moderate' | 'severe' = 'normal';
  let spo2Obs = 'Oxygen saturation within normal range.';
  const spo2Delta = spo2 - baseline.spo2Mean;

  if (spo2 <= 85) {
    spo2Points = 45;
    spo2Severity = 'severe';
    spo2Obs = `Critical hypoxemic respiratory failure (${spo2}%). Immediate airway/O2 protocol required.`;
  } else if (spo2 <= 89) {
    spo2Points = 35;
    spo2Severity = 'severe';
    spo2Obs = `Severe hypoxemia (${spo2}%). Urgent oxygenation needed.`;
  } else if (spo2 <= 92) {
    spo2Points = 22;
    spo2Severity = 'moderate';
    spo2Obs = `Moderate desaturation (${spo2}%).`;
  } else if (spo2 <= 94) {
    spo2Points = 12;
    spo2Severity = 'minor';
    spo2Obs = `Mild desaturation below clinical threshold (${spo2}%).`;
  } else if (spo2Delta < -3) {
    spo2Points = 8;
    spo2Severity = 'minor';
    spo2Obs = `SpO₂ (${spo2}%) has fallen below patient typical baseline (${baseline.spo2Mean}%).`;
  }

  if (spo2Points > 0) {
    factors.push({
      parameter: 'SPO2',
      label: 'SpO₂ Desaturation',
      points: spo2Points,
      severity: spo2Severity,
      observation: spo2Obs,
      deviationText: `${spo2Delta >= 0 ? '+' : ''}${spo2Delta.toFixed(1)}% vs baseline (${baseline.spo2Mean}%)`,
    });
    totalScore += spo2Points;
  }

  // 4. BODY TEMPERATURE ANALYSIS
  let tempPoints = 0;
  let tempSeverity: 'normal' | 'minor' | 'moderate' | 'severe' = 'normal';
  let tempObs = 'Temperature normothermic.';
  const tempDelta = temp - baseline.tempMean;

  if (temp < 35.0) {
    tempPoints = 30;
    tempSeverity = 'severe';
    tempObs = `Severe hypothermia (<35.0°C).`;
  } else if (temp < 35.8) {
    tempPoints = 15;
    tempSeverity = 'moderate';
    tempObs = `Mild hypothermia (${temp.toFixed(1)}°C).`;
  } else if (temp >= 39.5) {
    tempPoints = 32;
    tempSeverity = 'severe';
    tempObs = `Hyperpyrexia (${temp.toFixed(1)}°C). High risk of febrile delirium or sepsis.`;
  } else if (temp >= 38.3) {
    tempPoints = 20;
    tempSeverity = 'moderate';
    tempObs = `High-grade pyrexia (${temp.toFixed(1)}°C).`;
  } else if (temp >= 37.8) {
    tempPoints = 10;
    tempSeverity = 'minor';
    tempObs = `Low-grade fever (${temp.toFixed(1)}°C).`;
  }

  if (tempPoints > 0) {
    factors.push({
      parameter: 'TEMPERATURE',
      label: 'Temperature Anomaly',
      points: tempPoints,
      severity: tempSeverity,
      observation: tempObs,
      deviationText: `${tempDelta >= 0 ? '+' : ''}${tempDelta.toFixed(1)}°C vs baseline (${baseline.tempMean}°C)`,
    });
    totalScore += tempPoints;
  }

  // 5. ECG MORPHOLOGY & RHYTHM ANOMALY
  if (current.ecgRhythmDescription && current.ecgRhythmDescription !== 'Normal Sinus Rhythm') {
    const isAfibOrVfib = /fibrillation|flutter|vtach|asystole/i.test(current.ecgRhythmDescription);
    const isArrhythmia = /arrhythmia|pvc|pac|irregular/i.test(current.ecgRhythmDescription);
    const ecgPoints = isAfibOrVfib ? 35 : isArrhythmia ? 18 : 10;

    factors.push({
      parameter: 'ECG',
      label: 'ECG Rhythm Anomaly',
      points: ecgPoints,
      severity: isAfibOrVfib ? 'severe' : 'moderate',
      observation: current.ecgRhythmDescription,
      deviationText: 'Rhythm Disruption',
    });
    totalScore += ecgPoints;
  }

  // 6. HISTORICAL TREND ANALYSIS (Evaluating sequences of actual readings)
  let hrTrend: 'STABLE' | 'RISING' | 'FALLING' | 'RAPID_CLIMB' | 'SEVERE_DROP' = 'STABLE';
  let spo2Trend: 'STABLE' | 'DECLINING' | 'RAPID_DESATURATION' | 'IMPROVING' = 'STABLE';
  let tempTrend: 'STABLE' | 'FEBRILE_SPIKE' | 'HYPOTHERMIC_DROP' = 'STABLE';
  const trendNotes: string[] = [];

  if (recentHistory.length >= 3) {
    const historySample = [...recentHistory, current];
    const n = historySample.length;
    const recentSpO2s = historySample.slice(-5).map(r => r.spo2);
    const recentHRs = historySample.slice(-5).map(r => r.heartRate);
    const recentTemps = historySample.slice(-5).map(r => r.temperature);

    // SpO2 Slope: Check if consistently descending
    const firstSpO2 = recentSpO2s[0];
    const lastSpO2 = recentSpO2s[recentSpO2s.length - 1];
    const spo2Diff = lastSpO2 - firstSpO2;

    if (spo2Diff <= -4) {
      spo2Trend = 'RAPID_DESATURATION';
      const trendPts = 18;
      totalScore += trendPts;
      factors.push({
        parameter: 'TREND',
        label: 'Acute SpO₂ Drop Trend',
        points: trendPts,
        severity: 'severe',
        observation: `Progressive desaturation detected (${recentSpO2s.join(' → ')}%). Negative slope over recent samples.`,
        deviationText: `${spo2Diff}% drop`,
      });
      trendNotes.push('Rapid oxygen desaturation trend');
    } else if (spo2Diff <= -2) {
      spo2Trend = 'DECLINING';
      const trendPts = 8;
      totalScore += trendPts;
      factors.push({
        parameter: 'TREND',
        label: 'Declining SpO₂ Trajectory',
        points: trendPts,
        severity: 'minor',
        observation: `Mild downward trend in saturation (${recentSpO2s.join(' → ')}%).`,
        deviationText: `${spo2Diff}% delta`,
      });
      trendNotes.push('Declining oxygen trend');
    }

    // HR Slope: Check if consistently escalating
    const validHRs = recentHRs.filter((h): h is number => h != null);
    if (validHRs.length >= 2) {
      const firstHR = validHRs[0];
      const lastHR = validHRs[validHRs.length - 1];
      const hrDiff = lastHR - firstHR;

      if (hrDiff >= 20) {
        hrTrend = 'RAPID_CLIMB';
        const trendPts = 15;
        totalScore += trendPts;
        factors.push({
          parameter: 'TREND',
          label: 'Sustained Tachycardic Escalation',
          points: trendPts,
          severity: 'severe',
          observation: `Rapid heart rate acceleration (${validHRs.join(' → ')} BPM).`,
          deviationText: `+${hrDiff} BPM climb`,
        });
        trendNotes.push('Accelerating heart rate');
      } else if (hrDiff >= 12) {
        hrTrend = 'RISING';
        const trendPts = 7;
        totalScore += trendPts;
        factors.push({
          parameter: 'TREND',
          label: 'Upward Heart Rate Trend',
          points: trendPts,
          severity: 'minor',
          observation: `Sustained upward heart rate trajectory (${validHRs.join(' → ')} BPM).`,
          deviationText: `+${hrDiff} BPM climb`,
        });
        trendNotes.push('Upward heart rate trajectory');
      }
    }

    // Temp Slope
    const tempDiff = recentTemps[recentTemps.length - 1] - recentTemps[0];
    if (tempDiff >= 0.8) {
      tempTrend = 'FEBRILE_SPIKE';
      const trendPts = 8;
      totalScore += trendPts;
      factors.push({
        parameter: 'TREND',
        label: 'Acute Pyrexia Progression',
        points: trendPts,
        severity: 'moderate',
        observation: `Rapid thermal increase (${recentTemps.map(t => t.toFixed(1)).join(' → ')}°C).`,
        deviationText: `+${tempDiff.toFixed(1)}°C rise`,
      });
      trendNotes.push('Rapid temperature increase');
    }
  }

  // 7. MULTI-PARAMETER COMPOUND RISK (Synergistic Clinical Indicators)
  // Hypoxia + Tachycardia = Classic physiologic compensation for respiratory collapse / circulatory shock
  if (spo2 < 94 && hr !== null && hr > 105) {
    const compoundPts = 16;
    totalScore += compoundPts;
    factors.push({
      parameter: 'MULTI_PARAM',
      label: 'Cardiorespiratory Distress Synergy',
      points: compoundPts,
      severity: 'severe',
      observation: 'Simultaneous hypoxia (SpO₂ < 94%) and compensatory tachycardia (HR > 105 BPM) indicate significant cardiorespiratory stress.',
      deviationText: 'Compound Hazard',
    });
  }

  // Fever + Tachycardia = Systemic Inflammatory Response / Sepsis Risk
  if (temp >= 38.3 && hr !== null && hr >= 110) {
    const sepsisBonus = 12;
    totalScore += sepsisBonus;
    factors.push({
      parameter: 'MULTI_PARAM',
      label: 'Pyrexia & Tachycardia Co-occurrence',
      points: sepsisBonus,
      severity: 'moderate',
      observation: 'Co-occurrence of high fever and tachycardia triggers early systemic infection / sepsis surveillance criteria.',
      deviationText: 'SIRS Criteria',
    });
  }

  // 8. CLINICAL CONTEXT (used as context, NOT as an automatic acute-risk penalty)
  // Chronic diagnoses should not make a clinically stable patient 'critical' by themselves.
  // They are surfaced separately so the doctor understands the patient's background risk.
  const conditions = medicalConditions || [];
  const contextText = conditions.map(c => c.toLowerCase());
  const hasHighContextCondition = contextText.some(c =>
    /heart failure|congestive heart failure|copd|atrial fibrillation|coronary|post-cabg|chronic kidney|diabetic nephropathy|pulmonary hypertension|stroke/.test(c)
  );
  const clinicalContext = {
    level: hasHighContextCondition ? 'HIGH' : conditions.length > 0 ? 'ELEVATED' : 'LOWER',
    conditions,
    note: hasHighContextCondition
      ? 'Significant chronic conditions are present. Current risk is still determined from live physiology, trends, signal quality, and analyzed ECG features.'
      : conditions.length > 0
        ? 'Documented medical conditions provide clinical context; current risk is determined from live monitoring data.'
        : 'No documented chronic conditions affecting contextual risk.'
  } as const;

  // 8. FINAL SCORE & RISK LEVEL CLASSIFICATION
  const clampedScore = Math.min(100, Math.max(0, Math.round(totalScore)));

  let riskLevel: RiskLevel = 'STABLE';
  let recommendation = 'Patient vitals stable. Continue routine remote monitoring.';

  if (clampedScore >= 75) {
    riskLevel = 'CRITICAL';
    recommendation = 'IMMEDIATE CLINICAL INTERVENTION REQUIRED: Critical multi-vital anomaly detected. Initiate emergency response protocol and notify primary on-duty physician.';
  } else if (clampedScore >= 50) {
    riskLevel = 'ATTENTION';
    recommendation = 'ATTENTION REQUIRED: Significant baseline deviations or acute trend progression. Review medication response and schedule priority telehealth or bedside evaluation.';
  } else if (clampedScore >= 25) {
    riskLevel = 'MONITOR';
    recommendation = 'MONITOR CLOSELY: Mild physiological drift or trend variance noted. Maintain heightened sampling rate and re-evaluate in 15-30 minutes.';
  }

  return {
    riskScore: clampedScore,
    riskLevel,
    calculatedAt: new Date().toISOString(),
    isReliable,
    reliabilityWarning,
    factors,
    trendSummary: {
      hrTrend,
      spo2Trend,
      tempTrend,
      description: trendNotes.length > 0 ? trendNotes.join('; ') : 'All parameters trending stably',
    },
    recommendation,
    clinicalContext,
  };
}
