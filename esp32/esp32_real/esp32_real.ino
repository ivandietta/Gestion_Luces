// ========== LIBRERÍAS ==========
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WebSocketsClient_Generic.h>

// ========== CONFIGURACIÓN WIFI (MÚLTIPLES REDES) ==========
// El ESP32 intentará conectarse a la primera red disponible
struct WiFiNetwork {
  const char* ssid;
  const char* password;
};

WiFiNetwork wifiNetworks[] = {
  {"Personal-388-2.4GHz", "01424678639"},
  {"iPhone", "Joagenero03"}
};

const int numNetworks = sizeof(wifiNetworks) / sizeof(wifiNetworks[0]);

// ========== CONFIGURACIÓN SERVIDOR ==========
// PRODUCCIÓN (Railway)
const char* serverHost = "gestionluces-production.up.railway.app";
const int serverPort = 443;  // HTTPS usa puerto 443
String backendURL = "https://gestionluces-production.up.railway.app";

// LOCAL (comentado - descomentar para desarrollo local)
// const char* serverHost = "192.168.0.6";
// const int serverPort = 3003;
// String backendURL = "http://192.168.0.6:3003";

String espIP = "";  // Se obtiene automáticamente al conectar WiFi

// ========== DEFINICIÓN DE PINES ==========
// Sensores de Luz (LDR) - Entrada analógica (SOLO LECTURA)
const int LDR1_PIN = 32;         // Sensor de luz 1 - "Luz 1" (Pin 32 - ADC)
const int LDR2_PIN = 33;         // Sensor de luz 2 - "Luz 2" (Pin 33 - ADC)

// Relés (Control de luces) - Salida digital
// ESTOS CONTROLAN LAS LUCES FÍSICAS - Controlados desde la APP
const int RELAY1_PIN = 26;       // Relé 1 físico - Luz 1 (Pin 26)
const int RELAY2_PIN = 27;       // Relé 2 físico - Luz 2 (Pin 27)

// Sensor de movimiento - Entrada digital (SOLO LECTURA)
const int MOTION_SENSOR_PIN = 34; // Sensor PIR (Pin 34)

// Sensores magnéticos de ventanas - Entrada digital (SOLO LECTURA)
// Detectan si la ventana está abierta (HIGH) o cerrada (LOW)
const int WINDOW_SWITCH1_PIN = 22; // Ventana 1 (Pin 22) - Sensor magnético
const int WINDOW_SWITCH2_PIN = 23; // Ventana 2 (Pin 23) - Sensor magnético

// ========== VARIABLES DE ESTADO ==========
// Estados de relés (luces)
bool relay1State = false;  // false = apagado, true = encendido
bool relay2State = false;

// Control de apagado automático
unsigned long lastMotionTime = 0;
const unsigned long AUTO_OFF_TIMEOUT = 30 * 1000; // 30 segundos sin movimiento

// Estados previos para detectar cambios
bool prevMotion = false;
bool prevWindow1 = false;  // Estado anterior ventana 1
bool prevWindow2 = false;  // Estado anterior ventana 2
int prevLight1 = 0;   // Valor anterior del LDR 1
int prevLight2 = 0;   // Valor anterior del LDR 2
bool prevRelay1 = false;
bool prevRelay2 = false;

// Control de envío de datos
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 2000; // Enviar cada 2 segundos si no hay cambios

// Control de impresión de valores LDR
unsigned long lastLDRPrintTime = 0;
const unsigned long LDR_PRINT_INTERVAL = 5000; // Imprimir valores LDR cada 5 segundos

// ========== WEBSOCKET ==========
WebSocketsClient webSocket;
bool socketConnected = false;

// ========== FUNCIÓN: CONECTAR WIFI ==========
void connectWiFi() {
  Serial.println("\n========== CONECTANDO WIFI ==========");
  Serial.print("Redes disponibles: ");
  Serial.println(numNetworks);
  
  WiFi.mode(WIFI_STA);
  
  // Escanear redes disponibles
  Serial.println("Escaneando redes WiFi...");
  int networksFound = WiFi.scanNetworks();
  Serial.print("Redes encontradas: ");
  Serial.println(networksFound);
  
  bool connected = false;
  
  // Intentar conectarse a cada red configurada
  for (int i = 0; i < numNetworks && !connected; i++) {
    Serial.print("\n[");
    Serial.print(i + 1);
    Serial.print("/");
    Serial.print(numNetworks);
    Serial.print("] Intentando conectar a: ");
    Serial.println(wifiNetworks[i].ssid);
    
    // Verificar si la red está disponible
    bool networkAvailable = false;
    for (int j = 0; j < networksFound; j++) {
      if (WiFi.SSID(j) == String(wifiNetworks[i].ssid)) {
        networkAvailable = true;
        Serial.print("  ✓ Red encontrada (Señal: ");
        Serial.print(WiFi.RSSI(j));
        Serial.println(" dBm)");
        break;
      }
    }
    
    if (!networkAvailable) {
      Serial.println("  ✗ Red no disponible, probando siguiente...");
      continue;
    }
    
    WiFi.begin(wifiNetworks[i].ssid, wifiNetworks[i].password);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n✓ WiFi conectado exitosamente");
      Serial.print("  SSID: ");
      Serial.println(wifiNetworks[i].ssid);
      espIP = WiFi.localIP().toString();
      Serial.print("  IP del ESP32: ");
      Serial.println(espIP);
      Serial.print("  Señal: ");
      Serial.print(WiFi.RSSI());
      Serial.println(" dBm");
      connected = true;
    } else {
      Serial.println("\n✗ No se pudo conectar a esta red");
      WiFi.disconnect();
    }
  }
  
  if (!connected) {
    Serial.println("\n✗ Error: No se pudo conectar a ninguna red WiFi");
    Serial.println("Redes intentadas:");
    for (int i = 0; i < numNetworks; i++) {
      Serial.print("  - ");
      Serial.println(wifiNetworks[i].ssid);
    }
    Serial.println("\nReiniciando en 10 segundos...");
    delay(10000);
    ESP.restart();
  }
}

// ========== FUNCIÓN: EVENTO WEBSOCKET ==========
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("⚠ WebSocket desconectado");
      socketConnected = false;
      break;
      
    case WStype_CONNECTED:
      {
        Serial.println("✓ WebSocket conectado");
        socketConnected = true;
      }
      break;
      
    case WStype_TEXT:
      {
        String msg = String((char*)payload);
        
        // Socket.IO handshake - mensaje "0" con configuración
        if (msg.startsWith("0")) {
          Serial.println("✓ WebSocket handshake OK");
          // Después del handshake, unirse a la sala
          String joinMsg = "[\"join\",{\"room\":\"esp32:" + espIP + "\"}]";
          String fullMsg = "42" + joinMsg;
          webSocket.sendTXT(fullMsg);
          Serial.println("📤 Join enviado: esp32:" + espIP);
          return;
        }
        
        // Socket.IO usa prefijos: 42 = evento
        if (msg.startsWith("42")) {
          msg = msg.substring(2); // Remover prefijo
          
          // Parsear comando
          DynamicJsonDocument doc(512);
          DeserializationError error = deserializeJson(doc, msg);
          
          if (!error) {
            const char* eventName = doc[0];
            
            if (strcmp(eventName, "esp32:command") == 0) {
              JsonObject command = doc[1];
              Serial.println("📥 Comando recibido desde app");
              processCommand(command);
            } else if (strcmp(eventName, "joined") == 0) {
              Serial.println("✅ Unido a sala WebSocket");
            }
          }
        }
      }
      break;
      
    case WStype_ERROR:
      Serial.println("✗ Error en WebSocket");
      break;
      
    case WStype_PING:
      Serial.println("⚡ Ping recibido");
      break;
      
    case WStype_PONG:
      Serial.println("⚡ Pong recibido");
      break;
  }
}

// ========== FUNCIÓN: PROCESAR COMANDO ==========
void processCommand(JsonObject command) {
  if (!command.containsKey("pin")) {
    Serial.println("⚠️ Comando inválido: falta 'pin'");
    return;
  }
  
  int pin = command["pin"];
  
  Serial.println("════════════════════════════════");
  Serial.print("🎛️ Comando TOGGLE - Pin: ");
  Serial.println(pin);
  Serial.println("════════════════════════════════");
  
  // TOGGLE: Cambiar al estado opuesto, sin importar el comando
  // Los comandos vienen para los pines LÓGICOS (32, 33 para luces)
  
  if (pin == 32) {
    // Comando para Luz 1 (pin 32 lógico) → Toggle Relé 1 (pin 26 físico)
    relay1State = !relay1State;  // Cambiar al opuesto
    digitalWrite(RELAY1_PIN, relay1State ? LOW : HIGH); // Lógica inversa: LOW=ON
    Serial.print("💡 Relé 1 (Pin 26): ");
    Serial.println(relay1State ? "ENCENDIDO" : "APAGADO");
    
    // Reiniciar timer de movimiento si se enciende
    if (relay1State) {
      lastMotionTime = millis();
    }
    
  } else if (pin == 33) {
    // Comando para Luz 2 (pin 33 lógico) → Toggle Relé 2 (pin 27 físico)
    relay2State = !relay2State;  // Cambiar al opuesto
    digitalWrite(RELAY2_PIN, relay2State ? LOW : HIGH); // Lógica inversa: LOW=ON
    Serial.print("💡 Relé 2 (Pin 27): ");
    Serial.println(relay2State ? "ENCENDIDO" : "APAGADO");
    
    // Reiniciar timer de movimiento si se enciende
    if (relay2State) {
      lastMotionTime = millis();
    }
  } else {
    Serial.print("⚠️ Pin no reconocido para control: ");
    Serial.println(pin);
  }
  
  // Enviar actualización inmediata al backend
  sendDataToBackend();
}

// ========== FUNCIÓN: LEER SENSORES ==========
void readSensors() {
  // Leer sensores de luz (LDR) - valores de 0 a 4095
  int rawLight1 = analogRead(LDR1_PIN);
  int rawLight2 = analogRead(LDR2_PIN);
  
  // Leer sensor de movimiento
  bool motionDetected = digitalRead(MOTION_SENSOR_PIN);
  
  // Leer sensores de ventanas (HIGH = abierta, LOW = cerrada)
  bool window1Open = digitalRead(WINDOW_SWITCH1_PIN) == HIGH;
  bool window2Open = digitalRead(WINDOW_SWITCH2_PIN) == HIGH;
  
  // Actualizar timer de movimiento
  if (motionDetected) {
    lastMotionTime = millis();
  }
  
  // Detectar cambios significativos
  bool hasChanges = false;
  
  if (motionDetected != prevMotion) {
    hasChanges = true;
  }
  
  // Detectar cambios en ventanas
  if (window1Open != prevWindow1) {
    hasChanges = true;
  }
  
  if (window2Open != prevWindow2) {
    hasChanges = true;
  }
  
  // Detectar cambios en LDRs (umbral de 100 para evitar ruido)
  if (abs(rawLight1 - prevLight1) > 100) {
    hasChanges = true;
    Serial.print("LDR1: ");
    Serial.println(rawLight1);
  }
  
  if (abs(rawLight2 - prevLight2) > 100) {
    hasChanges = true;
    Serial.print("LDR2: ");
    Serial.println(rawLight2);
  }
  
  // Detectar cambios en relés
  if (relay1State != prevRelay1) {
    hasChanges = true;
    Serial.print("💡 Relé 1: ");
    Serial.println(relay1State ? "ON" : "OFF");
  }
  
  if (relay2State != prevRelay2) {
    hasChanges = true;
    Serial.print("💡 Relé 2: ");
    Serial.println(relay2State ? "ON" : "OFF");
  }
  
  // Guardar estados previos
  prevMotion = motionDetected;
  prevWindow1 = window1Open;
  prevWindow2 = window2Open;
  prevLight1 = rawLight1;
  prevLight2 = rawLight2;
  prevRelay1 = relay1State;
  prevRelay2 = relay2State;
  
  // Enviar datos si hay cambios o ha pasado el intervalo
  if (hasChanges || (millis() - lastSendTime >= SEND_INTERVAL)) {
    sendDataToBackend();
  }
}

// ========== FUNCIÓN: APAGADO AUTOMÁTICO ==========
void checkAutoOff() {
  unsigned long timeSinceMotion = millis() - lastMotionTime;
  
  // Si ha pasado más de 30 segundos sin movimiento, apagar luces
  if (timeSinceMotion > AUTO_OFF_TIMEOUT) {
    bool relay1WasOn = relay1State;
    bool relay2WasOn = relay2State;
    
    if (relay1State) {
      relay1State = false;
      digitalWrite(RELAY1_PIN, HIGH); // Apagar
      Serial.println("💤 Apagado automático: Luz 1 (30s sin movimiento)");
    }
    
    if (relay2State) {
      relay2State = false;
      digitalWrite(RELAY2_PIN, HIGH); // Apagar
      Serial.println("💤 Apagado automático: Luz 2 (30s sin movimiento)");
    }
    
    // Si se apagó alguna luz, enviar notificación de auto-off
    if (relay1WasOn || relay2WasOn) {
      sendAutoOffNotification(relay1WasOn, relay2WasOn);
      // Actualizar estados previos para evitar envío duplicado
      prevRelay1 = relay1State;
      prevRelay2 = relay2State;
    }
  }
}

// ========== FUNCIÓN: ENVIAR NOTIFICACIÓN DE APAGADO AUTOMÁTICO ==========
void sendAutoOffNotification(bool relay1WasOn, bool relay2WasOn) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠ WiFi desconectado, no se puede enviar notificación auto-off");
    return;
  }
  
  HTTPClient http;
  String url = backendURL + "/esp32/auto-off";
  
  // Construir JSON con los sensores que se apagaron
  DynamicJsonDocument doc(512);
  doc["ip"] = espIP;
  
  JsonArray sensores = doc.createNestedArray("sensores");
  
  if (relay1WasOn) {
    JsonObject luz1 = sensores.createNestedObject();
    luz1["pin"] = 32;
    luz1["estado"] = 0; // Apagado
  }
  
  if (relay2WasOn) {
    JsonObject luz2 = sensores.createNestedObject();
    luz2["pin"] = 33;
    luz2["estado"] = 0; // Apagado
  }
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Enviar HTTP POST
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.POST(jsonString);
  
  if (httpCode > 0) {
    Serial.println("✓ Notificación auto-off enviada (HTTP " + String(httpCode) + ")");
  } else {
    Serial.println("✗ Error enviando auto-off: " + String(httpCode));
  }
  
  http.end();
}

// ========== FUNCIÓN: ENVIAR DATOS AL BACKEND ==========
void sendDataToBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠ WiFi desconectado, reintentando...");
    connectWiFi();
    return;
  }
  
  HTTPClient http;
  String url = backendURL + "/esp32/data";
  
  // Construir JSON
  DynamicJsonDocument doc(1024);
  doc["ip"] = espIP;
  
  JsonArray sensores = doc.createNestedArray("sensores");
  
  // ========== ESTADO REAL DE LAS LUCES (RELÉS) ==========
  // IMPORTANTE: Enviamos el estado de los relés (26 y 27) como si fueran los pines lógicos (32 y 33)
  // porque la BD está configurada así
  JsonObject luz1 = sensores.createNestedObject();
  luz1["pin"] = 32;  // Pin lógico en BD
  luz1["estado"] = relay1State ? 1 : 0;  // Estado REAL del relé 1 (pin físico 26)
  
  JsonObject luz2 = sensores.createNestedObject();
  luz2["pin"] = 33;  // Pin lógico en BD
  luz2["estado"] = relay2State ? 1 : 0;  // Estado REAL del relé 2 (pin físico 27)
  
  // ========== SENSOR DE MOVIMIENTO - SOLO LECTURA ==========
  JsonObject motion = sensores.createNestedObject();
  motion["pin"] = 34;
  motion["estado"] = digitalRead(MOTION_SENSOR_PIN) ? 1 : 0;
  
  // ========== SENSORES DE VENTANAS - SOLO LECTURA ==========
  // Detectan si la ventana física está abierta o cerrada
  JsonObject vent1 = sensores.createNestedObject();
  vent1["pin"] = 22;
  vent1["estado"] = digitalRead(WINDOW_SWITCH1_PIN) == HIGH ? 1 : 0; // 1 = abierta
  
  JsonObject vent2 = sensores.createNestedObject();
  vent2["pin"] = 23;
  vent2["estado"] = digitalRead(WINDOW_SWITCH2_PIN) == HIGH ? 1 : 0;
  
  // ========== ESTADO DE LOS RELÉS (LUCES) ==========
  // IMPORTANTE: Los relés se controlan con los pines 32 y 33 desde la APP
  // pero el estado real está en relay1State y relay2State
  // NO enviamos pins 26 y 27 porque la BD no los tiene
  // Los estados de los relés se reflejan cuando la app consulta el estado
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Enviar HTTP POST
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.POST(jsonString);
  
  if (httpCode > 0) {
    String response = http.getString();
    
    // Procesar comandos pendientes de la respuesta
    if (httpCode == 200) {
      DynamicJsonDocument respDoc(2048);
      DeserializationError error = deserializeJson(respDoc, response);
      
      if (!error && respDoc.containsKey("comandos")) {
        JsonArray comandos = respDoc["comandos"];
        if (comandos.size() > 0) {
          Serial.print("📥 Recibidos ");
          Serial.print(comandos.size());
          Serial.println(" comando(s) pendiente(s)");
          
          for (JsonObject cmd : comandos) {
            processCommand(cmd);
          }
        }
      }
    }
  } else {
    Serial.println("✗ Error al enviar datos: " + String(httpCode));
  }
  
  http.end();
  lastSendTime = millis();
}

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n");
  Serial.println("═══════════════════════════════════════════");
  Serial.println("   SISTEMA DE GESTIÓN DE AULAS - ESP32");
  Serial.println("   Modo: Control Manual + Apagado Auto");
  Serial.println("═══════════════════════════════════════════");
  
  // Configurar pines de salida (relés)
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  digitalWrite(RELAY1_PIN, HIGH);  // Inicialmente apagados (lógica inversa)
  digitalWrite(RELAY2_PIN, HIGH);
  
  // Configurar pines de entrada (sensores)
  pinMode(MOTION_SENSOR_PIN, INPUT);
  pinMode(WINDOW_SWITCH1_PIN, INPUT_PULLUP);  // Pin 22 - Sensor magnético ventana 1
  pinMode(WINDOW_SWITCH2_PIN, INPUT_PULLUP);  // Pin 23 - Sensor magnético ventana 2
  pinMode(LDR1_PIN, INPUT);                    // Pin 32 - LDR analógico
  pinMode(LDR2_PIN, INPUT);                    // Pin 33 - LDR analógico
  
  // Configurar ADC para sensores de luz
  analogReadResolution(12);        // Resolución de 12 bits (0-4095)
  analogSetAttenuation(ADC_11db);  // Rango completo 0-3.3V
  
  Serial.println("✓ Pines configurados:");
  Serial.println("  - Relés (salida): 26, 27");
  Serial.println("  - LDRs (entrada analógica): 32, 33");
  Serial.println("  - Movimiento (entrada digital): 34");
  Serial.println("  - Ventanas magnéticas (entrada digital): 22, 23");
  
  // Conectar WiFi
  connectWiFi();
  
  // Conectar WebSocket
  Serial.println("\n========== CONECTANDO WEBSOCKET ==========");
  
  // IMPORTANTE: Para HTTPS (Railway), usar beginSSL en vez de begin
  // Comentar/descomentar según uses producción o local
  
  // PRODUCCIÓN (Railway - HTTPS)
  webSocket.beginSSL(serverHost, serverPort, "/socket.io/?EIO=4&transport=websocket");
  
  // LOCAL (HTTP)
  // webSocket.begin(serverHost, serverPort, "/socket.io/?EIO=4&transport=websocket");
  
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  Serial.println("WebSocket iniciado");
  Serial.print("Conectando a: wss://");
  Serial.print(serverHost);
  Serial.print(":");
  Serial.println(serverPort);
  
  // Inicializar timer de movimiento
  lastMotionTime = millis();
  
  Serial.println("\n✓ Sistema inicializado correctamente");
  Serial.println("═══════════════════════════════════════════\n");
  
  // Mostrar comandos de prueba disponibles
  Serial.println("🔧 COMANDOS DE PRUEBA DISPONIBLES:");
  Serial.println("═══════════════════════════════════════════");
  Serial.println("  L - Toggle Relé 1 (Luz 1)");
  Serial.println("  M - Toggle Relé 2 (Luz 2)");
  Serial.println("  E - Encender todos los relés");
  Serial.println("  A - Apagar todos los relés");
  Serial.println("  S - Mostrar estado actual");
  Serial.println("  H - Mostrar ayuda");
  Serial.println("═══════════════════════════════════════════\n");
  
  // Enviar estado inicial
  delay(2000);
  sendDataToBackend();
}

// ========== LOOP ==========
void loop() {
  // Mantener WebSocket activo
  webSocket.loop();
  
  // Leer comandos desde Serial para pruebas
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    
    if (cmd == 'L' || cmd == 'l') {
      // Toggle Relé 1
      relay1State = !relay1State;
      digitalWrite(RELAY1_PIN, relay1State ? LOW : HIGH);
      Serial.println("════════════════════════════════");
      Serial.print("🧪 TEST: Relé 1 → ");
      Serial.println(relay1State ? "ENCENDIDO" : "APAGADO");
      Serial.println("════════════════════════════════");
      sendDataToBackend();
    }
    else if (cmd == 'M' || cmd == 'm') {
      // Toggle Relé 2
      relay2State = !relay2State;
      digitalWrite(RELAY2_PIN, relay2State ? LOW : HIGH);
      Serial.println("════════════════════════════════");
      Serial.print("🧪 TEST: Relé 2 → ");
      Serial.println(relay2State ? "ENCENDIDO" : "APAGADO");
      Serial.println("════════════════════════════════");
      sendDataToBackend();
    }
    else if (cmd == 'A' || cmd == 'a') {
      // Apagar todos los relés
      relay1State = false;
      relay2State = false;
      digitalWrite(RELAY1_PIN, HIGH);
      digitalWrite(RELAY2_PIN, HIGH);
      Serial.println("════════════════════════════════");
      Serial.println("🧪 TEST: Todos los relés APAGADOS");
      Serial.println("════════════════════════════════");
      sendDataToBackend();
    }
    else if (cmd == 'E' || cmd == 'e') {
      // Encender todos los relés
      relay1State = true;
      relay2State = true;
      digitalWrite(RELAY1_PIN, LOW);
      digitalWrite(RELAY2_PIN, LOW);
      Serial.println("════════════════════════════════");
      Serial.println("🧪 TEST: Todos los relés ENCENDIDOS");
      Serial.println("════════════════════════════════");
      sendDataToBackend();
    }
    else if (cmd == 'S' || cmd == 's') {
      // Mostrar estado actual
      Serial.println("════════════════════════════════");
      Serial.println("📊 ESTADO ACTUAL:");
      Serial.print("  Relé 1 (Pin 26): ");
      Serial.println(relay1State ? "ON" : "OFF");
      Serial.print("  Relé 2 (Pin 27): ");
      Serial.println(relay2State ? "ON" : "OFF");
      Serial.print("  LDR 1 (Pin 32): ");
      Serial.println(analogRead(LDR1_PIN));
      Serial.print("  LDR 2 (Pin 33): ");
      Serial.println(analogRead(LDR2_PIN));
      Serial.print("  Movimiento (Pin 34): ");
      Serial.println(digitalRead(MOTION_SENSOR_PIN) ? "DETECTADO" : "NO");
      Serial.println("  Ventana 1 (Pin 22 lógico → Relé 1)");
      Serial.println("  Ventana 2 (Pin 23 lógico → Relé 2)");
      Serial.println("════════════════════════════════");
    }
    else if (cmd == 'H' || cmd == 'h' || cmd == '?') {
      // Mostrar ayuda
      Serial.println("\n════════════════════════════════");
      Serial.println("🔧 COMANDOS DE PRUEBA:");
      Serial.println("════════════════════════════════");
      Serial.println("  L - Toggle Relé 1 (Luz 1)");
      Serial.println("  M - Toggle Relé 2 (Luz 2)");
      Serial.println("  E - Encender todos los relés");
      Serial.println("  A - Apagar todos los relés");
      Serial.println("  S - Mostrar estado actual");
      Serial.println("  H - Mostrar esta ayuda");
      Serial.println("════════════════════════════════\n");
    }
  }
  
  // Leer sensores y enviar datos si hay cambios
  readSensors();
  
  // Imprimir valores LDR cada 5 segundos
  unsigned long currentTime = millis();
  if (currentTime - lastLDRPrintTime >= LDR_PRINT_INTERVAL) {
    lastLDRPrintTime = currentTime;
    int ldr1Value = analogRead(LDR1_PIN);
    int ldr2Value = analogRead(LDR2_PIN);
    Serial.println("════════════════════════════════");
    Serial.print("💡 LDR1 (Pin 32): ");
    Serial.print(ldr1Value);
    Serial.print(" | LDR2 (Pin 33): ");
    Serial.println(ldr2Value);
    Serial.println("════════════════════════════════");
  }
  
  // Verificar apagado automático
  checkAutoOff();
  
  // Pequeña pausa para no saturar
  delay(100);
}