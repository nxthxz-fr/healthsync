import React, { useEffect, useRef, useState } from 'react';
import { SignalQuality } from '../types';
import { Activity, AlertCircle, WifiOff } from 'lucide-react';
import { api } from '../lib/api';

interface LiveEcgMonitorProps {
  samples: number[];
  heartRate: number;
  rhythmDescription?: string;
  signalQuality: SignalQuality;
  isOnline: boolean;
  lastUpdatedText: string;
  sourceMode: 'LIVE_HARDWARE' | 'WOKWI_SIMULATION' | 'DEMO';
}

export const LiveEcgMonitor: React.FC<LiveEcgMonitorProps> = ({
  samples,
  heartRate,
  rhythmDescription = 'Analyzing rhythm...',
  signalQuality,
  isOnline,
  lastUpdatedText,
  sourceMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sweepIndexRef = useRef<number>(0);

  // Store buffer of points to draw
  const bufferRef = useRef<number[]>([]);

  useEffect(() => {
    if (samples && samples.length > 10) {
      bufferRef.current = samples;
    } else {
      // Fetch continuous points from backend demo generator
      const fetchEcgPoints = async () => {
        try {
          const pts = await api.getDemoEcg(300);
          if (pts && pts.length > 0) {
            bufferRef.current = pts.map((p) => p.value);
          }
        } catch (e) {
          // Keep existing buffer
        }
      };
      fetchEcgPoints();
      const interval = setInterval(fetchEcgPoints, 1200);
      return () => clearInterval(interval);
    }
  }, [samples]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    let localIndex = 0;
    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;
    const scaleY = height * 0.35; // 1 mV maps to ~35% height

    // We keep a display buffer that is updated in real time with an oscilloscope sweep beam
    const displayBuffer = new Array(width).fill(midY);

    const render = () => {
      if (!running) return;

      // Increment sweep cursor
      const currentSamples = bufferRef.current;
      const speed = isOnline && currentSamples.length > 0 ? 2 : 0; // sweep rate in pixels per frame

      if (isOnline && currentSamples.length > 0) {
        for (let s = 0; s < speed; s++) {
          const sampleVal = currentSamples[localIndex % currentSamples.length] || 0;
          let y = midY - sampleVal * scaleY;

          if (signalQuality === 'poor') {
            y += (Math.random() - 0.5) * 16; // jitter artifact
          } else if (signalQuality === 'no_signal') {
            y = midY + (Math.random() - 0.5) * 4; // near flatline noise
          }

          displayBuffer[sweepIndexRef.current] = y;
          localIndex++;
          sweepIndexRef.current = (sweepIndexRef.current + 1) % width;
        }
      }

      // Draw background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Draw Medical ECG Grid lines (light teal/slate grid lines)
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = '#e2e8f0'; // minor 5mm grid

      const gridSize = 16;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Major grid lines (every 5 divisions)
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#cbd5e1';
      for (let x = 0; x < width; x += gridSize * 5) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize * 5) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 1 mV Calibration pulse box in top left
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const calX = 14;
      const calBaseY = midY + scaleY * 0.5;
      const calTopY = calBaseY - scaleY;
      ctx.moveTo(calX, calBaseY);
      ctx.lineTo(calX + 6, calBaseY);
      ctx.lineTo(calX + 6, calTopY);
      ctx.lineTo(calX + 22, calTopY);
      ctx.lineTo(calX + 22, calBaseY);
      ctx.lineTo(calX + 28, calBaseY);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText('1 mV', calX + 32, calTopY + 12);

      // Draw ECG trace
      const cursor = sweepIndexRef.current;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0f766e'; // Medical clinical teal
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // First segment: from cursor+12 to width
      ctx.beginPath();
      let started = false;
      for (let x = (cursor + 16) % width; x < width; x++) {
        if (x < cursor) break;
        if (!started) {
          ctx.moveTo(x, displayBuffer[x]);
          started = true;
        } else {
          ctx.lineTo(x, displayBuffer[x]);
        }
      }
      ctx.stroke();

      // Second segment: from 0 to cursor - 2
      ctx.beginPath();
      started = false;
      for (let x = 0; x < Math.max(0, cursor - 4); x++) {
        if (!started) {
          ctx.moveTo(x, displayBuffer[x]);
          started = true;
        } else {
          ctx.lineTo(x, displayBuffer[x]);
        }
      }
      ctx.stroke();

      // Draw sweep cursor bar (beam head)
      if (isOnline) {
        const sweepGradient = ctx.createLinearGradient(cursor - 18, 0, cursor, 0);
        sweepGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        sweepGradient.addColorStop(1, 'rgba(204, 251, 241, 0.85)');
        ctx.fillStyle = sweepGradient;
        ctx.fillRect(Math.max(0, cursor - 18), 0, 18, height);

        ctx.fillStyle = '#0d9488';
        ctx.fillRect(cursor, 0, 2, height);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOnline, signalQuality]);

  const qualityBadge = {
    good: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'Good Signal' },
    fair: { bg: 'bg-amber-50 text-amber-800 border-amber-200', text: 'Fair SNR' },
    poor: { bg: 'bg-orange-50 text-orange-800 border-orange-200', text: 'Poor / Artifact' },
    no_signal: { bg: 'bg-rose-50 text-rose-800 border-rose-200', text: 'Lead Disconnected' },
  }[signalQuality] || { bg: 'bg-slate-100 text-slate-700', text: 'Unknown' };

  return (
    <div id="live-ecg-card" className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Live ECG Oscilloscope (Lead II)
              </h3>
              <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                SIMULATED ECG — NO BODY ELECTRODES
              </span>
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${qualityBadge.bg}`}>
                {qualityBadge.text}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Simulated Waveform • No Body Electrodes Connected (Lead II Synthesis) • Filter: 0.05 - 150 Hz
            </p>
          </div>
        </div>

        {/* Real-Time Telemetry Meta */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">Rhythm Classification:</span>
            <span className="font-bold text-slate-900 text-xs">
              {signalQuality === 'no_signal' ? 'Not Analyzed (No Signal)' : rhythmDescription}
            </span>
          </div>

          <div className="pl-3 border-l border-slate-200 text-right">
            <span className="text-[11px] text-slate-500 block">HR from R-Peaks:</span>
            <span className="font-bold text-teal-800 text-base">
              {signalQuality === 'no_signal' ? '--' : heartRate}{' '}
              <span className="text-[11px] font-normal text-slate-500">BPM</span>
            </span>
          </div>
        </div>
      </div>

      {/* ECG Canvas Oscilloscope Display */}
      <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-white">
        <canvas
          ref={canvasRef}
          width={760}
          height={190}
          className="w-full h-44 block"
        />

        {/* Oscilloscope Calibration HUD Overlay */}
        <div className="absolute bottom-2 left-3 flex items-center gap-3 text-[10px] font-mono text-slate-500 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded border border-slate-200">
          <span>Speed: 25 mm/s</span>
          <span>Gain: 10 mm/mV</span>
          <span className="font-semibold text-teal-700">Lead II</span>
          <span className="text-slate-400">|</span>
          <span className="font-semibold text-indigo-700">SIMULATED ECG — NO ELECTRODES</span>
        </div>

        <div className="absolute top-2 right-3 flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>LIVE WAVEFORM</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-2xs">
              <WifiOff className="w-3 h-3 text-rose-600" />
              <span>OFFLINE - PAUSED</span>
            </div>
          )}
        </div>
      </div>

      {/* Quality Warning if Degraded */}
      {signalQuality === 'poor' && (
        <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Signal Quality Warning:</strong> High electrode impedance or patient motion artifact detected. Automated rhythm analysis may be degraded. Confirm physical lead placement.
          </span>
        </div>
      )}

      {signalQuality === 'no_signal' && (
        <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-900">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            <strong>Electrode Disconnect:</strong> Zero signal detected from lead attachments. Automated rhythm analysis is paused (labeled <em>Not Analyzed</em>).
          </span>
        </div>
      )}
    </div>
  );
};
