# 🏫 Sistema de Gestión de Aulas IoT# 🏫 Sistema de Gestión de Aulas IoT



Sistema completo de gestión inteligente de aulas con ESP32, React y Node.js, desplegado en Railway y Vercel.**Universidad Nacional del Nordeste (UNNE)**  

**Materia:** Comunicación de Datos 2025  

## 📋 Descripción**Autor:** Iván Dietta



Sistema IoT para la gestión automatizada de aulas que permite:Sistema full-stack para monitoreo y control de aulas inteligentes con dispositivos ESP32.

- ✅ Control remoto de luces desde aplicación web

- ✅ Monitoreo en tiempo real de sensores (luz, movimiento, ventanas)---

- ✅ Apagado automático por inactividad

- ✅ Historial de eventos## ⚡ INICIO RÁPIDO

- ✅ Sistema de usuarios con roles (Administrador/Operario)

### 1️⃣ Iniciar Backend (Terminal 1)

## 🌐 URLs del Proyecto```bash

cd backend

- **Frontend (Vercel)**: https://gestion-luces.vercel.appnode server.js

- **Backend (Railway)**: https://gestionluces-production.up.railway.app```

- **Repositorio GitHub**: https://github.com/ivandietta/Gestion_Luces✅ **Servidor corriendo en:** http://localhost:3003



## 🏗️ Arquitectura### 2️⃣ Iniciar Frontend (Terminal 2)

```bash

```cd frontend

┌─────────────────┐npm run dev

│   ESP32 Device  │```

│   (Hardware)    │✅ **Aplicación corriendo en:** http://localhost:5173

└────────┬────────┘

         │ WiFi + WebSocket### 3️⃣ Acceder a la Aplicación

         ▼- **URL:** http://localhost:5173/login

┌─────────────────┐- **Admin:** `ADMIN001` / `admin123`

│  Backend API    │- **Operario:** `OP001` / `operario123`

│  (Railway)      │

│  Node.js + DB   │---

└────────┬────────┘

         │ REST + WebSocket## 🏗️ Arquitectura del Proyecto

         ▼

┌─────────────────┐```

│  Frontend Web   │📁 GestorAulas/

│  (Vercel)       │├── backend/              # Node.js + Express + SQLite

│  React + Vite   ││   ├── server.js        # Servidor principal

└─────────────────┘│   ├── database.js      # Configuración BD

```│   ├── models/          # Modelos de datos

│   ├── routes/          # Rutas API

## 🛠️ Tecnologías│   ├── middleware/      # Autenticación JWT

│   └── scripts/         # Scripts de inicialización

### Backend├── frontend/            # React + Vite + Tailwind

- **Node.js 20** - Runtime JavaScript│   ├── src/

- **Express 4.18** - Framework web│   │   ├── pages/       # Vistas principales

- **Socket.IO** - WebSocket para tiempo real│   │   ├── components/  # Componentes reutilizables

- **SQLite** - Base de datos embebida│   │   ├── services/    # API services

- **JWT** - Autenticación de usuarios│   │   └── contexts/    # Auth y Socket contexts

- **bcrypt** - Hash de contraseñas│   └── public/          # Archivos estáticos

└── esp32/               # Código ESP32 (real y simulado)

### Frontend    ├── esp32_real.ino   # Código Arduino

- **React 18** - Librería UI    └── simulador-simple.html  # Simulador web

- **Vite 4.5** - Build tool```

- **Tailwind CSS** - Estilos

- **Axios** - Cliente HTTP---

- **Socket.IO Client** - WebSocket cliente

- **React Router** - Navegación## 🎯 Funcionalidades Implementadas



### Hardware### ✅ Módulos Disponibles

- **ESP32 DevKit V1** - Microcontrolador

- **Sensores LDR** - Detección de luz ambiente#### 1. **Usuarios** (Solo Admin)

- **Sensor PIR** - Detección de movimiento- CRUD completo de usuarios

- **Reed Switches** - Sensores magnéticos de ventanas- Roles: Administrador / Operario

- **Relés** - Control de luces- Autenticación JWT



## 📦 Instalación Local#### 2. **Aulas**

- 5 aulas predefinidas

### Prerrequisitos- Estados: Online / Offline

- Node.js 18+ y npm- Indicadores visuales de conexión

- Git- Búsqueda y filtrado

- Arduino IDE (para ESP32)

#### 3. **Sensores**

### 1. Clonar repositorio- **Sensor de luz:** Control ON/OFF (admin y operarios)

```bash- **Sensor de ventana:** Solo lectura

git clone https://github.com/ivandietta/Gestion_Luces.git- **Sensor de movimiento:** Solo lectura

cd Gestion_Luces- Estados actualizables desde ESP32

```

#### 4. **Registros de Historial** ⭐

### 2. Configurar Backend- Registro automático de todos los cambios

```bash- Tipos de actuador:

cd backend  - `usuario`: Cambio manual desde la app

npm install  - `inactividad`: Apagado automático

```  - `externo`: Cambio físico detectado por ESP32

- API REST completa con filtros

Crear archivo `.env`:

```env#### 5. **Simulador ESP32**

PORT=3003- Simulación web sin hardware

JWT_SECRET=tu_clave_secreta_super_segura- Comunicación HTTP + WebSocket

JWT_EXPIRES_IN=7d- Interfaz visual intuitiva

```- Ideal para desarrollo y demos



Inicializar base de datos:---

```bash

node scripts/initDatabase.js## 🔌 Tecnologías

```

### Backend

Iniciar servidor:- **Node.js** v20.9.0

```bash- **Express.js** 4.18.2

node server.js- **SQLite3** 5.1.6

```- **Socket.IO** 4.8.1

- **JWT** para autenticación

### 3. Configurar Frontend- **bcryptjs** para hash de contraseñas

```bash

cd frontend### Frontend

npm install- **React** 18.2.0

```- **Vite** 4.5.0

- **Tailwind CSS** 3.3.5

Crear archivo `.env.development`:- **Axios** para HTTP

```env- **Socket.IO-client** 4.7.2

VITE_API_URL=http://localhost:3003- **React Router** 6.17.0

VITE_WS_URL=http://localhost:3003

```### Hardware (Opcional)

- **ESP32 DevKit V1**

Iniciar desarrollo:- **Sensores:** LDR, PIR, Reed Switch

```bash- **Actuadores:** Módulos de relé

npm run dev

```---



### 4. Configurar ESP32## 📊 Base de Datos (SQLite)



#### Instalar librerías Arduino:### Tablas Principales

- WiFi (incluida en ESP32)

- HTTPClient (incluida en ESP32)#### `usuarios`

- ArduinoJson (versión 6.x)```sql

- WebSocketsClient_Generic- id, legajo (UNIQUE), nombre, apellido

- password_hash, rol, estado

#### Configurar redes WiFi en `esp32/esp32_real/esp32_real.ino`:- created_at, updated_at

```cpp```

WiFiNetwork wifiNetworks[] = {

  {"TU_RED_WIFI", "TU_PASSWORD"},#### `aulas`

  {"OTRA_RED", "OTRA_PASSWORD"}```sql

};- id, nombre (UNIQUE), ip (UNIQUE)

```- ultima_senal, created_at, updated_at

```

#### Compilar y subir:

1. Abrir Arduino IDE#### `sensores`

2. Cargar `esp32/esp32_real/esp32_real.ino````sql

3. Seleccionar Board: ESP32 Dev Module- id, id_aula, tipo, pin (UNIQUE por aula)

4. Seleccionar Puerto COM- estado, descripcion

5. Click Upload- created_at, updated_at

6. Abrir Serial Monitor (115200 baud)```



## 🚀 Deployment en Producción#### `registros` ⭐

```sql

### Backend en Railway- id, id_sensor, tipo_actuador

- id_usuario (nullable), estado

1. **Crear proyecto en Railway**:- fecha_hora

   - Ve a https://railway.app```

   - Conecta tu repositorio GitHub

   - Selecciona el branch `main`---



2. **Configurar variables de entorno**:## 🚀 Guía de Instalación Completa

   ```

   JWT_SECRET=6f96edbc58c6c27dc54510aeb0f2974926073d930673b0f3605698887e5a89fee### Requisitos Previos

   JWT_EXPIRES_IN=7d- Node.js v18+ ([Descargar](https://nodejs.org/))

   PORT=8080- npm (incluido con Node.js)

   ```- Git



3. **Configurar build**:### Paso 1: Clonar Repositorio

   - Railway detectará automáticamente `nixpacks.toml````bash

   - El servidor iniciará con: `cd backend && node server.js`git clone https://github.com/AgustinRuizDiaz/Proyecto-Comunicaci-n-de-Datos-2025-Aula-IoT.git

cd Proyecto-Comunicaci-n-de-Datos-2025-Aula-IoT

### Frontend en Vercel```



1. **Importar proyecto**:### Paso 2: Configurar Backend

   - Ve a https://vercel.com```bash

   - Import Git Repositorycd backend

   - Selecciona tu reponpm install

node scripts/resetDatabase.js  # Crear BD con datos de prueba

2. **Configurar build**:node server.js                  # Iniciar servidor

   ``````

   Build Command: cd frontend && npm install && npm run build

   Output Directory: frontend/dist### Paso 3: Configurar Frontend

   Install Command: npm install```bash

   ```cd frontend

npm install

3. **Variables de entorno**:npm run dev  # Iniciar aplicación

   ``````

   VITE_API_URL=https://gestionluces-production.up.railway.app

   VITE_WS_URL=https://gestionluces-production.up.railway.app### Paso 4: Acceder

   ```Abre http://localhost:5173 en tu navegador



4. **Deploy**:---

   - Hacer push a `main` para production

   - URL resultante: `gestion-luces.vercel.app`## 🔐 Usuarios de Prueba



### ESP32 en Producción| Legajo | Contraseña | Rol | Acceso |

|--------|------------|-----|--------|

Actualizar configuración en `esp32_real.ino`:| ADMIN001 | admin123 | Administrador | Dashboard, Usuarios, Aulas, Registros |

```cpp| OP001 | operario123 | Operario | Aulas, Registros |

const char* serverHost = "gestionluces-production.up.railway.app";

const int serverPort = 443;  // HTTPS---

String backendURL = "https://gestionluces-production.up.railway.app";

## 📡 Comunicación en Tiempo Real

// Usar SSL para WebSocket

webSocket.beginSSL(serverHost, serverPort, "/socket.io/?EIO=4&transport=websocket");### Arquitectura WebSocket

```

```

## 📡 Pines del ESP32App ←→ Backend ←→ ESP32

    Socket.IO WebSocket

### Entradas (Sensores - Solo Lectura)    ⚡ Latencia < 200ms

- **Pin 32** (ADC): LDR 1 - Sensor de luz ambiente```

- **Pin 33** (ADC): LDR 2 - Sensor de luz ambiente

- **Pin 34**: Sensor PIR - Detección de movimiento### Flujo de Datos

- **Pin 22**: Reed Switch - Ventana 1 (magnético)

- **Pin 23**: Reed Switch - Ventana 2 (magnético)**App → ESP32 (Cambiar sensor):**

1. Usuario hace clic → UI actualiza (optimistic)

### Salidas (Actuadores - Control)2. POST /sensores/:id/estado

- **Pin 26**: Relé 1 - Control Luz 1 (lógica inversa: LOW=ON)3. Backend encola comando → Emite WebSocket

- **Pin 27**: Relé 2 - Control Luz 2 (lógica inversa: LOW=ON)4. ESP32 recibe comando → Ejecuta

5. ESP32 confirma → POST /esp32/data

## 👥 Usuarios por Defecto6. Backend actualiza BD → Emite WebSocket

7. Todos los clientes se actualizan

Crear usuarios con el script de inicialización:

```bash**ESP32 → App (Cambio físico):**

cd backend1. Cambio físico detectado

node scripts/initDatabase.js2. POST /esp32/data

```3. Backend actualiza BD → Emite WebSocket

4. Clientes se actualizan instantáneamente

Usuarios creados:

- **Admin**: Legajo `ADMIN001`, Password `admin123`---

- **Operario**: Legajo `OPE001`, Password `ope123`

## 🧪 Testing y Desarrollo

## 🔧 Comandos de Desarrollo

### Opción 1: Simulador Web (Sin Hardware)

### Backend```bash

```bash# Abrir en navegador:

npm start              # Iniciar servidoresp32/simulador-simple.html

node scripts/resetDatabase.js   # Resetear BD```

node scripts/initDatabase.js    # Inicializar BD

```### Opción 2: ESP32 Real (Producción)

Ver documentación completa en `esp32/README.md`

### Frontend

```bash**Hardware requerido:**

npm run dev            # Servidor desarrollo- ESP32 DevKit V1

npm run build          # Build producción- 2x LDR + resistencias 10kΩ

npm run preview        # Preview build local- 1x PIR HC-SR501

```- 2x Reed Switch

- 2x Módulos relé

### Git

```bash---

git checkout desarrollo        # Cambiar a desarrollo

git checkout main              # Cambiar a producción## 📝 Características Avanzadas

git merge desarrollo           # Merge desarrollo → main

git push nuevo desarrollo      # Push a GitHub### Sistema de Prevención de Duplicados

```- Ventana de tiempo para cambios de usuario (10s)

- Ventana para cambios externos (3s)

## 📱 Uso de la Aplicación- Evita registros duplicados ESP32 → App



### Login### Apagado Automático (ESP32 Real)

1. Ir a https://gestion-luces.vercel.app- 30 segundos sin movimiento → Luces OFF

2. Ingresar con credenciales (ADMIN001/admin123)- Timer se reinicia al detectar movimiento

- App tiene prioridad sobre automatización

### Dashboard

- Ver todas las aulas en tiempo real### Actualización Granular

- Estado de luces, sensores, movimiento- Sin recargas de página

- Click en aula para ver detalles- Actualización optimista de UI

- Solo se actualiza el sensor modificado

### Control de Aulas

- Toggle luces individualmente---

- Ver histórico de eventos

- Configurar apagado automático## 🔍 Solución de Problemas

- Monitoreo en tiempo real

### Backend no inicia

### Administración```bash

- Gestión de usuarios# Verificar puerto disponible

- Crear/editar/desactivar usuariosnetstat -ano | findstr :3003

- Asignar roles (Administrador/Operario)

# Reiniciar backend

## 🐛 Debuggingcd backend

node server.js

### Ver logs del backend (Railway)```

```bash

railway login### Frontend no carga

railway logs```bash

```# Limpiar dependencias

cd frontend

### Ver logs del ESP32rm -rf node_modules package-lock.json

1. Abrir Serial Monitor en Arduino IDEnpm install

2. Baudrate: 115200npm run dev

3. Ver conexión WiFi, WebSocket y comandos```



### Comandos de prueba ESP32 (Serial Monitor)### Base de datos corrupta

``````bash

L - Toggle Relé 1cd backend

M - Toggle Relé 2node scripts/resetDatabase.js  # ⚠️ Borra todos los datos

E - Encender todos```

A - Apagar todos

S - Ver estado### Aula offline

H - Ayuda- Verificar que ESP32/simulador esté conectado

```- Esperar 2 minutos sin señal = offline

- Heartbeat cada 30 segundos mantiene online

## 📊 Estructura del Proyecto

---

```

GestorAulas/## 📚 Documentación Adicional

├── backend/               # API Node.js

│   ├── models/           # Modelos de datos### Carpeta Raíz

│   ├── routes/           # Rutas API- ✅ **README.md** - Este archivo (resumen completo)

│   ├── middleware/       # Auth middleware

│   ├── scripts/          # Scripts BD### Backend (`backend/`)

│   ├── database.js       # Conexión SQLite- ✅ **README.md** - API endpoints, estructura, configuración

│   └── server.js         # Servidor principal

├── frontend/             # App React### ESP32 (`esp32/`)

│   ├── src/- ✅ **README.md** - Código Arduino, simulador, instalación completa

│   │   ├── components/   # Componentes UI

│   │   ├── pages/        # Páginas---

│   │   ├── contexts/     # Context API

│   │   ├── hooks/        # Custom hooks## 🔄 Flujo Completo de Trabajo

│   │   ├── services/     # API cliente

│   │   └── utils/        # Utilidades### Desarrollo

│   └── vite.config.js    # Config Vite```

├── esp32/                # Código Arduino1. Iniciar backend (Terminal 1)

│   └── esp32_real/2. Iniciar frontend (Terminal 2)

│       └── esp32_real.ino3. Abrir simulador web (navegador)

├── nixpacks.toml         # Config Railway4. Probar funcionalidades en la app

├── railway.json          # Config Railway5. Verificar logs en backend

├── vercel.json           # Config Vercel```

└── package.json          # Scripts raíz

```### Producción

```

## 🔐 Seguridad1. Cargar código en ESP32 real

2. Conectar sensores y relés

- ✅ Autenticación JWT3. Actualizar IP del aula en BD

- ✅ Contraseñas hasheadas con bcrypt4. Verificar conexión WiFi

- ✅ CORS configurado5. Probar desde la app

- ✅ HTTPS en producción```

- ✅ WebSocket seguro (WSS)

- ✅ Variables de entorno protegidas---



## 📝 API Endpoints## 🎉 Próximas Mejoras



### Autenticación- [ ] Interfaz de historial con gráficos

- `POST /auth/login` - Iniciar sesión- [ ] Exportar registros a CSV

- `POST /auth/register` - Registrar usuario- [ ] Dashboard con métricas en tiempo real

- `GET /auth/me` - Usuario actual- [ ] Notificaciones push

- [ ] WiFi Manager para ESP32

### Aulas- [ ] OTA Updates para ESP32

- `GET /aulas` - Listar aulas- [ ] Deep Sleep para ahorro energético

- `GET /aulas/:id` - Detalle aula- [ ] Sensores de temperatura y humedad

- `POST /aulas` - Crear aula

- `PUT /aulas/:id` - Actualizar aula---



### Sensores## 📞 Contacto y Soporte

- `GET /sensores/aula/:aulaId` - Sensores de aula

- `PUT /sensores/:id/toggle` - Toggle sensor**Repositorio:** [GitHub](https://github.com/AgustinRuizDiaz/Proyecto-Comunicaci-n-de-Datos-2025-Aula-IoT)  

**Branch:** desarrollo  

### ESP32**Issues:** [Reportar problemas](https://github.com/AgustinRuizDiaz/Proyecto-Comunicaci-n-de-Datos-2025-Aula-IoT/issues)

- `POST /esp32/data` - Recibir datos sensores

- `POST /esp32/auto-off` - Notificación auto-off---



### Diagnóstico## 📅 Changelog

- `GET /health` - Health check

- `GET /` - Info API### v1.0 (Octubre 2025)

- ✅ Sistema de autenticación JWT

## 🤝 Contribuir- ✅ Gestión de usuarios (CRUD)

- ✅ Módulo de aulas completo

1. Fork el proyecto- ✅ Sistema de sensores

2. Crear branch (`git checkout -b feature/nueva-funcionalidad`)- ✅ Registros de historial

3. Commit cambios (`git commit -m 'feat: nueva funcionalidad'`)- ✅ Comunicación WebSocket en tiempo real

4. Push branch (`git push origin feature/nueva-funcionalidad`)- ✅ Simulador ESP32 web

5. Abrir Pull Request- ✅ Código ESP32 real

- ✅ Prevención de registros duplicados

## 📄 Licencia- ✅ Apagado automático por inactividad

- ✅ Actualización granular sin recargas

Este proyecto es de código abierto para uso educativo.

---

## 👨‍💻 Autores

**🚀 Sistema listo para producción - Elige simulador (desarrollo) o ESP32 real (producción)**

- **Equipo de desarrollo** - Universidad 2025
- **Materia**: Comunicación de Datos

## 🎯 Roadmap

- [ ] App móvil nativa (React Native)
- [ ] Dashboard de estadísticas
- [ ] Exportar reportes PDF
- [ ] Notificaciones push
- [ ] Integración con Google Calendar
- [ ] Soporte multi-aulas
- [ ] Panel de energía consumida

## 🐞 Issues Conocidos

- WebSocket puede desconectarse si Railway hiberna (free tier)
- ESP32 requiere reconexión si se pierde WiFi
- Base de datos SQLite no es ideal para producción a gran escala

## 📞 Soporte

Para reportar bugs o sugerencias:
- GitHub Issues: https://github.com/ivandietta/Gestion_Luces/issues
- Email: [tu-email@ejemplo.com]

---

**Hecho con ❤️ para la gestión inteligente de aulas**
