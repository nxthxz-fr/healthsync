import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  User,
  Heart,
  Wind,
  Thermometer,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { EmergencyAlert, Patient } from '../types';

interface AlertsViewProps {
  alerts: EmergencyAlert[];
  patients: Patient[];
  onAcknowledgeAlert: (alertId: string) => Promise<void>;
  onSelectPatientById: (patientId: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  patients,
  onAcknowledgeAlert,
  onSelectPatientById,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'UNACKNOWLEDGED' | 'CRITICAL'>('ALL');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'UNACKNOWLEDGED') return !alert.acknowledged;
    if (filter === 'CRITICAL') return alert.severity === 'CRITICAL';
    return true;
  });

  const handleAck = async (id: string) => {
    setAcknowledgingId(id);
    try {
      await onAcknowledgeAlert(id);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          border: 'border-rose-300 bg-rose-50/40',
          badge: 'bg-rose-600 text-white',
          icon: AlertOctagon,
          iconColor: 'text-rose-600',
        };
      case 'ATTENTION':
        return {
          border: 'border-orange-300 bg-orange-50/30',
          badge: 'bg-orange-600 text-white',
          icon: AlertTriangle,
          iconColor: 'text-orange-600',
        };
      default:
        return {
          border: 'border-amber-300 bg-amber-50/20',
          badge: 'bg-amber-500 text-white',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-rose-600" />
            Emergency Clinical Alert Triage
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time notifications triggered automatically by anomalous multi-vital hardware sensor patterns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Chime Button */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              audioEnabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{audioEnabled ? 'Audible Chimes On' : 'Chimes Muted'}</span>
          </button>

          {/* Filter Pills */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded font-semibold transition-colors ${
                filter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setFilter('UNACKNOWLEDGED')}
              className={`px-3 py-1 rounded font-semibold transition-colors ${
                filter === 'UNACKNOWLEDGED'
                  ? 'bg-white text-rose-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({alerts.filter((a) => !a.acknowledged).length})
            </button>
            <button
              onClick={() => setFilter('CRITICAL')}
              className={`px-3 py-1 rounded font-semibold transition-colors ${
                filter === 'CRITICAL'
                  ? 'bg-white text-rose-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Critical
            </button>
          </div>
        </div>
      </div>

      {/* Alerts Queue */}
      <div className="space-y-3">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => {
            const style = getSeverityStyle(alert.severity);
            const Icon = style.icon;

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all ${style.border} bg-white shadow-2xs`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Left Alert Info */}
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-slate-50 shrink-0 border border-slate-200 mt-0.5`}>
                      <Icon className={`w-5 h-5 ${style.iconColor}`} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                          {alert.severity}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900">{alert.title}</h3>
                        <span className="text-xs text-slate-400 font-mono">
                          • {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 mt-1">{alert.description}</p>

                      {/* Patient metadata */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 font-mono">
                        <span
                          onClick={() => onSelectPatientById(alert.patientId)}
                          className="font-bold text-teal-700 hover:underline cursor-pointer"
                        >
                          {alert.patientName} ({alert.patientId})
                        </span>
                        <span>•</span>
                        <span>Location: {alert.roomBed}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vitals Snapshot & Action */}
                  <div className="flex flex-wrap items-center gap-3 self-end lg:self-center font-mono">
                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <span className="flex items-center gap-1 font-bold text-slate-800">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        {alert.vitalsSnapshot.heartRate} BPM
                      </span>
                      <span className="flex items-center gap-1 font-bold text-slate-800">
                        <Wind className="w-3.5 h-3.5 text-teal-600" />
                        {alert.vitalsSnapshot.spo2}%
                      </span>
                      <span className="flex items-center gap-1 font-bold text-slate-800">
                        <Thermometer className="w-3.5 h-3.5 text-cyan-600" />
                        {alert.vitalsSnapshot.temperature.toFixed(1)}°C
                      </span>
                    </div>

                    {alert.acknowledged ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>
                          Acknowledged by <strong>{alert.acknowledgedBy}</strong>
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAck(alert.id)}
                        disabled={acknowledgingId === alert.id}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Acknowledge Protocol</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-xs">
            No active emergency alerts in this category. All parameters within configured safety thresholds.
          </div>
        )}
      </div>
    </div>
  );
};
