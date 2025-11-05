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
    
    const timestamp = new Date().toISOString();
    console.log(`\n📡 === DATOS RECIBIDOS DEL ESP32 [${timestamp}] ===`);
    console.log(`IP: ${ip}`);
    console.log(`Cantidad de sensores en array: ${sensores ? sensores.length : 0}`);
    console.log(`Sensores completos:`, JSON.stringify(sensores, null, 2));

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
      console.log(`⚠️ Aula NO encontrada con IP: ${ip}`);
      return res.status(404).json({
        success: false,
        error: `No se encontró aula con IP ${ip}`
      });
    }

    // Actualizar última señal (heartbeat)
    await Aula.updateUltimaSenal(aula.id);

    console.log(`\n🔄 Procesando ${sensores.length} sensores para aula ID ${aula.id}...`);
    
    // Actualizar estados de sensores
    for (const sensorData of sensores) {
      const { pin, estado } = sensorData;
      console.log(`\n  → Procesando Pin ${pin}, Estado=${estado}`);
      
      // Buscar sensor por aula_id y pin
      const sensor = await db.get(
        'SELECT * FROM sensores WHERE id_aula = ? AND pin = ?',
        [aula.id, pin]
      );

      if (sensor) {
        // Verificar si el estado realmente cambió
        const estadoCambio = sensor.estado !== estado;
        
        console.log(`🔍 Sensor ID ${sensor.id} (Pin ${pin}): Estado anterior=${sensor.estado}, Nuevo=${estado}, ¿Cambió? ${estadoCambio}`);
        
        // Actualizar estado del sensor en BD
        await Sensor.updateEstado(sensor.id, estado);
        
        // Crear registro SOLO si el estado cambió realmente
        if (estadoCambio) {
          // Verificar si este cambio corresponde a un comando pendiente de usuario
          const usuarioId = recentChanges.consumePendingCommand(sensor.id);
          
          const tipoActuador = usuarioId ? 'usuario' : 'externo';
          
          await Registro.create({
            id_sensor: sensor.id,
            tipo_actuador: tipoActuador,
            id_usuario: usuarioId, // Será el ID del usuario si vino de la app, null si es externo
            estado: estado
          });
          
          if (usuarioId) {
            console.log(`📝 Registro creado: Pin ${pin} cambió a ${estado === 1 ? 'ON' : 'OFF'} (USUARIO confirmado)`);
          } else {
            console.log(`📝 Registro creado: Pin ${pin} cambió a ${estado === 1 ? 'ON' : 'OFF'} (EXTERNO - interruptor físico o automático)`);
          }
        } else {
          console.log(`⏭️ Pin ${pin}: Sin cambio (ya estaba en ${estado === 1 ? 'ON' : 'OFF'})`);
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
      } else {
        console.log(`⚠️ Sensor NO encontrado en BD: Pin ${pin} para aula ${aula.id}`);
      }
    }

    console.log(`\n✅ Procesamiento completado para aula ID ${aula.id}\n`);

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
      console.log(`⚠️ Aula NO encontrada con IP: ${ip}`);
      return res.status(404).json({
        success: false,
        error: `No se encontró aula con IP ${ip}`
      });
    }

    // Procesar apagados automáticos
    for (const sensorData of sensores) {
      const { pin, estado } = sensorData;
      
      // Buscar sensor por aula_id y pin
      const sensor = await db.get(
        'SELECT * FROM sensores WHERE id_aula = ? AND pin = ?',
        [aula.id, pin]
      );

      if (sensor && estado === 0) { // Solo procesar apagados
        // Verificar si hay cambio real de estado
        const estadoCambio = sensor.estado !== estado;
        
        if (estadoCambio) {
          // Actualizar estado del sensor
          await Sensor.updateEstado(sensor.id, estado);
          
          // Verificar si este apagado corresponde a un comando pendiente de usuario
          // (en caso de que el usuario haya presionado "apagar" justo antes del timeout automático)
          const usuarioId = recentChanges.consumePendingCommand(sensor.id);
          
          const tipoActuador = usuarioId ? 'usuario' : 'automatico';
          
          // Crear registro
          await Registro.create({
            id_sensor: sensor.id,
            tipo_actuador: tipoActuador,
            id_usuario: usuarioId, // Será el ID del usuario si vino de la app, null si es automático
            estado: estado
          });
          
          if (usuarioId) {
            console.log(`💤 Apagado: Pin ${pin} (confirmado como USUARIO en lugar de automático)`);
          } else {
            console.log(`💤 Apagado automático: Pin ${pin} (30s sin movimiento)`);
          }
          
          // Notificar vía WebSocket
          const io = req.app.get('socketio');
          if (io) {
            io.emit('sensorUpdate', {
              id: sensor.id,
              id_aula: aula.id,
              pin,
              estado,
              tipo: sensor.tipo,
              automatico: !usuarioId // Solo es automático si no hay usuario
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
    console.error('❌ Error procesando auto-off:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
