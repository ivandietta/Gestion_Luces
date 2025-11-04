# Documentación de Deployment

## 🚀 Deployment Completo del Sistema IoT

Este proyecto está diseñado para ser deployado en la nube manteniendo la funcionalidad completa de IoT.

---

## 📋 Arquitectura de Deployment Recomendada

### Backend (Node.js + Socket.IO + SQLite)
**Plataforma recomendada: Railway.app**

**¿Por qué Railway?**
- ✅ Soporte nativo de WebSockets
- ✅ Base de datos SQLite persistente
- ✅ 500 horas gratis/mes
- ✅ URL HTTPS automática
- ✅ Ideal para ESP32 (acepta HTTP POST desde cualquier IP)

### Frontend (React + Vite)
**Plataforma recomendada: Vercel o Netlify**

**¿Por qué Vercel/Netlify?**
- ✅ Deploy gratis ilimitado
- ✅ CDN global (latencia mínima)
- ✅ Deploy automático desde GitHub
- ✅ SSL/HTTPS incluido

### ESP32
- Se conecta directamente al backend deployado
- Solo necesita actualizar la IP del servidor en el código

---

## 🔧 Paso 1: Preparar el Backend para Producción

### 1.1 Actualizar `server.js` para usar variables de entorno

Asegúrate de que el servidor use el puerto de la variable de entorno:

```javascript
const PORT = process.env.PORT || 3003;
```

Y configura CORS para aceptar el dominio del frontend:

```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
};
app.use(cors(corsOptions));
```

### 1.2 Crear archivo `.env` (NO subir a GitHub)

```bash
PORT=3003
FRONTEND_URL=https://tu-frontend.vercel.app
NODE_ENV=production
```

### 1.3 Agregar `.env` a `.gitignore`

```
node_modules/
.env
*.sqlite
*.log
```

---

## 🚂 Paso 2: Deploy del Backend en Railway

### 2.1 Crear cuenta en Railway.app
1. Ve a https://railway.app
2. Regístrate con GitHub
3. Crea un nuevo proyecto

### 2.2 Deploy desde GitHub (Recomendado)

```bash
# 1. Asegúrate de tener todo en GitHub
git add .
git commit -m "feat: prepare backend for deployment"
git push nuevo desarrollo  # O git push origin desarrollo

# 2. En Railway:
# - Click en "New Project"
# - Selecciona "Deploy from GitHub repo"
# - Autoriza Railway a acceder a tu repo (si no aparece, ve a GitHub Settings → Installations → Railway)
# - Selecciona el repo "Gestion_Luces"
# - Railway detectará automáticamente Node.js usando nixpacks.toml
# - Click en "Deploy"
```

**Nota importante:** El proyecto ya incluye los archivos `railway.json` y `nixpacks.toml` que le indican a Railway:
- Dónde está el código del backend (carpeta `backend/`)
- Cómo instalar dependencias (`npm ci`)
- Cómo iniciar el servidor (`node server.js`)

### 2.3 Configurar variables de entorno en Railway

En el dashboard de Railway:
1. Ve a "Variables"
2. Agrega:
   - `PORT` = `3003`
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = `https://tu-frontend.vercel.app` (lo agregarás después)

### 2.4 ~~Configurar root directory~~ (Ya no es necesario)

✅ **Ya está configurado automáticamente** mediante `nixpacks.toml` y `railway.json`

### 2.5 Obtener la URL del backend

Railway te dará una URL como:
```
https://gestor-aulas-production.up.railway.app
```

**Guarda esta URL**, la necesitarás para el frontend y el ESP32.

---

## ⚡ Paso 3: Deploy del Frontend en Vercel

### 3.1 Actualizar configuración de API

Edita `frontend/src/services/api.js`:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003';
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3003';
```

### 3.2 Crear archivo `.env` en frontend

```bash
# .env (local)
VITE_API_URL=http://localhost:3003
VITE_WS_URL=http://localhost:3003

# .env.production (para Vercel)
VITE_API_URL=https://tu-backend.railway.app
VITE_WS_URL=https://tu-backend.railway.app
```

### 3.3 Deploy en Vercel

```bash
# 1. Instala Vercel CLI
npm i -g vercel

# 2. Desde la carpeta frontend/
cd frontend
vercel login
vercel

# 3. Sigue las instrucciones:
# - Set up and deploy? Yes
# - Which scope? Tu cuenta
# - Link to existing project? No
# - Project name? gestor-aulas-frontend
# - In which directory? ./ (ya estás en frontend)
# - Override settings? No

# 4. Deploy a producción
vercel --prod
```

### 3.4 Configurar variables de entorno en Vercel

En el dashboard de Vercel:
1. Ve a tu proyecto
2. Settings → Environment Variables
3. Agrega:
   - `VITE_API_URL` = `https://tu-backend.railway.app`
   - `VITE_WS_URL` = `https://tu-backend.railway.app`
4. Redeploy

---

## 🔌 Paso 4: Actualizar ESP32

### 4.1 Modificar `esp32_real.ino`

```cpp
// ANTES (local)
const char* serverIP = "192.168.0.11";
const int serverPort = 3003;
String backendURL = "http://192.168.0.11:3003";

// DESPUÉS (producción)
const char* serverURL = "gestor-aulas-production.up.railway.app";
const int serverPort = 443;  // HTTPS usa puerto 443
String backendURL = "https://gestor-aulas-production.up.railway.app";
```

### 4.2 Actualizar conexión WebSocket

```cpp
// Cambiar de IP a dominio
webSocket.begin(serverURL, serverPort, "/socket.io/?EIO=4&transport=websocket");
webSocket.beginSSL(serverURL, serverPort, "/socket.io/?EIO=4&transport=websocket");
```

**Nota:** Necesitarás agregar soporte SSL al ESP32:
```cpp
#include <WiFiClientSecure.h>
```

---

## 🧪 Paso 5: Probar el Sistema Completo

### 5.1 Verificar Backend
```bash
curl https://tu-backend.railway.app/health
# Debería responder: {"status":"ok"}
```

### 5.2 Verificar Frontend
1. Abre `https://tu-frontend.vercel.app`
2. Intenta hacer login
3. Verifica que veas las aulas

### 5.3 Verificar ESP32
1. Sube el código actualizado al ESP32
2. Abre el Serial Monitor
3. Verifica que se conecte al servidor
4. Cambia el estado de un sensor
5. Verifica que se refleje en la app web

---

## 🎯 Alternativa: Render.com (Todo en uno)

Si prefieres tener todo en un solo lugar:

### Backend + Frontend en Render

```bash
# 1. Crear cuenta en render.com

# 2. Crear Web Service para Backend
# - Conectar repo de GitHub
# - Root Directory: backend
# - Build Command: npm install
# - Start Command: node server.js
# - Add Environment Variables (PORT, FRONTEND_URL)

# 3. Crear Static Site para Frontend
# - Root Directory: frontend
# - Build Command: npm install && npm run build
# - Publish Directory: dist
# - Add Environment Variables (VITE_API_URL, VITE_WS_URL)
```

**Nota:** Render tiene plan gratuito pero se "duerme" después de 15 min de inactividad.

---

## 💰 Costos Estimados

### Plan Gratuito (Suficiente para desarrollo/demostración)
- **Railway**: 500 horas/mes gratis → ~$0/mes
- **Vercel**: Gratis ilimitado → $0/mes
- **Total**: **$0/mes**

### Plan Producción (Para uso real)
- **Railway**: $5/mes (sin límite de horas)
- **Vercel**: $0/mes (gratis para siempre)
- **Total**: **$5/mes**

### Plan Recomendado para IoT Profesional
- **VPS (Hetzner)**: €4.50/mes → Control total, mejor rendimiento
- **Cloudflare**: $0/mes → CDN gratis para frontend
- **Total**: **~€5/mes**

---

## 🔒 Seguridad en Producción

### 1. Variables de entorno sensibles
```bash
# NUNCA subir a GitHub:
- Claves JWT
- Credenciales de BD
- API keys
```

### 2. CORS configurado correctamente
```javascript
const allowedOrigins = [
  'https://tu-frontend.vercel.app',
  'http://localhost:5173' // Solo para desarrollo
];
```

### 3. Rate limiting (recomendado)
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // Máximo 100 requests por IP
});

app.use('/api/', limiter);
```

---

## 📊 Monitoreo

### Railway Dashboard
- CPU usage
- Memory usage
- Network traffic
- Logs en tiempo real

### Vercel Analytics (gratis)
- Page views
- Performance metrics
- Error tracking

---

## 🆘 Troubleshooting

### Problema: ESP32 no se conecta
- ✅ Verifica que usas HTTPS en la URL
- ✅ Agrega certificado SSL al ESP32
- ✅ Revisa firewall de Railway

### Problema: WebSocket no funciona
- ✅ Verifica que Railway tenga WebSocket habilitado
- ✅ Usa `wss://` en vez de `ws://` para HTTPS

### Problema: CORS error
- ✅ Agrega el dominio del frontend a la lista de orígenes permitidos
- ✅ Verifica que las variables de entorno estén configuradas

---

## 📚 Recursos

- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [ESP32 HTTPS Client](https://github.com/espressif/arduino-esp32/tree/master/libraries/HTTPClient)
- [Socket.IO on Railway](https://docs.railway.app/guides/nodejs#websockets)

---

¿Necesitas ayuda con algún paso específico? ¡Puedo guiarte!
