import React, { useState } from 'react';
import { Shield, Plus, Users, Cpu, Server, Activity, Check, AlertCircle } from 'lucide-react';
import { IoTDevice, Patient } from '../types';

interface AdminManageViewProps {
  patients: Patient[];
  devices: IoTDevice[];
  onAddPatient: (newPatient: Partial<Patient>) => Promise<void>;
  onReassignDevice: (deviceId: string, patientId: string) => Promise<void>;
}

export const AdminManageView: React.FC<AdminManageViewProps> = ({
  patients,
  devices,
  onAddPatient,
  onReassignDevice,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatientId, setNewPatientId] = useState('');
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState(30);
  const [newGender, setNewGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [newBloodGroup, setNewBloodGroup] = useState('O+');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('Room Cardio-102');
  const [newEmergencyName, setNewEmergencyName] = useState('');
  const [newEmergencyPhone, setNewEmergencyPhone] = useState('');
  const [newMedicalNotes, setNewMedicalNotes] = useState('Remote telemetry observation');
  const [newDeviceId, setNewDeviceId] = useState('HEALTHSYNC-ESP32-01');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [assigningDeviceId, setAssigningDeviceId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      setErrorMsg('');
      await onAddPatient({
        patientId: newPatientId.trim() || undefined,
        fullName: newName.trim(),
        name: newName.trim(),
        age: Number(newAge),
        gender: newGender,
        bloodGroup: newBloodGroup,
        phone: newPhone,
        email: newEmail,
        address: newAddress,
        emergencyContactName: newEmergencyName,
        emergencyContactPhone: newEmergencyPhone,
        medicalNotes: newMedicalNotes,
        deviceId: newDeviceId,
      });
      setShowAddModal(false);
      setSuccessMsg(`Patient ${newName} registered successfully!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setNewName('');
      setNewPatientId('');
    } catch (error: any) {
      setErrorMsg(error?.message || 'Unable to register patient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-700" />
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Hospital System Administrator Console
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Fleet administration, patient onboarding, device binding, and telemetry server metrics.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Patient & Node</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* System Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
            <span>Server Uptime</span>
            <Server className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-900">99.98%</div>
          <span className="text-[10px] text-emerald-600 font-medium">Port 3000 Ingress Normal</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
            <span>Active IoT Nodes</span>
            <Cpu className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-900">
            {devices.filter((d) => d.status === 'online').length} / {devices.length}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Hardware & Simulation Nodes</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
            <span>Ingested Packets</span>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl font-extrabold font-mono text-teal-700">
            {devices.reduce((acc, d) => acc + d.totalPacketsSent, 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-teal-600 font-medium">Continuous CRC verified</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1 font-semibold">
            <span>Risk Calculation Engine</span>
            <Shield className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl font-extrabold font-mono text-slate-900">Deterministic</div>
          <span className="text-[10px] text-slate-400 font-medium">Zero Synthetic Random Scores</span>
        </div>
      </div>

      {/* Hardware Mapping & Device Binding Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">
            ESP32 Device Node to Bed / Patient Mapping
          </h3>
          <p className="text-xs text-slate-500">
            Reassign hardware nodes across monitored ICU and ward beds.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Hardware Node</th>
                <th className="py-3 px-3">MAC Address</th>
                <th className="py-3 px-3">Source Mode</th>
                <th className="py-3 px-3">Current Bed</th>
                <th className="py-3 px-3">Bound Patient</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
              {devices.map((device) => {
                const patient = patients.find((p) => p.id === device.patientId);
                return (
                  <tr key={device.deviceId} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{device.deviceId}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{device.macAddress}</td>
                    <td className="py-3 px-3 font-mono text-[11px] font-bold">
                      {device.sourceMode}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-800">{patient?.roomBed || 'Unassigned'}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <div>{device.patientName} ({device.patientId || 'UNASSIGNED'})</div>
                      <div className="mt-1">
                        <select
                          value={device.patientId || ''}
                          disabled={assigningDeviceId === device.deviceId}
                          onChange={async (e) => {
                            const nextPatientId = e.target.value;
                            if (!nextPatientId) return;
                            setAssigningDeviceId(device.deviceId);
                            setErrorMsg('');
                            try {
                              await onReassignDevice(device.deviceId, nextPatientId);
                              setSuccessMsg(`${device.deviceId} reassigned successfully.`);
                              setTimeout(() => setSuccessMsg(''), 3000);
                            } catch (error: any) {
                              setErrorMsg(error?.message || 'Unable to reassign device.');
                            } finally {
                              setAssigningDeviceId(null);
                            }
                          }}
                          className="mt-1 w-full max-w-[220px] bg-white border border-slate-300 rounded px-2 py-1 text-[10px] font-semibold text-slate-700"
                        >
                          <option value="" disabled>Assign patient…</option>
                          {patients.map((p) => (
                            <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          device.status === 'online'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {device.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Register New Telemetry Patient</h3>

            <form onSubmit={handleCreate} className="space-y-2.5 text-xs max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Patient ID (Unique):</label>
                  <input
                    type="text"
                    value={newPatientId}
                    onChange={(e) => setNewPatientId(e.target.value)}
                    placeholder="e.g. PATIENT-002"
                    className="w-full p-2 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Full Patient Name *:</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full p-2 bg-white border border-slate-300 rounded font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Age:</label>
                  <input
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(Number(e.target.value))}
                    className="w-full p-2 bg-white border border-slate-300 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Gender:</label>
                  <select
                    value={newGender}
                    onChange={(e: any) => setNewGender(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded font-semibold"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Blood Group:</label>
                  <select
                    value={newBloodGroup}
                    onChange={(e) => setNewBloodGroup(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded font-mono font-bold text-teal-700"
                  >
                    <option value="O+">O+</option>
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="AB+">AB+</option>
                    <option value="O-">O-</option>
                    <option value="A-">A-</option>
                    <option value="B-">B-</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Phone:</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full p-2 bg-white border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Email:</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. patient@example.com"
                    className="w-full p-2 bg-white border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Address / Bed:</label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Room Cardio-102"
                    className="w-full p-2 bg-white border border-slate-300 rounded font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Device Node ID:</label>
                  <input
                    type="text"
                    value={newDeviceId}
                    onChange={(e) => setNewDeviceId(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Emergency Contact Name:</label>
                  <input
                    type="text"
                    value={newEmergencyName}
                    onChange={(e) => setNewEmergencyName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full p-2 bg-white border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-0.5">Emergency Contact Phone:</label>
                  <input
                    type="text"
                    value={newEmergencyPhone}
                    onChange={(e) => setNewEmergencyPhone(e.target.value)}
                    placeholder="e.g. 9876543211"
                    className="w-full p-2 bg-white border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-0.5">Medical Notes:</label>
                <textarea
                  rows={2}
                  value={newMedicalNotes}
                  onChange={(e) => setNewMedicalNotes(e.target.value)}
                  placeholder="Clinical observations, allergies, or notes..."
                  className="w-full p-2 bg-white border border-slate-300 rounded text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-2xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
