import React from 'react';
import {
  Activity,
  Users,
  Radio,
  Bell,
  FileText,
  ClipboardList,
  Cpu,
  Brain,
  Settings,
  Shield,
  UserCheck,
  LogOut,
  Wifi,
  ChevronRight,
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentTab?: string;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  setActiveTab?: (tab: string) => void;
  userRole?: UserRole | string;
  setUserRole?: (role: UserRole) => void;
  onToggleRole?: () => void;
  unreadAlertsCount?: number;
  unacknowledgedAlertsCount?: number;
  onlineDevicesCount?: number;
  totalDevicesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  activeTab,
  onSelectTab,
  setActiveTab,
  userRole = 'DOCTOR',
  setUserRole,
  onToggleRole,
  unreadAlertsCount,
  unacknowledgedAlertsCount,
  onlineDevicesCount = 0,
}) => {
  const selectedTab = currentTab || activeTab || 'dashboard';
  const handleSelectTab = onSelectTab || setActiveTab || (() => {});
  const role: UserRole = String(userRole).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'DOCTOR';
  const handleToggleRole = onToggleRole || (() => {
    if (setUserRole) {
      setUserRole(role === 'DOCTOR' ? 'ADMIN' : 'DOCTOR');
    }
  });
  const unreadAlerts = unreadAlertsCount ?? unacknowledgedAlertsCount ?? 0;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'live-monitoring', label: 'Live Monitoring', icon: Radio, badge: `${onlineDevicesCount} Live` },
    { id: 'alerts', label: 'Alerts', icon: Bell, alertCount: unreadAlerts },
    { id: 'records', label: 'Patient Records', icon: FileText },
    { id: 'devices', label: 'Devices', icon: Cpu },
    { id: 'ai-insights', label: 'AI Insights', icon: Brain },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (role === 'ADMIN') {
    navItems.splice(7, 0, { id: 'admin-manage', label: 'System Admin', icon: Shield });
  }

  return (
    <aside
      id="main-sidebar"
      className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-30"
    >
      {/* Top Brand Header */}
      <div>
        <div className="px-5 py-4 border-b border-slate-200/90 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm ring-2 ring-teal-600/20">
            <Activity className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-slate-900 text-lg tracking-tight">HealthSync</h1>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                IoT
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Remote Patient Monitoring</p>
          </div>
        </div>

        {/* Live IoT Ingestion Pipeline Indicator */}
        <div className="mx-3 my-2.5 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ESP32 Broker</span>
          </div>
          <span className="font-mono text-[11px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-semibold">
            1.0 Hz Active
          </span>
        </div>

        {/* Navigation List */}
        <nav className="px-3 py-1 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = selectedTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-800 border border-teal-200/80 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.alertCount !== undefined && item.alertCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-600 text-white animate-bounce">
                    {item.alertCount}
                  </span>
                )}

                {item.badge && !item.alertCount && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Role Switcher */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        <div className="p-2.5 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-slate-700">Online & Connected</span>
            </div>
            <button
              id="role-switch-btn"
              onClick={handleToggleRole}
              title="Click to switch role between Doctor and Administrator"
              className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-200 transition-colors"
            >
              Switch Role
            </button>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
              {role === 'DOCTOR' ? 'SC' : 'AR'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">
                {role === 'DOCTOR' ? 'Dr. Sarah Chen, MD' : 'Alex Rivera (Admin)'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {role === 'DOCTOR' ? 'Cardiology / RPM Lead' : 'Biomedical Systems Admin'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
