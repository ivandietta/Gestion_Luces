const db = require('../database');

class Registro {
  /**
   * Crear un nuevo registro de cambio de estado
   * @param {Object} data - { id_sensor, tipo_actuador, id_usuario?, estado }
   */
  static async create({ id_sensor, tipo_actuador, id_usuario, estado }) {
    try {
      // Validar tipo_actuador
      const tiposValidos = ['usuario', 'inactividad', 'externo', 'automatico'];
      if (!tiposValidos.includes(tipo_actuador)) {
        throw new Error(`Tipo de actuador inválido: ${tipo_actuador}. Debe ser: usuario, inactividad, externo o automatico`);
      }

      // Validar id_usuario si tipo es 'usuario'
      if (tipo_actuador === 'usuario' && !id_usuario) {
        throw new Error('id_usuario es requerido cuando tipo_actuador es "usuario"');
      }

      const result = await db.run(
        `INSERT INTO registros (id_sensor, tipo_actuador, id_usuario, fecha_hora, estado)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        [id_sensor, tipo_actuador, id_usuario || null, estado]
      );

      return await this.findById(result.lastID);
    } catch (error) {
      console.error('❌ Error creando registro:', error);
      throw error;
    }
  }

  /**
   * Obtener registro por ID
   */
  static async findById(id) {
    try {
      const registro = await db.get(
        `SELECT r.*, s.tipo as tipo_sensor, s.pin, s.id_aula, u.nombre as usuario_nombre, u.apellido as usuario_apellido
         FROM registros r
         LEFT JOIN sensores s ON r.id_sensor = s.id
         LEFT JOIN usuarios u ON r.id_usuario = u.id
         WHERE r.id = ?`,
        [id]
      );

      if (!registro) {
        throw new Error('Registro no encontrado');
      }

      return registro;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener todos los registros (con información de sensor, aula y usuario)
   * @param {Object} options - { limit?, offset?, id_aula?, id_sensor?, tipo_actuador? }
   */
  static async findAll(options = {}) {
    try {
      const { limit, offset, id_aula, id_sensor, tipo_actuador } = options;

      let query = `
        SELECT 
          r.id,
          r.id_sensor,
          r.tipo_actuador,
          r.id_usuario,
          r.fecha_hora,
          r.estado,
          s.tipo as tipo_sensor,
          s.pin,
          s.id_aula,
          a.nombre as aula_nombre,
          u.nombre as usuario_nombre,
          u.apellido as usuario_apellido,
          u.legajo as usuario_legajo
        FROM registros r
        INNER JOIN sensores s ON r.id_sensor = s.id
        INNER JOIN aulas a ON s.id_aula = a.id
        LEFT JOIN usuarios u ON r.id_usuario = u.id
        WHERE 1=1
      `;

      const params = [];

      // Filtros opcionales
      if (id_aula) {
        query += ' AND s.id_aula = ?';
        params.push(id_aula);
      }

      if (id_sensor) {
        query += ' AND r.id_sensor = ?';
        params.push(id_sensor);
      }

      if (tipo_actuador) {
        query += ' AND r.tipo_actuador = ?';
        params.push(tipo_actuador);
      }

      // Ordenar por fecha más reciente primero
      query += ' ORDER BY r.fecha_hora DESC';

      // Paginación
      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);

        if (offset) {
          query += ' OFFSET ?';
          params.push(offset);
        }
      }

      const registros = await db.all(query, params);
      return registros;
    } catch (error) {
      console.error('❌ Error obteniendo registros:', error);
      throw error;
    }
  }

  /**
   * Obtener registros de un sensor específico
   */
  static async findBySensorId(id_sensor, limit = 50) {
    try {
      return await this.findAll({ id_sensor, limit });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener registros de un aula específica
   */
  static async findByAulaId(id_aula, limit = 100) {
    try {
      return await this.findAll({ id_aula, limit });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener registros por tipo de actuador
   */
  static async findByTipoActuador(tipo_actuador, limit = 100) {
    try {
      return await this.findAll({ tipo_actuador, limit });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Contar total de registros (con filtros opcionales)
   */
  static async count(options = {}) {
    try {
      const { id_aula, id_sensor, tipo_actuador } = options;

      let query = `
        SELECT COUNT(*) as total
        FROM registros r
        INNER JOIN sensores s ON r.id_sensor = s.id
        WHERE 1=1
      `;

      const params = [];

      if (id_aula) {
        query += ' AND s.id_aula = ?';
        params.push(id_aula);
      }

      if (id_sensor) {
        query += ' AND r.id_sensor = ?';
        params.push(id_sensor);
      }

      if (tipo_actuador) {
        query += ' AND r.tipo_actuador = ?';
        params.push(tipo_actuador);
      }

      const result = await db.get(query, params);
      return result.total;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar registro (opcional - normalmente los registros no se eliminan)
   */
  static async delete(id) {
    try {
      const registro = await this.findById(id);

      await db.run('DELETE FROM registros WHERE id = ?', [id]);

      return registro;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar registros antiguos (limpieza periódica)
   * @param {number} dias - Eliminar registros más antiguos que X días
   */
  static async deleteOlderThan(dias) {
    try {
      const result = await db.run(
        `DELETE FROM registros WHERE fecha_hora < datetime('now', '-${dias} days')`
      );

      return result.changes;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Registro;
