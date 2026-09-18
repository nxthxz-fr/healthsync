import React, { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  AlertTriangle,
  Radio,
  Clock,
  CheckCircle2,
  Cpu,
  User,
  ExternalLink,
} from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  setSearchQuery?: (query: string) => void;
  userRole?: UserRole | string;
  setUserRole?: (role: UserRole) => void;
  unreadAlertsCount?: number;
  unacknowledgedAlertsCount?: number;
  onOpenAlerts?: () => void;
  systemStatusText?: string;
  hasCriticalAlert?: boolean;
  onSelectPatientById?: (patientId: string) => void;
  isHardwareLive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery = '',
  onSearchChange,
  setSearchQuery,
  userRole = 'DOCTOR',
  unreadAlertsCount,
  unacknowledgedAlertsCount,
  onOpenAlerts = () => {},
  systemStatusText = 'All Services Operational',
  hasCriticalAlert = false,
  isHardwareLive = false,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const handleSearchChange = onSearchChange || setSearchQuery || (() => {});
  const alertsCount = unreadAlertsCount ?? unacknowledgedAlertsCount ?? 0;
  const role: UserRole = String(userRole).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'DOCTOR';

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ' • ' + now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setCurrentTime(formatted);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header
      id="top-header"
      className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20"
    >
      {/* Search by Name / Patient ID / Device ID */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="patient-search-input"
            type="text"
            placeholder="Search by Name, Patient ID (P-101), or Device ID (ESP32-DEV-901)..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Center & Right Status Elements */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* Live Date & Time */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 font-mono bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentTime || 'Loading clock...'}</span>
        </div>

        {/* Source Mode Indicator */}
        {isHardwareLive ? (
          <div id="header-source-badge" className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
            <span>LIVE HARDWARE</span>
          </div>
        ) : (
          <div id="header-source-badge" className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span>DEMO MODE</span>
          </div>
        )}

        {/* Global System Status: All Services Operational */}
        <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-300"></span>
          <span className="hidden sm:inline font-medium text-emerald-900">System Status:</span>
          <span>{systemStatusText}</span>
        </div>

        {/* Emergency Alert Indicator */}
        {hasCriticalAlert ? (
          <button
            id="emergency-alert-btn"
            onClick={onOpenAlerts}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors animate-pulse"
          >
            <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
            <span>CRITICAL ALERT ACTIVE</span>
          </button>
        ) : (
          <button
            id="alerts-header-btn"
            onClick={onOpenAlerts}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Emergency Alerts"
          >
            <Bell className="w-4 h-4" />
            {alertsCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white"></span>
            )}
          </button>
        )}

        {/* Doctor / Admin Badge */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
            {role === 'DOCTOR' ? 'Dr' : 'Ad'}
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-900 block leading-tight">
              {role === 'DOCTOR' ? 'Dr. S. Chen' : 'Admin Alex'}
            </span>
            <span className="text-[10px] text-teal-700 font-semibold block leading-tight">
              {role === 'DOCTOR' ? 'Cardiologist' : 'System Admin'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
