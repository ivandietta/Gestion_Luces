const express = require('express');
const router = express.Router();
const Sensor = require('../models/Sensor');
const Registro = require('../models/Registro');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /sensores - Obtener todos los sensores
router.get('/', async (req, res) => {
  try {
    const sensores = await Sensor.findAll();
    
    res.json({
      success: true,
      data: sensores
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /sensores/aula/:id_aula - Obtener sensores de un aula específica
router.get('/aula/:id_aula', async (req, res) => {
  try {
    const { id_aula } = req.params;
    const Aula = require('../models/Aula');
    
    // Obtener información del aula para verificar si está online
    const aula = await Aula.findById(id_aula);
    const sensores = await Sensor.findByAulaId(id_aula);
    
    // Verificar si el aula está offline (más de 2 minutos sin señal)
    let sensoresFinales = sensores;
    if (aula && aula.ultima_senal) {
      const now = new Date();
      const signalDate = new Date(aula.ultima_senal);
      const diffMinutes = (now - signalDate) / 60000;
      
      // Si el aula está offline, forzar todos los sensores a estado 0
      if (diffMinutes >= 2) {
        sensoresFinales = sensores.map(sensor => ({
          ...sensor,
          estado: 0
        }));
      }
    } else if (!aula || !aula.ultima_senal) {
      // Si nunca ha enviado señal, también forzar a 0
      sensoresFinales = sensores.map(sensor => ({
        ...sensor,
        estado: 0
      }));
    }
    
    res.json({
      success: true,
      data: sensoresFinales
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /sensores/:id - Obtener sensor por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sensor = await Sensor.findById(id);
    
    res.json({
      success: true,
      data: sensor
    });
  } catch (error) {
    if (error.message === 'Sensor no encontrado') {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

// POST /sensores - Crear nuevo sensor (solo administradores)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { tipo, descripcion, pin, estado, id_aula } = req.body;

    // Validaciones básicas
    if (!tipo || pin === undefined || !id_aula) {
      return res.status(400).json({
        success: false,
        error: 'Tipo, pin e id_aula son requeridos'
      });
    }

    // Validar tipo
    const tiposValidos = ['Sensor de luz', 'Sensor de ventana', 'Sensor de movimiento'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de sensor inválido. Debe ser: Sensor de luz, Sensor de ventana o Sensor de movimiento'
      });
    }

    // Validar pin
    const pinNum = parseInt(pin);
    if (isNaN(pinNum) || pinNum < 0 || pinNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'El pin debe ser un número entre 0 y 100'
      });
    }

    // Estado por defecto es 0 (apagado/cerrado/no detectado)
    const estadoFinal = estado !== undefined ? estado : 0;

    const sensor = await Sensor.create({
      tipo,
      descripcion: descripcion || '',
      pin: pinNum,
      estado: estadoFinal,
      id_aula
    });

    res.status(201).json({
      success: true,
      data: sensor,
      message: 'Sensor creado exitosamente'
    });
  } catch (error) {
    if (error.message.includes('Ya existe un sensor')) {
      res.status(409).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

// PUT /sensores/:id - Actualizar sensor (solo administradores)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, descripcion, pin, estado } = req.body;

    // Validar tipo si se proporciona
    if (tipo) {
      const tiposValidos = ['Sensor de luz', 'Sensor de ventana', 'Sensor de movimiento'];
      if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({
          success: false,
          error: 'Tipo de sensor inválido'
        });
      }
    }

    // Validar pin si se proporciona
    if (pin !== undefined) {
      const pinNum = parseInt(pin);
      if (isNaN(pinNum) || pinNum < 0 || pinNum > 100) {
        return res.status(400).json({
          success: false,
          error: 'El pin debe ser un número entre 0 y 100'
        });
      }
    }

    const sensor = await Sensor.update(id, {
      tipo,
      descripcion,
      pin: pin !== undefined ? parseInt(pin) : undefined,
      estado
    });

    res.json({
      success: true,
      data: sensor,
      message: 'Sensor actualizado exitosamente'
    });
  } catch (error) {
    if (error.message === 'Sensor no encontrado') {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else if (error.message.includes('Ya existe un sensor')) {
      res.status(409).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

// PATCH /sensores/:id/estado - Actualizar solo el estado (para ESP32 y operarios con luces)
router.patch('/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (estado === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Estado es requerido'
      });
    }

    // Obtener información del sensor
    const sensorAntes = await Sensor.findById(id);
    
    // Obtener información del aula
    const Aula = require('../models/Aula');
    const aula = await Aula.findById(sensorAntes.id_aula);

    // Si la petición viene con header especial 'x-esp32-update', actualizar directamente
    const esDesdeESP32 = req.headers['x-esp32-update'] === 'true';
    
    if (esDesdeESP32 || !aula || !aula.ip) {
      // Actualizar directamente (viene del ESP32 o no hay IP configurada)
      const sensor = await Sensor.updateEstado(id, estado);
      
      // Crear registro tipo "externo" (cambio físico desde ESP32)
      try {
        await Registro.create({
          id_sensor: id,
          tipo_actuador: 'externo',
          id_usuario: null,
          estado: estado
        });
        console.log(`  📝 Registro creado: Cambio externo en sensor ${id} a estado ${estado}`);
      } catch (error) {
        console.error('  ⚠️ Error creando registro:', error.message);
        // No fallar la actualización del sensor por error en registro
      }
      
      return res.json({
        success: true,
        data: sensor,
        message: 'Estado del sensor actualizado'
      });
    }

    // Verificar si el aula está online antes de permitir cambios desde la app
    if (aula.ultima_senal) {
      const now = new Date();
      const signalDate = new Date(aula.ultima_senal);
      const diffMinutes = (now - signalDate) / 60000;
      
      if (diffMinutes >= 2) {
        return res.status(503).json({
          success: false,
          error: 'El aula está fuera de línea. No se pueden cambiar los sensores.',
          offline: true
        });
      }
    } else {
      return res.status(503).json({
        success: false,
        error: 'El aula nunca se ha conectado. No se pueden cambiar los sensores.',
        offline: true
      });
    }

    // Si viene desde la app web, enviar comando al ESP32 (NO actualizar BD todavía)
    commandQueue.enqueueCommand(aula.ip, sensorAntes.pin, estado === 1 ? 'on' : 'off');
    
    // Registrar este cambio para evitar duplicados cuando el ESP32 confirme
    recentChanges.recordUserChange(parseInt(id), estado, req.user.id);
    
    // Crear registro tipo "usuario" (cambio manual desde la app)
    try {
      await Registro.create({
        id_sensor: id,
        tipo_actuador: 'usuario',
        id_usuario: req.user.id, // ID del usuario autenticado
        estado: estado
      });
      console.log(`  📝 Registro creado: Cambio por usuario ${req.user.legajo} en sensor ${id} a estado ${estado}`);
    } catch (error) {
      console.error('  ⚠️ Error creando registro:', error.message);
      // No fallar el envío del comando por error en registro
    }
    
    // Enviar comando vía WebSocket en tiempo real (si el ESP32 está conectado)
    const io = req.app.get('socketio');
    if (io) {
      const command = {
        pin: sensorAntes.pin,
        estado: estado  // 0 o 1 - El ESP32 espera este formato
      };
      
      const roomName = `esp32:${aula.ip}`;
      const room = io.sockets.adapter.rooms.get(roomName);
      const clientsInRoom = room ? room.size : 0;
      
      console.log(`⚡ Enviando comando a sala ${roomName} (${clientsInRoom} cliente(s)):`, command);
      io.to(roomName).emit('esp32:command', command);
    }
    
    // Responder sin actualizar BD (esperamos confirmación del ESP32)
    res.json({
      success: true,
      message: 'Comando enviado al ESP32. Esperando confirmación...',
      pending: true,
      data: sensorAntes
    });

  } catch (error) {
    console.error('❌ Error en PATCH /sensores/:id/estado:', error);
    if (error.message === 'Sensor no encontrado') {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

// DELETE /sensores/:id - Eliminar sensor (solo administradores)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const sensor = await Sensor.delete(id);

    res.json({
      success: true,
      data: sensor,
      message: 'Sensor eliminado exitosamente'
    });
  } catch (error) {
    if (error.message === 'Sensor no encontrado') {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

module.exports = router;
