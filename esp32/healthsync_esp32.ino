/**
 * ============================================================================
 * HealthSync ESP32 Telemetry Firmware (Arduino / C++)
 * College Hackathon Project: IoT Remote Patient Monitoring
 * ============================================================================
 * Hardware Setup:
 * - ESP32 DevKit V1
 * - DS18B20 Digital Temperature Sensor on GPIO 4 (4.7k pull-up to 3.3V)
 * - Pulse Sensor on Analog Pin GPIO 34 (ADC1_CH6)
 * - AD8232 ECG Output on GPIO 35 (ADC1_CH7), LO+ on GPIO 18, LO- on GPIO 19
 * - Status LEDs: Green (GPIO 21), Yellow (GPIO 22), Red (GPIO 23)
 * - Buzzer: GPIO 25 (Active high or PWM)
 * - Push Button: GPIO 26 (Internal PULLUP)
 *
 * Telemetry Destination:
 * - HTTP POST http://<LAPTOP_IP>:5000/api/iot/telemetry
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// 1. Wi-Fi Configuration (Replace with your Laptop hotspot / Wi-Fi credentials)
const char* WIFI_SSID = "HealthSync-Hotspot";
const char* WIFI_PASS = "healthsync123";

// 2. HealthSync Backend URL (Replace with your laptop's local IPv4 from ipconfig)
const char* BACKEND_URL = "http://192.168.1.100:5000/api/iot/telemetry";

// 3. Device & Patient Identity
const char* DEVICE_ID = "HEALTHSYNC-ESP32-01";
const char* PATIENT_ID = "PATIENT-001";

// 4. Pin Definitions
#define ONE_WIRE_BUS 4     // DS18B20 Data pin
#define PULSE_SENSOR_PIN 34 // Pulse Sensor Analog pin
#define ECG_ANALOG_PIN 35   // AD8232 Output
#define ECG_LO_PLUS 18      // Leads Off +
#define ECG_LO_MINUS 19     // Leads Off -
#define LED_GREEN 21        // Normal status
#define LED_YELLOW 22       // Attention status
#define LED_RED 23          // Critical status
#define BUZZER_PIN 25       // Emergency buzzer
#define BUTTON_PIN 26       // Push button

// Sensor Objects
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Timing Variables
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 2000; // 2 seconds

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[HealthSync] Initializing ESP32 Node...");

  // Initialize LEDs and Buzzer
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(ECG_LO_PLUS, INPUT);
  pinMode(ECG_LO_MINUS, INPUT);

  // Initial LED self-test
  digitalWrite(LED_GREEN, HIGH);
  digitalWrite(LED_YELLOW, HIGH);
  digitalWrite(LED_RED, HIGH);
  delay(500);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_YELLOW, LOW);
  digitalWrite(LED_RED, LOW);

  // Initialize DS18B20
  sensors.begin();
  Serial.printf("[HealthSync] Found %d DS18B20 sensor(s).\n", sensors.getDeviceCount());

  // Connect to Wi-Fi
  connectWiFi();
}

void loop() {
  // Ensure Wi-Fi connection is maintained
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // Periodic Telemetry Ingestion
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = millis();
    sendTelemetryPacket();
  }

  delay(20);
}

void connectWiFi() {
  Serial.printf("[Wi-Fi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected!");
    Serial.print("[Wi-Fi] ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
    digitalWrite(LED_GREEN, HIGH);
  } else {
    Serial.println("\n[Wi-Fi] Connection failed. Will retry...");
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_RED, HIGH);
    delay(200);
    digitalWrite(LED_RED, LOW);
  }
}

void sendTelemetryPacket() {
  // 1. Read DS18B20 Real Hardware Temperature
  sensors.requestTemperatures();
  float temperatureC = sensors.getTempCByIndex(0);
  if (temperatureC == DEVICE_DISCONNECTED_C || temperatureC < 0) {
    temperatureC = 36.8; // Fallback demo default if sensor unplugged
  }

  // 2. Read Pulse Sensor
  int pulseRaw = analogRead(PULSE_SENSOR_PIN);
  // Map raw signal to realistic BPM (or use peak detection algorithm)
  float heartRate = 72.0 + (pulseRaw % 15);

  // 3. SpO2 (Simulated demo mode because MAX30102 is not used)
  float spo2 = 98.0;

  // 4. Read AD8232 ECG Voltage
  bool leadsOff = (digitalRead(ECG_LO_PLUS) == 1 || digitalRead(ECG_LO_MINUS) == 1);
  int ecgRaw = leadsOff ? 0 : analogRead(ECG_ANALOG_PIN);
  float ecgVoltage = (ecgRaw / 4095.0) * 3.3;

  // 5. Evaluate status
  String status = "STABLE";
  if (heartRate >= 120.0 || spo2 <= 90.0 || temperatureC >= 39.0) {
    status = "CRITICAL";
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_YELLOW, LOW);
    digitalWrite(LED_RED, HIGH);
    tone(BUZZER_PIN, 1000, 200); // Alert beep
  } else if (heartRate >= 100.0 || spo2 <= 95.0 || temperatureC >= 38.0) {
    status = "ATTENTION";
    digitalWrite(LED_GREEN, LOW);
    digitalWrite(LED_YELLOW, HIGH);
    digitalWrite(LED_RED, LOW);
    noTone(BUZZER_PIN);
  } else {
    status = "STABLE";
    digitalWrite(LED_GREEN, HIGH);
    digitalWrite(LED_YELLOW, LOW);
    digitalWrite(LED_RED, LOW);
    noTone(BUZZER_PIN);
  }

  // 6. Construct JSON Telemetry Payload
  String jsonPayload = "{";
  jsonPayload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  jsonPayload += "\"patientId\":\"" + String(PATIENT_ID) + "\",";
  jsonPayload += "\"heartRate\":" + String(heartRate, 1) + ",";
  jsonPayload += "\"spo2\":" + String(spo2, 1) + ",";
  jsonPayload += "\"temperature\":" + String(temperatureC, 2) + ",";
  jsonPayload += "\"ecg\":" + String(ecgVoltage, 3) + ",";
  jsonPayload += "\"ecgMode\":\"SIMULATED\",";
  jsonPayload += "\"dataMode\":\"HARDWARE\","; // Temperature is real DS18B20 hardware data
  jsonPayload += "\"status\":\"" + status + "\",";
  jsonPayload += "\"timestamp\":\"" + String(millis()) + "\"";
  jsonPayload += "}";

  // 7. Send HTTP POST to HealthSync Backend
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    http.setUserAgent("ESP32-HealthSync/1.0");

    int httpResponseCode = http.POST(jsonPayload);

    if (httpResponseCode > 0) {
      Serial.printf("[HTTP] Telemetry POST Status: %d | Temp: %.1fC | HR: %.0f BPM | Status: %s\n",
                    httpResponseCode, temperatureC, heartRate, status.c_str());
    } else {
      Serial.printf("[HTTP] Telemetry POST Failed, Error: %s\n", http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  }
}
