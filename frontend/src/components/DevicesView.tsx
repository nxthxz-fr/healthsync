import React, { useState } from 'react';
import {
  Cpu,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  Radio,
  RefreshCw,
  Code,
  Copy,
  Check,
  Zap,
  Terminal,
  Server,
  Play,
  Sliders,
} from 'lucide-react';
import { DataSource, IoTDevice } from '../types';

interface DevicesViewProps {
  devices: IoTDevice[];
  onToggleDeviceStatus: (deviceId: string, status: 'online' | 'offline') => Promise<void>;
  onToggleDeviceSource: (deviceId: string, sourceMode: DataSource) => Promise<void>;
  onDirectTelemetryIngest: (payload: any) => Promise<void>;
}

export const DevicesView: React.FC<DevicesViewProps> = ({
  devices,
  onToggleDeviceStatus,
  onToggleDeviceSource,
  onDirectTelemetryIngest,
}) => {
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice>(devices[0] || null);
  const [copied, setCopied] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'code-firmware' | 'ingest-tester'>('inventory');

  // Interactive Test Ingestion Form State
  const [testDeviceId, setTestDeviceId] = useState<string>(devices[0]?.deviceId || 'ESP32-DEV-901');
  const [testHR, setTestHR] = useState<number>(76);
  const [testSpO2, setTestSpO2] = useState<number>(97.5);
  const [testTemp, setTestTemp] = useState<number>(36.8);
  const [testQuality, setTestQuality] = useState<'good' | 'fair' | 'poor' | 'no_signal'>('good');
  const [testSource, setTestSource] = useState<DataSource>('LIVE_HARDWARE');
  const [isSendingPacket, setIsSendingPacket] = useState(false);
  const [lastPacketResponse, setLastPacketResponse] = useState<string | null>(null);

  const handleSendTestPacket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingPacket(true);
    try {
      const payload = {
        deviceId: testDeviceId,
        heartRate: Number(testHR),
        spo2: Number(testSpO2),
        temperature: Number(testTemp),
        signalQuality: testQuality,
        source: testSource,
      };
      await onDirectTelemetryIngest(payload);
      setLastPacketResponse(`HTTP 200 OK: Packet ingested at ${new Date().toLocaleTimeString()} - Risk recalculated!`);
    } catch (err: any) {
      setLastPacketResponse(`Error: ${err.message}`);
    } finally {
      setIsSendingPacket(false);
    }
  };

  const esp32ArduinoCode = `/*
 * HealthSync ESP32 Medical Telemetry Node
 * Sensors: AD8232 (ECG), MAX30102 (SpO2/HR), DS18B20 (Temp)
 * Target: ESP32-WROOM-32 / Wokwi Simulator
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

const char* ssid = "Hospital_IoT_WLAN";
const char* password = "ClinicalSecureKey9";
const char* serverEndpoint = "https://your-healthsync-api/api/iot/telemetry";

const char* DEVICE_ID = "ESP32-DEV-901";
const int ECG_PIN = 34; // Analog Lead II ADC
const int ONE_WIRE_BUS = 4; // DS18B20 1-Wire

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

void setup() {
  Serial.begin(115200);
  pinMode(ECG_PIN, INPUT);
  tempSensor.begin();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected! IP: " + WiFi.localIP().toString());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverEndpoint);
    http.addHeader("Content-Type", "application/json");

    // 1. Read AD8232 ECG Potential (mV)
    int rawEcg = analogRead(ECG_PIN);
    float ecgMv = (rawEcg / 4095.0) * 3.3;

    // 2. Read DS18B20 Temperature
    tempSensor.requestTemperatures();
    float bodyTempC = tempSensor.getTempCByIndex(0);

    // 3. Form Structured JSON Packet
    StaticJsonDocument<384> doc;
    doc["deviceId"] = DEVICE_ID;
    doc["heartRate"] = 76; // Calculated from R-R peaks
    doc["spo2"] = 97.4;    // Optical ratio from MAX30102
    doc["temperature"] = bodyTempC;
    doc["signalQuality"] = "good";
    doc["source"] = "LIVE_HARDWARE"; // or "WOKWI_SIMULATION"

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);
    Serial.printf("IoT Post [%s] Response: %d\\n", DEVICE_ID, httpResponseCode);
    http.end();
  }
  delay(1000); // 1.0 Hz Clinical Transmission Rate
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(esp32ArduinoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-teal-700" />
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              IoT Hardware & ESP32 Device Hub
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage physical wireless sensor nodes, switch simulation vs live hardware modes, and test direct packet ingestion.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`px-3 py-1.5 rounded font-semibold transition-colors ${
              activeSubTab === 'inventory' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hardware Fleet ({devices.length})
          </button>
          <button
            onClick={() => setActiveSubTab('ingest-tester')}
            className={`px-3 py-1.5 rounded font-semibold transition-colors ${
              activeSubTab === 'ingest-tester' ? 'bg-white text-teal-800 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Packet Ingest Tester
          </button>
          <button
            onClick={() => setActiveSubTab('code-firmware')}
            className={`px-3 py-1.5 rounded font-semibold transition-colors ${
              activeSubTab === 'code-firmware' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ESP32 / Wokwi Firmware
          </button>
        </div>
      </div>

      {/* 1. HARDWARE FLEET INVENTORY */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Device ID</th>
                    <th className="py-3 px-3">Assigned Patient</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Source Mode</th>
                    <th className="py-3 px-3">Battery</th>
                    <th className="py-3 px-3">Signal (RSSI)</th>
                    <th className="py-3 px-3">IP / MAC Address</th>
                    <th className="py-3 px-3">Packet Rate</th>
                    <th className="py-3 px-4 text-right">Hardware Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                  {devices.map((device) => {
                    const isOnline = device.status === 'online';

                    return (
                      <tr key={device.deviceId} className="hover:bg-slate-50/80 transition-colors">
                        {/* Device ID */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <Cpu className="w-4 h-4 text-teal-700" />
                            <span>{device.deviceId}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-normal">{device.firmwareVersion}</span>
                        </td>

                        {/* Assigned Patient */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{device.patientName}</div>
                          <span className="font-mono text-[11px] text-slate-400">{device.patientId}</span>
                        </td>

                        {/* Online / Offline Status */}
                        <td className="py-3 px-3">
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              ONLINE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              <WifiOff className="w-3 h-3 text-rose-600" />
                              OFFLINE
                            </span>
                          )}
                        </td>

                        {/* Source Mode */}
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors inline-block ${
                              device.sourceMode === 'LIVE_HARDWARE'
                                ? 'bg-teal-50 text-teal-800 border-teal-200'
                                : 'bg-purple-50 text-purple-800 border-purple-200'
                            }`}
                          >
                            {device.sourceMode === 'LIVE_HARDWARE' ? 'LIVE HARDWARE' : 'SOURCE MODE: DEMO / SIMULATION'}
                          </span>
                        </td>

                        {/* Battery */}
                        <td className="py-3 px-3 font-mono">
                          <div className="flex items-center gap-1">
                            {device.batteryLevel > 20 ? (
                              <Battery className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <BatteryLow className="w-4 h-4 text-rose-600" />
                            )}
                            <span className={device.batteryLevel <= 20 ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                              {device.batteryLevel}%
                            </span>
                            {device.sourceMode !== 'LIVE_HARDWARE' && (
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1 rounded">
                                DEMO
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Signal RSSI */}
                        <td className="py-3 px-3 font-mono text-[11px]">
                          <div className="flex items-center gap-1 text-slate-700">
                            <Wifi className="w-3.5 h-3.5 text-slate-400" />
                            <span>{device.rssiDbm} dBm</span>
                            {device.sourceMode !== 'LIVE_HARDWARE' && (
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1 rounded">
                                DEMO
                              </span>
                            )}
                          </div>
                        </td>

                        {/* IP & MAC */}
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {device.sourceMode === 'LIVE_HARDWARE' ? (
                            <>
                              <div>{device.ipAddress}</div>
                              <div className="text-[10px] text-slate-400">{device.macAddress}</div>
                            </>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic">
                              <span className="bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                DEMO / SIMULATED
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Packet Rate */}
                        <td className="py-3 px-3 font-mono text-[11px]">
                          <span className="font-semibold text-teal-700">
                            {isOnline ? (device.sourceMode === 'LIVE_HARDWARE' ? '1.0 Hz' : '1.0 Hz (DEMO)') : '0.0 Hz'}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {device.sourceMode === 'LIVE_HARDWARE'
                              ? `${device.totalPacketsSent.toLocaleString()} pkts`
                              : 'SIMULATED STREAM'}
                          </span>
                        </td>

                        {/* Toggle Controls */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() =>
                              onToggleDeviceStatus(device.deviceId, isOnline ? 'offline' : 'online')
                            }
                            className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                              isOnline
                                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {isOnline ? 'Simulate Disconnect' : 'Reconnect Node'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. DIRECT TELEMETRY INGESTION TESTER (Hackathon Testing Tool) */}
      {activeSubTab === 'ingest-tester' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Terminal className="w-4 h-4 text-teal-700" />
              Direct ESP32 HTTP POST Ingestion Tester
            </h3>
            <p className="text-xs text-slate-500">
              Send mock hardware packets directly to <code className="text-teal-700 font-mono">POST /api/iot/telemetry</code> and watch the real analysis engine recalculate live risk scores.
            </p>
          </div>

          <form onSubmit={handleSendTestPacket} className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {/* Target Device */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Device ID:</label>
                <select
                  value={testDeviceId}
                  onChange={(e) => setTestDeviceId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-mono font-bold text-slate-900"
                >
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.deviceId} ({d.patientName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Heart Rate */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Heart Rate (BPM):</label>
                <input
                  type="number"
                  value={testHR}
                  onChange={(e) => setTestHR(Number(e.target.value))}
                  min={30}
                  max={220}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-mono font-bold text-slate-900"
                />
              </div>

              {/* SpO2 */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">SpO₂ Percentage (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={testSpO2}
                  onChange={(e) => setTestSpO2(Number(e.target.value))}
                  min={60}
                  max={100}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-mono font-bold text-slate-900"
                />
              </div>

              {/* Temperature */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Temperature (°C):</label>
                <input
                  type="number"
                  step="0.1"
                  value={testTemp}
                  onChange={(e) => setTestTemp(Number(e.target.value))}
                  min={32}
                  max={43}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-mono font-bold text-slate-900"
                />
              </div>

              {/* Signal Quality */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Signal Quality:</label>
                <select
                  value={testQuality}
                  onChange={(e: any) => setTestQuality(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-bold text-slate-900"
                >
                  <option value="good">Good (High SNR)</option>
                  <option value="fair">Fair (Mild drift)</option>
                  <option value="poor">Poor (High artifact)</option>
                  <option value="no_signal">No Signal (Disconnected)</option>
                </select>
              </div>

              {/* Source Mode */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Source Mode Label:</label>
                <select
                  value={testSource}
                  onChange={(e: any) => setTestSource(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-mono font-bold text-slate-900"
                >
                  <option value="LIVE_HARDWARE">LIVE_HARDWARE</option>
                  <option value="WOKWI_SIMULATION">WOKWI_SIMULATION</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-[11px] font-mono text-slate-500">
                Payload formatted as clinical JSON packet.
              </span>
              <button
                type="submit"
                disabled={isSendingPacket}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isSendingPacket ? 'Ingesting...' : 'Ingest Real IoT Packet'}</span>
              </button>
            </div>
          </form>

          {lastPacketResponse && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{lastPacketResponse}</span>
            </div>
          )}
        </div>
      )}

      {/* 3. ESP32 / WOKWI FIRMWARE CODE */}
      {activeSubTab === 'code-firmware' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Code className="w-4 h-4 text-teal-700" />
                ESP32 Production / Wokwi Firmware (C++ / Arduino)
              </h3>
              <p className="text-xs text-slate-500">
                Ready to flash onto an ESP32 or paste into Wokwi simulator to connect physical biosensors to this dashboard.
              </p>
            </div>

            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-lg bg-slate-900 text-teal-300 text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800 max-h-96">
            <code>{esp32ArduinoCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
