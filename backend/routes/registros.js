const express = require('express');
const router = express.Router();
const Registro = require('../models/Registro');
const { authenticateToken } = require('../middleware/auth');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

/**
 * GET /api/registros/export/csv - Exportar registros a CSV
 * IMPORTANTE: Esta ruta debe estar ANTES de las rutas con parámetros dinámicos
 * Accesible por todos los roles
 */
router.get('/export/csv', async (req, res) => {
  try {
    const { id_aula, id_sensor, tipo_actuador } = req.query;

    // Validar filtros opcionales
    let idAulaNum, idSensorNum;
    
    if (id_aula) {
      idAulaNum = parseInt(id_aula);
      if (isNaN(idAulaNum)) {
        return res.status(400).json({
          success: false,
          error: 'id_aula debe ser un número'
        });
      }
    }

    if (id_sensor) {
      idSensorNum = parseInt(id_sensor);
      if (isNaN(idSensorNum)) {
        return res.status(400).json({
          success: false,
          error: 'id_sensor debe ser un número'
        });
      }
    }

    if (tipo_actuador && !['usuario', 'inactividad', 'externo'].includes(tipo_actuador)) {
      return res.status(400).json({
        success: false,
        error: 'tipo_actuador debe ser: usuario, inactividad o externo'
      });
    }

    // Obtener todos los registros (sin límite para exportación completa)
    const registros = await Registro.findAll({
      id_aula: idAulaNum,
      id_sensor: idSensorNum,
      tipo_actuador
    });

    // Generar CSV
    const csvHeaders = 'ID,Fecha y Hora,Aula,Sensor,Tipo Sensor,Pin,Estado,Fuente,Usuario\n';
    
    const csvRows = registros.map(registro => {
      const estado = getEstadoLabel(registro.tipo_sensor, registro.estado);
      const fuente = getFuenteLabel(registro.tipo_actuador);
      const usuario = registro.usuario_legajo || '';
      
      return [
        registro.id,
        registro.fecha_hora,
        `"${registro.aula_nombre || 'N/A'}"`,
        `"${registro.tipo_sensor || 'N/A'}"`,
        `"${registro.tipo_sensor || 'N/A'}"`,
        registro.pin,
        `"${estado}"`,
        `"${fuente}"`,
        `"${usuario}"`
      ].join(',');
    }).join('\n');

    const csv = csvHeaders + csvRows;

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="registros_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\uFEFF' + csv); // BOM para UTF-8

  } catch (error) {
    console.error('❌ Error exportando CSV:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/registros - Obtener todos los registros
 * Query params opcionales:
 *  - limit: número máximo de registros (default: 100)
 *  - offset: número de registros a saltar
 *  - id_aula: filtrar por aula
 *  - id_sensor: filtrar por sensor
 *  - tipo_actuador: filtrar por tipo (usuario/inactividad/externo)
 * 
 * Accesible por todos los roles (admin, operario)
 */
router.get('/', async (req, res) => {
  try {
    const { limit, offset, id_aula, id_sensor, tipo_actuador } = req.query;

    // Validar limit si se proporciona
    let limitNum = 100; // Default
    if (limit) {
      limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
        return res.status(400).json({
          success: false,
          error: 'El límite debe ser un número entre 1 y 1000'
        });
      }
    }

    // Validar offset si se proporciona
    let offsetNum;
    if (offset) {
      offsetNum = parseInt(offset);
      if (isNaN(offsetNum) || offsetNum < 0) {
        return res.status(400).json({
          success: false,
          error: 'El offset debe ser un número positivo'
        });
      }
    }

    // Validar id_aula si se proporciona
    let idAulaNum;
    if (id_aula) {
      idAulaNum = parseInt(id_aula);
      if (isNaN(idAulaNum)) {
        return res.status(400).json({
          success: false,
          error: 'id_aula debe ser un número'
        });
      }
    }

    // Validar id_sensor si se proporciona
    let idSensorNum;
    if (id_sensor) {
      idSensorNum = parseInt(id_sensor);
      if (isNaN(idSensorNum)) {
        return res.status(400).json({
          success: false,
          error: 'id_sensor debe ser un número'
        });
      }
    }

    // Validar tipo_actuador si se proporciona
    if (tipo_actuador && !['usuario', 'inactividad', 'externo'].includes(tipo_actuador)) {
      return res.status(400).json({
        success: false,
        error: 'tipo_actuador debe ser: usuario, inactividad o externo'
      });
    }

    // Obtener registros con filtros
    const registros = await Registro.findAll({
      limit: limitNum,
      offset: offsetNum,
      id_aula: idAulaNum,
      id_sensor: idSensorNum,
      tipo_actuador
    });

    // Obtener total de registros (para paginación)
    const total = await Registro.count({
      id_aula: idAulaNum,
      id_sensor: idSensorNum,
      tipo_actuador
    });

    res.json({
      success: true,
      data: registros,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum || 0,
        returned: registros.length
      }
    });
  } catch (error) {
    console.error('❌ Error en GET /api/registros:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/registros/:id - Obtener un registro específico
 * Accesible por todos los roles
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const registro = await Registro.findById(id);

    res.json({
      success: true,
      data: registro
    });
  } catch (error) {
    if (error.message === 'Registro no encontrado') {
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

/**
 * GET /api/registros/sensor/:id_sensor - Obtener registros de un sensor
 * Accesible por todos los roles
 */
router.get('/sensor/:id_sensor', async (req, res) => {
  try {
    const { id_sensor } = req.params;
    const { limit } = req.query;

    const limitNum = limit ? parseInt(limit) : 50;

    const registros = await Registro.findBySensorId(id_sensor, limitNum);

    res.json({
      success: true,
      data: registros,
      count: registros.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/registros/aula/:id_aula - Obtener registros de un aula
 * Accesible por todos los roles
 */
router.get('/aula/:id_aula', async (req, res) => {
  try {
    const { id_aula } = req.params;
    const { limit } = req.query;

    const limitNum = limit ? parseInt(limit) : 100;

    const registros = await Registro.findByAulaId(id_aula, limitNum);

    res.json({
      success: true,
      data: registros,
      count: registros.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Funciones auxiliares para el CSV
function getFuenteLabel(tipo_actuador) {
  const labels = {
    'usuario': 'Usuario',
    'inactividad': 'Sistema',
    'externo': 'Externo'
  };
  return labels[tipo_actuador] || 'Sistema';
}

function getEstadoLabel(tipoSensor, estado) {
  const tipo = (tipoSensor || '').toLowerCase();
  
  if (tipo.includes('luz')) {
    return estado === 1 ? 'Prendido' : 'Apagado';
  } else if (tipo.includes('puerta') || tipo.includes('ventana')) {
    return estado === 1 ? 'Abierta' : 'Cerrada';
  } else if (tipo.includes('movimiento')) {
    return estado === 1 ? 'Ocupada' : 'Desocupada';
  }
  
  return estado === 1 ? 'Encendido' : 'Apagado';
}

module.exports = router;
