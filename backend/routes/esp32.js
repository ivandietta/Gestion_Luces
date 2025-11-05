const express = require('express');
const router = express.Router();
const Aula = require('../models/Aula');
const Sensor = require('../models/Sensor');
const Registro = require('../models/Registro');
const commandQueue = require('../commandQueue');
const recentChanges = require('../recentChanges');

// POST /esp32/data - Recibir datos del ESP32 (sin autenticación)
router.post('/data', async (req, res) => {
  try {
    const { ip, sensores } = req.body;

    // Validar datos
    if (!ip || !sensores || !Array.isArray(sensores)) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos. Se requiere ip y array de sensores'
      });
    }

    // Buscar el aula por IP
    const db = require('../database');
    const aula = await db.get('SELECT * FROM aulas WHERE ip = ?', [ip]);

    if (!aula) {
      return res.status(404).json({
        success: false,
        error: `No se encontró aula con IP ${ip}`
      });
    }

    // Actualizar última señal (heartbeat)
    await Aula.updateUltimaSenal(aula.id);
    
    // Actualizar estados de sensores
    for (const sensorData of sensores) {
      const { pin, estado } = sensorData;
      
      // Buscar sensor por aula_id y pin
      const sensor = await db.get(
        'SELECT * FROM sensores WHERE id_aula = ? AND pin = ?',
        [aula.id, pin]
      );

      if (sensor) {
        // Verificar si el estado realmente cambió
        const estadoCambio = sensor.estado !== estado;
        
        console.log(`[DEBUG] Pin ${pin}: estado anterior=${sensor.estado}, nuevo=${estado}, cambió=${estadoCambio}`);
        
        // Actualizar estado del sensor en BD
        await Sensor.updateEstado(sensor.id, estado);
        
        // Crear registro SOLO si el estado cambió realmente
        if (estadoCambio) {
          // Verificar si este cambio corresponde a un comando pendiente de usuario
          console.log(`[DEBUG] Verificando comando pendiente para sensor ID ${sensor.id}...`);
          const usuarioId = recentChanges.consumePendingCommand(sensor.id);
          
          const tipoActuador = usuarioId ? 'usuario' : 'externo';
          
          console.log(`[DEBUG] Pin ${pin} → Tipo: ${tipoActuador}, Usuario ID: ${usuarioId}`);
          
          await Registro.create({
            id_sensor: sensor.id,
            tipo_actuador: tipoActuador,
            id_usuario: usuarioId,
            estado: estado
          });
        }
        
        // Notificar vía WebSocket solo si cambió
        if (estadoCambio) {
          const io = req.app.get('socketio');
          if (io) {
            io.emit('sensorUpdate', {
              id: sensor.id,
              id_aula: aula.id,
              pin,
              estado,
              tipo: sensor.tipo
            });
          }
        }
      }
    }

    // Verificar si hay comandos pendientes
    const commands = commandQueue.getAndClear(ip);

    res.json({
      success: true,
      message: 'Datos recibidos correctamente',
      aula: {
        id: aula.id,
        nombre: aula.nombre
      },
      comandos: commands // IMPORTANTE: debe ser "comandos" no "commands"
    });

  } catch (error) {
    console.error('❌ Error procesando datos ESP32:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /esp32/command - Encolar comando para ESP32 (usado internamente por el backend)
router.post('/command', async (req, res) => {
  try {
    const { ip, pin, action } = req.body;

    if (!ip || pin === undefined || !action) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere ip, pin y action'
      });
    }

    // Encolar comando usando el módulo compartido
    commandQueue.enqueueCommand(ip, pin, action);

    res.json({
      success: true,
      message: 'Comando encolado',
      command: { ip, pin, action }
    });

  } catch (error) {
    console.error('❌ Error encolando comando:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /esp32/auto-off - Recibir notificación de apagado automático (sin autenticación)
router.post('/auto-off', async (req, res) => {
  try {
    const { ip, sensores } = req.body;

    // Validar datos
    if (!ip || !sensores || !Array.isArray(sensores)) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos. Se requiere ip y array de sensores'
      });
    }

    // Buscar el aula por IP
    const db = require('../database');
    const aula = await db.get('SELECT * FROM aulas WHERE ip = ?', [ip]);

    if (!aula) {
      return res.status(404).json({
        success: false,
        error: `No se encontró aula con IP ${ip}`
      });
    }

    // Procesar TODOS los apagados automáticos en el array
    for (const sensorData of sensores) {
      const { pin, estado } = sensorData;
      
      // Buscar sensor por aula_id y pin
      const sensor = await db.get(
        'SELECT * FROM sensores WHERE id_aula = ? AND pin = ?',
        [aula.id, pin]
      );

      if (sensor && estado === 0) {
        // Verificar si hay cambio real de estado
        const estadoCambio = sensor.estado !== estado;
        
        if (estadoCambio) {
          // Actualizar estado del sensor
          await Sensor.updateEstado(sensor.id, estado);
          
          // Verificar si este apagado corresponde a un comando pendiente de usuario
          const usuarioId = recentChanges.consumePendingCommand(sensor.id);
          const tipoActuador = usuarioId ? 'usuario' : 'automatico';
          
          // Crear registro
          await Registro.create({
            id_sensor: sensor.id,
            tipo_actuador: tipoActuador,
            id_usuario: usuarioId,
            estado: estado
          });
          
          // Notificar vía WebSocket
          const io = req.app.get('socketio');
          if (io) {
            io.emit('sensorUpdate', {
              id: sensor.id,
              id_aula: aula.id,
              pin,
              estado,
              tipo: sensor.tipo,
              automatico: !usuarioId
            });
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Apagado automático registrado correctamente'
    });

  } catch (error) {
    console.error('Error en auto-off:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
