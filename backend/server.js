const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Importar y conectar base de datos
const db = require('./database');

const app = express();
const server = createServer(app);

// Configurar CORS para producción
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://gestion-luces.vercel.app', // URL de producción principal
  'https://gestion-luces-git-desarrollo-ivans-projects-18247153.vercel.app',
  'https://gestion-luces-r2qi4m4l6-ivans-projects-18247153.vercel.app'
];

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // Permitir requests sin origin (apps móviles, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  allowEIO4: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  maxHttpBufferSize: 1e6,
  path: '/socket.io',
  serveClient: false,
  allowUpgrades: true,
  perMessageDeflate: false,
  // Configuración para proxies (Railway)
  cookie: false,
  transports: ['polling', 'websocket']  // Polling primero, luego upgrade
});

const PORT = process.env.PORT || 3003;

// Inicializar base de datos antes de iniciar el servidor
async function initializeServer() {
  try {
    console.log('🔧 Inicializando servidor...');

    // Conectar a la base de datos
    await db.connect();
    console.log('✅ Base de datos conectada');

    // Inicializar tablas si no existen
    await db.initialize();
    console.log('✅ Tablas inicializadas');

    // Verificar si hay datos iniciales, si no, crearlos
    const usersCount = await db.get('SELECT COUNT(*) as count FROM usuarios');
    if (usersCount.count === 0) {
      console.log('📝 Base de datos vacía, insertando datos iniciales...');
      const initDb = require('./scripts/initDatabase');
      await initDb(false); // false = no cerrar conexión
    }

    // Configurar CORS middleware
    app.use(cors({
      origin: function (origin, callback) {
        // Permitir requests sin origin (apps móviles, Postman, curl, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"]
    }));
    
    // CRÍTICO para Railway: Confiar en el proxy
    app.set('trust proxy', 1);
    
    // Comprimir todas las respuestas HTTP (mejora velocidad 60-80%)
    app.use(compression());
    
    app.use(express.json());

    // Hacer Socket.IO accesible en todas las rutas
    app.set('socketio', io);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: db ? 'connected' : 'disconnected'
      });
    });

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({ 
        message: 'API Gestor de Aulas - Sistema IoT',
        version: '1.0.0',
        endpoints: [
          'GET /health',
          'POST /auth/login',
          'POST /auth/register',
          'GET /aulas',
          'GET /sensores',
          'POST /esp32/data'
        ]
      });
    });

    // Importar rutas modulares
    const usuarioRoutes = require('./routes/usuarios');
    const authRoutes = require('./routes/auth');
    const aulaRoutes = require('./routes/aulas');
    const sensorRoutes = require('./routes/sensores');
    const esp32Routes = require('./routes/esp32');
    const registroRoutes = require('./routes/registros');

    // Usar rutas modulares
    app.use('/usuarios', usuarioRoutes);
    app.use('/auth', authRoutes);
    app.use('/aulas', aulaRoutes);
    app.use('/sensores', sensorRoutes);
    app.use('/esp32', esp32Routes);
    app.use('/api/registros', registroRoutes);

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log('✅ Cliente WebSocket conectado:', socket.id);

      // Manejar join del ESP32 (cuando se conecta)
      socket.on('join', (data) => {
        console.log('📥 Evento JOIN recibido:', JSON.stringify(data));
        const { room } = data;
        if (room && room.startsWith('esp32:')) {
          socket.join(room);
          console.log(`✅ ESP32 unido a sala: ${room}`);
          
          // Verificar que realmente está en la sala
          const roomClients = io.sockets.adapter.rooms.get(room);
          console.log(`   📊 Clientes en sala ${room}: ${roomClients ? roomClients.size : 0}`);
          
          socket.emit('joined', { room, socketId: socket.id });
        } else {
          console.log('⚠️ Nombre de sala inválido:', room);
        }
      });

      // Manejar identificación de ESP32 (método alternativo)
      socket.on('esp32:identify', (data) => {
        const { ip } = data;
        console.log(`🔌 ESP32 identificado: ${ip} (socket: ${socket.id})`);
        
        // Unirse a una sala específica para este ESP32
        socket.join(`esp32:${ip}`);
        console.log(`  ✅ ESP32 ${ip} unido a sala: esp32:${ip}`);
        
        // Confirmar identificación
        socket.emit('esp32:identified', { ip, socketId: socket.id });
      });

      socket.on('disconnect', () => {
        console.log('❌ Cliente WebSocket desconectado:', socket.id);
      });

      socket.on('user_action', (data) => {
        console.log('📡 Acción de usuario recibida:', data);
      });
    });

    // Ruta raíz
    app.get('/', (req, res) => {
      res.json({
        message: 'API del Sistema de Gestión de Aulas IoT',
        version: '1.0.0',
        status: 'activo',
        socketio: 'habilitado',
        database: 'conectada'
      });
    });

    // Health check endpoint para Railway y monitoreo
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Middleware de manejo de errores 404 - debe estar al final
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Ruta no encontrada',
        message: `La ruta ${req.originalUrl} no existe`,
        disponibles: {
          usuarios: 'GET, POST, PUT, DELETE /usuarios',
          auth: 'POST /auth/login, POST /auth/register',
          aulas: 'GET, POST, PUT, DELETE /aulas'
        }
      });
    });

    // Iniciar servidor con Socket.IO en todas las interfaces de red
    server.listen(PORT, '0.0.0.0', () => {
      const deploymentUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : `http://localhost:${PORT}`;
      
      console.log(`🚀 Servidor corriendo en ${deploymentUrl}`);
      console.log(`🔌 Socket.IO habilitado`);
      console.log(`📋 Rutas disponibles:`);
      console.log(`   GET  / (Info del servidor)`);
      console.log(`   GET  /health (Health check)`);
      console.log(`   POST /auth/login`);
      console.log(`   POST /auth/register`);
      console.log(`   GET, POST, PUT, DELETE /usuarios`);
      console.log(`   GET, POST, PUT, DELETE /aulas`);
      console.log(`   GET, POST, PUT, DELETE /sensores`);
      console.log(`   POST /esp32/data`);
      console.log(`   POST /esp32/auto-off`);
      console.log(`   GET  /registros`);
    });

  } catch (error) {
    console.error('❌ Error inicializando servidor:', error.message);
    process.exit(1);
  }
}

// Inicializar servidor
initializeServer();

module.exports = app;
