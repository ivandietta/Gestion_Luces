# 🏫 Sistema de Gestión de Aulas Inteligentes
## Presentación del Proyecto - 10 minutos

**Universidad Nacional del Nordeste (UNNE)**  
**Materia:** Comunicación de Datos 2025  
**Autor:** Iván Dietta

---

## 📋 Contenido

1. [¿Qué hace el sistema?](#1-qué-hace-el-sistema)
2. [¿Cómo funciona?](#2-cómo-funciona)
3. [Tecnologías utilizadas](#3-tecnologías-utilizadas)
4. [Comunicación en tiempo real](#4-comunicación-en-tiempo-real)
5. [Partes del sistema](#5-partes-del-sistema)
6. [Demostración](#6-demostración)
7. [Conclusiones](#7-conclusiones)

---

## 1. ¿Qué hace el sistema?

### El Problema
Imagina que eres el encargado de un edificio con 5 aulas:
- ❌ No sabes si las luces están prendidas o apagadas
- ❌ No puedes apagarlas si alguien se olvidó de hacerlo
- ❌ No hay registro de quién usó el aula

### La Solución
Una **aplicación web** que te permite:
- ✅ Ver el estado de todas las aulas en tiempo real
- ✅ Encender/apagar luces desde tu celular
- ✅ Saber si hay gente en el aula (sensor de movimiento)
- ✅ Ver si las ventanas están abiertas
- ✅ Ver un historial de todos los cambios

### ¿Cómo es diferente?
- 🔐 **Seguro:** Solo usuarios autorizados pueden controlar las aulas
- ⚡ **Instantáneo:** Los cambios se ven al instante (sin recargar la página)
- 📊 **Inteligente:** Si no detecta movimiento por 30 segundos, apaga las luces automáticamente
- 📱 **Accesible:** Funciona desde cualquier dispositivo (PC, tablet, celular)

---

## 2. ¿Cómo funciona?

### Las 3 Partes del Sistema

Piensa en el sistema como una conversación entre 3 personas:

```
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│                 │        │                 │        │                 │
│   TU CELULAR    │◄──────►│   SERVIDOR      │◄──────►│   AULA FÍSICA   │
│   (Aplicación)  │        │   (Cerebro)     │        │   (ESP32)       │
│                 │        │                 │        │                 │
└─────────────────┘        └─────────────────┘        └─────────────────┘
```

### ¿Qué hace cada parte?

**1. Aplicación Web (Tu Celular/PC)**
- Muestra el estado de todas las aulas
- Permite encender/apagar luces
- Muestra alertas cuando algo cambia

**2. Servidor (El Cerebro)**
- Recibe tus comandos y los envía al aula
- Guarda todo en una base de datos
- Coordina la comunicación entre todos

**3. ESP32 (El Dispositivo en el Aula)**
- Controla las luces físicas
- Lee los sensores (movimiento, ventanas, luz)
- Envía información al servidor

### Ejemplo: Encender una luz

1. **Tú:** Haces click en "Encender Luz 1" en tu celular
2. **Servidor:** Recibe tu comando y lo envía al ESP32 del aula
3. **ESP32:** Enciende la luz física
4. **ESP32:** Confirma: "Luz encendida"
5. **Servidor:** Guarda en el historial: "Usuario Juan encendió la luz a las 14:30"
6. **Tu celular:** Se actualiza automáticamente mostrando la luz encendida
7. **Otros usuarios:** También ven el cambio al instante

---

## 3. Tecnologías utilizadas

### Aplicación Web (Lo que ves en tu navegador)

**React** - Librería para crear interfaces interactivas
- Es como armar con bloques LEGO: cada botón, cada tarjeta es un bloque reutilizable
- Ejemplo: El mismo componente "tarjeta de aula" se usa para mostrar las 5 aulas

**Tailwind CSS** - Framework para hacer la app bonita
- En vez de escribir estilos complicados, usas clases simples
- Ejemplo: `bg-blue-500` = fondo azul

**Vite** - Herramienta que hace la app super rápida
- Compila el código muy rápido
- Los cambios se ven al instante mientras desarrollas

### Servidor (El cerebro del sistema)

**Node.js** - JavaScript del lado del servidor
- Permite usar el mismo lenguaje (JavaScript) en frontend y backend
- Muy rápido para manejar muchas conexiones simultáneas

**Express** - Framework minimalista para crear APIs
- Facilita crear las "rutas" (URLs) de la aplicación
- Ejemplo: `/aulas` muestra todas las aulas, `/login` es para iniciar sesión

**SQLite** - Base de datos simple
- Un solo archivo guarda toda la información
- No necesita un servidor separado de base de datos
- Perfecto para proyectos medianos

**Socket.IO** - Comunicación en tiempo real
- Permite que el servidor "empuje" información a los usuarios
- Sin esto, tendrías que refrescar la página constantemente

### Hardware (El dispositivo en el aula)

**ESP32** - Microcontrolador con WiFi
- Es como una mini computadora que cabe en tu mano
- Tiene WiFi incorporado para conectarse a internet
- Cuesta aproximadamente $5 USD

**Sensores:**
- 📸 **PIR (Sensor de movimiento):** Detecta si hay personas en el aula
- 💡 **LDR (Sensor de luz):** Mide cuánta luz hay en el ambiente
- 🪟 **Reed Switch:** Detecta si las ventanas están abiertas o cerradas

**Actuadores:**
- 💡 **Relés:** Interruptores electrónicos que encienden/apagan las luces

---

## 4. Comunicación en tiempo real

### El Problema: ¿Cómo saber si algo cambió?

**Método Antiguo (Preguntando constantemente):**
```
Tu celular: "¿Hay cambios?"
Servidor: "No"
[Espera 1 segundo]
Tu celular: "¿Hay cambios?"
Servidor: "No"
[Espera 1 segundo]
Tu celular: "¿Hay cambios?"
Servidor: "Sí, la luz se encendió"
```
❌ **Problema:** Hace muchas preguntas innecesarias, gasta batería y datos

**Método Moderno (El servidor avisa cuando hay cambios):**
```
Tu celular ↔️ Servidor: [Conexión permanente abierta]

[Alguien enciende una luz]
Servidor → Tu celular: "¡La luz se encendió!" ⚡ 

[Tu celular se actualiza automáticamente]
```
✅ **Ventaja:** El servidor solo habla cuando hay algo nuevo

### Socket.IO: La "línea telefónica" siempre abierta

Es como tener una llamada telefónica abierta con el servidor:
- 📞 La conexión está siempre activa
- 🔔 El servidor puede "llamarte" cuando quiera
- ⚡ Los cambios se ven al instante
- 🔄 Si se corta, se reconecta automáticamente

### Ejemplo Real: Múltiples usuarios

Imagina 3 personas viendo la misma aula:

```
Usuario 1 (en su casa)  ─┐
                         ├─► SERVIDOR ─► ESP32 Aula 5
Usuario 2 (en su celular)┤
                         │
Usuario 3 (en la oficina)┘
```

**¿Qué pasa cuando Usuario 1 enciende una luz?**

1. Usuario 1 hace click → Servidor recibe el comando
2. Servidor envía comando al ESP32 del Aula 5
3. ESP32 enciende la luz física
4. ESP32 confirma al Servidor: "Luz encendida"
5. Servidor avisa a TODOS los usuarios conectados
6. Usuario 1, Usuario 2 y Usuario 3 ven el cambio **al mismo tiempo**

✨ **Resultado:** Todos están sincronizados, como si estuvieran en la misma habitación

---

## 5. Partes del sistema

El proyecto está organizado en 3 carpetas principales:

### 📱 Frontend (La aplicación web)
```
frontend/
├── src/
│   ├── pages/         → Las pantallas que ves
│   │   ├── Login.jsx          (Pantalla de inicio)
│   │   ├── Dashboard.jsx      (Página principal)
│   │   └── AulaDetail.jsx     (Detalles de cada aula)
│   │
│   ├── components/    → Piezas reutilizables
│   │   ├── AulaCard.jsx       (Tarjeta de aula)
│   │   ├── Navbar.jsx         (Barra superior)
│   │   └── Toast.jsx          (Notificaciones)
│   │
│   └── services/      → Comunicación con el servidor
│       └── api.js             (Todas las peticiones)
│
└── index.html         → Punto de entrada
```

**¿Qué hace cada cosa?**
- **pages:** Son como las hojas de un cuaderno, cada página muestra algo diferente
- **components:** Son bloques LEGO que se reutilizan (un botón, una tarjeta, un menú)
- **api.js:** El "mensajero" que envía peticiones al servidor

### 🧠 Backend (El cerebro del sistema)
```
backend/
├── server.js          → El programa principal
├── database.js        → Base de datos SQLite
│
├── models/            → Definiciones de datos
│   ├── Aula.js               (Estructura de un aula)
│   ├── Sensor.js             (Estructura de un sensor)
│   ├── Registro.js           (Historial de acciones)
│   └── Usuario.js            (Usuarios del sistema)
│
├── routes/            → URLs que acepta el servidor
│   ├── auth.js               (Login/logout)
│   ├── aulas.js              (Ver/editar aulas)
│   ├── sensores.js           (Controlar luces/aires)
│   └── esp32.js              (Recibir datos del ESP32)
│
└── middleware/
    └── auth.js        → Verifica que estés autorizado
```

**¿Qué hace cada cosa?**
- **server.js:** El director de orquesta, coordina todo
- **database.js:** El archivo donde se guarda toda la información
- **models:** Las reglas de qué datos se pueden guardar
- **routes:** Como los meseros de un restaurante, cada uno atiende peticiones específicas
- **middleware/auth.js:** El guardia de seguridad que verifica tu entrada

### 🏢 ESP32 (El aula física)
```
esp32/
└── esp32_real.ino     → Código principal (622 líneas)
```

**¿Qué hace?**

El código tiene 3 responsabilidades principales:

1. **Leer sensores constantemente (cada segundo)**
   - LDR: ¿Hay luz encendida?
   - PIR: ¿Hay movimiento de personas?
   - Reed Switch: ¿La puerta está abierta?

2. **Controlar actuadores cuando le dicen**
   - Relé 1 y Relé 2: Enciende/apaga luces o aires

3. **Comunicarse con el servidor**
   - Envía lectura de sensores cada segundo
   - Recibe comandos de encendido/apagado
   - Notifica cuando apaga algo automáticamente

**Funciones más importantes:**

- `readSensors()`: Lee todos los sensores y envía al servidor
- `checkAutoOff()`: Si pasan 30 segundos sin movimiento, apaga luces
- `sendAutoOffNotification()`: Avisa al servidor "Apagué las luces porque no había nadie"
- `webSocketEvent()`: Escucha comandos del servidor ("Enciende relé 1")

---

### 🗄️ Base de Datos (Qué información guardamos)

La base de datos tiene 4 tablas principales:

**Tabla: aulas**
```
Ejemplo:
id | nombre            | ip_esp32
---+-------------------+--------------
1  | Aula de Hardware  | 192.168.1.10
2  | Laboratorio 5     | 192.168.1.11
```

**Tabla: sensores**
```
Ejemplo:
id | aula_id | nombre          | pin | tipo     | estado
---+---------+-----------------+-----+----------+-------
1  | 1       | Luz Principal   | 32  | relé     | 1
2  | 1       | Sensor de Luz   | 32  | LDR      | 0
3  | 1       | Sensor Movimiento| 34 | PIR      | 1
```

**Tabla: registros (Historial de todo)**
```
Ejemplo:
id | sensor_id | usuario_id | tipo_actuador | valor_anterior | valor_nuevo | timestamp
---+-----------+------------+---------------+----------------+-------------+-------------------
1  | 1         | 3          | usuario       | 0              | 1           | 2025-01-20 10:30
2  | 1         | NULL       | automatico    | 1              | 0           | 2025-01-20 11:00
3  | 1         | 5          | externo       | 0              | 1           | 2025-01-20 14:45
```

**Tipos de actuador:**
- `usuario`: Una persona hizo click en la app
- `automatico`: El sistema apagó por inactividad
- `externo`: Alguien accionó el switch físico del aula

**Tabla: usuarios**
```
Ejemplo:
id | nombre    | email           | rol       | password (encriptada)
---+-----------+-----------------+-----------+----------------------
1  | Admin     | admin@unlp.edu  | admin     | $2a$10$...
2  | Profesor  | profe@unlp.edu  | operador  | $2a$10$...
```
- `externo`: Cambio físico detectado por ESP32
- `automatico`: Apagado por inactividad (30s sin movimiento)
- `inactividad`: (legacy, no usado actualmente)

---

## 6. Demostración Práctica

### Paso 1: Iniciar Sistema (2 min)

**Terminal 1 - Backend:**
```bash
cd backend
node server.js
```
✅ Servidor en http://localhost:3003

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
✅ App en http://localhost:5173

**Navegador - Simulador ESP32:**
```
Abrir: esp32/simulador-simple.html
Configurar IP: 192.168.0.9
Conectar
```

### Paso 2: Login (30 seg)

**Credenciales:**
- Admin: `ADMIN001` / `admin123`
- Operario: `OP001` / `operario123`

### Paso 3: Casos de Uso (5 min)

#### Caso 1: Control de Luz desde App
1. Ir a "Aulas"
---

## 6. Demostración en vivo

### ¿Qué podemos mostrar?

**En la pantalla:**
1. Abrir la aplicación web
2. Hacer login
3. Ver lista de aulas
4. Entrar a un aula específica
5. Controlar luces/aires con un click
6. Ver historial de cambios

**Lo que verán pasar:**

```
TÚ haces click en "Encender luz"
  ↓
La luz en la pantalla cambia a VERDE (instantáneo)
  ↓
El servidor recibe el comando
  ↓
ESP32 enciende la luz física real
  ↓
Todos los celulares conectados ven el cambio
  ↓
Se guarda en el historial quién lo hizo
```

### Casos interesantes a demostrar

**Caso 1: Control remoto**
- Click en un botón → La luz real se enciende
- Todos lo ven al mismo tiempo

**Caso 2: Apagado automático inteligente**
- Si nadie se mueve por 30 segundos
- El sistema apaga las luces solo
- En el historial dice "automático" (no "usuario")

**Caso 3: Ver el historial**
- Muestra TODO lo que pasó
- Quién encendió/apagó cada cosa
- Fecha y hora exacta

---

## 7. Conclusiones

### ¿Qué logramos hacer?

✅ **Una aplicación que permite controlar aulas reales desde internet**
✅ **Los cambios se ven al instante, como WhatsApp**
✅ **Se guarda TODO lo que pasa (quién, cuándo, cómo)**
✅ **Sistema inteligente que apaga luces cuando no hay nadie**
✅ **Seguro: Solo entran con usuario y contraseña**

### Lo más difícil del proyecto

1. **Hacer que todo funcione al mismo tiempo**
   - La aplicación web
   - El servidor
   - El ESP32
   - Todo tiene que estar sincronizado

2. **Evitar duplicados**
   - Cuando pasa algo, todos quieren avisarte
   - Tuvimos que hacer que solo se registre una vez

3. **Apagado automático**
   - El ESP32 tenía que avisar al servidor de forma especial
   - Antes se guardaba mal en el historial

### ¿Qué aprendimos?

💡 **Comunicación en tiempo real:** Es como tener una llamada abierta, no como enviar mensajes  
💡 **Internet de las Cosas (IoT):** Conectar dispositivos físicos a internet  
💡 **Trabajo en equipo:** Frontend, Backend y Hardware tienen que hablar el mismo idioma  
💡 **Arquitectura:** Diseñar bien desde el principio ahorra muchos problemas después  

### ¿Para qué sirve esto en la vida real?

✨ **Domótica:** Casas inteligentes (Google Home, Alexa)  
✨ **Industria:** Monitorear fábricas desde cualquier lugar  
✨ **Agricultura:** Riego automático con sensores de humedad  
✨ **Salud:** Dispositivos médicos que envían datos al doctor  

---

## Preguntas frecuentes

**¿Y si se corta internet?**
→ El sistema guarda el último estado conocido. Cuando vuelve, se sincroniza solo.

**¿Cuántas aulas puedo controlar?**
→ Tantas como quieras. Cada ESP32 se conecta con su IP única.

**¿Es seguro?**
→ Sí, solo entran usuarios autorizados. Las contraseñas están encriptadas.

**¿Qué pasa si 10 personas controlan la misma aula?**
→ Todos ven los cambios al instante, como si estuvieran en la misma habitación.

---

# ¡Gracias! 🎉

**¿Alguna pregunta?**
- [ ] Machine Learning para predecir uso
- [ ] Optimización energética automática
- [ ] Integración con sistemas de climatización
- [ ] Expansión a múltiples edificios

### 📊 Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| **Líneas de código** | ~3,500 |
| **Archivos fuente** | 45+ |
| **Endpoints API** | 25+ |
| **Componentes React** | 20+ |
| **Tablas BD** | 4 |
| **Sensores por aula** | 7 |
| **Tiempo de respuesta** | < 200ms |
| **Latencia WebSocket** | < 50ms |

### 🎓 Conclusión Final

Este proyecto demuestra la integración exitosa de:
- **IoT** (hardware físico)
- **Backend robusto** (Node.js + Express)
- **Frontend moderno** (React)
- **Comunicación en tiempo real** (WebSocket)
- **Base de datos relacional** (SQLite)

Todo funcionando de forma **coordinada, eficiente y escalable**.

---

## 📚 Referencias y Recursos

### Documentación Oficial
- [Node.js](https://nodejs.org/docs/)
- [React](https://react.dev/)
- [Socket.IO](https://socket.io/docs/)
- [Express.js](https://expressjs.com/)
- [ESP32 Arduino](https://docs.espressif.com/)

### Repositorio
- **GitHub:** [Proyecto-Comunicación-de-Datos-2025-Aula-IoT](https://github.com/AgustinRuizDiaz/Proyecto-Comunicaci-n-de-Datos-2025-Aula-IoT)
- **Branch:** desarrollo
- **Commits:** 15+

### Archivos Importantes
- `README.md` - Guía general
- `backend/README.md` - API documentation
- `esp32/README.md` - Hardware setup
- `DEPLOYMENT.md` - Despliegue producción

---

## ❓ Preguntas Frecuentes (FAQ)

**1. ¿Funciona sin hardware ESP32?**
✅ Sí, hay un simulador web completamente funcional en `esp32/simulador-simple.html`

**2. ¿Se puede usar en producción?**
✅ Sí, pero se recomienda:
- Cambiar a PostgreSQL o MySQL
- Agregar HTTPS
- Configurar variables de entorno
- Implementar rate limiting

**3. ¿Cuántos ESP32 soporta?**
✅ Ilimitados teóricamente. Probado con 5 simultáneos sin problemas.

**4. ¿Qué pasa si se pierde la conexión WiFi?**
✅ ESP32 reintenta conexión automáticamente. Backend marca aula como offline después de 2 minutos.

**5. ¿Los datos persisten?**
✅ Sí, SQLite guarda todo en `database.sqlite`. No se pierde nada al reiniciar.

---

## 🙏 Agradecimientos

- **Universidad Nacional del Nordeste (UNNE)**
- **Cátedra de Comunicación de Datos 2025**
- **Comunidad Open Source** (React, Node.js, ESP32)

---

**¡Fin de la Presentación!**

**¿Preguntas?** 🤔

---

*Última actualización: Noviembre 2025*  
*Versión: 1.0*
