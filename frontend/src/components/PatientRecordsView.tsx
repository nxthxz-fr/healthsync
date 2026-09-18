import React, { useState } from 'react';
import { Users, Search, Activity, ShieldAlert, Pill, FileText, ArrowRight, Plus } from 'lucide-react';
import { Patient } from '../types';

interface PatientRecordsViewProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  onOpenReport: (patient: Patient) => void;
}

export const PatientRecordsView: React.FC<PatientRecordsViewProps> = ({
  patients,
  onSelectPatient,
  onOpenReport,
}) => {
  const [search, setSearch] = useState('');

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.medicalConditions.some((c) => c.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-700" />
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Patient Medical Records & Clinical Charts
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Directory of registered patient profiles, chronic diagnoses, verified baselines, and allergy registries.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, ID, or condition..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 shadow-2xs"
          />
        </div>
      </div>

      {/* Grid of Patient Record Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((patient) => (
          <div
            key={patient.id}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                      {patient.id}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{patient.roomBed}</span>
                  </div>
                  <h3
                    onClick={() => onSelectPatient(patient)}
                    className="font-bold text-slate-900 text-base hover:text-teal-700 cursor-pointer mt-1"
                  >
                    {patient.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {patient.age}y • {patient.gender} • Blood: <strong>{patient.bloodGroup}</strong>
                  </p>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    patient.deviceStatus === 'online'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {patient.deviceStatus === 'online' ? 'DEVICE ONLINE' : 'DEVICE OFFLINE'}
                </span>
              </div>

              {/* Conditions & Allergies */}
              <div className="py-3 space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-700 block text-[11px] uppercase tracking-wider">
                    Medical Conditions
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {patient.medicalConditions.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-slate-700 block text-[11px] uppercase tracking-wider">
                    Allergies
                  </span>
                  <span className="text-rose-700 text-xs font-medium">
                    {patient.allergies.join(', ') || 'No known allergies'}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-700 block text-[11px] uppercase tracking-wider">
                    Assigned Clinician
                  </span>
                  <span className="text-slate-800 text-xs">{patient.assignedDoctor}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => onOpenReport(patient)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Summary Report</span>
              </button>

              <button
                onClick={() => onSelectPatient(patient)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-2xs transition-colors"
              >
                <span>Full Chart</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
