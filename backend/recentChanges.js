// Almacén temporal de cambios recientes y comandos pendientes
class RecentChanges {
  constructor() {
    this.changes = new Map(); // Map<aulaId, Array<cambios>>
    this.pendingCommands = new Map(); // Map<sensorId, {timestamp, usuarioId}>
    this.maxChangesPerAula = 50; // Mantener últimos 50 cambios por aula
    this.commandTimeout = 5000; // 5 segundos para confirmar comando
  }

  // Agregar cambio reciente
  add(aulaId, cambio) {
    if (!this.changes.has(aulaId)) {
      this.changes.set(aulaId, []);
    }

    const cambios = this.changes.get(aulaId);
    cambios.unshift({
      ...cambio,
      timestamp: new Date()
    });

    // Mantener solo los últimos N cambios
    if (cambios.length > this.maxChangesPerAula) {
      cambios.length = this.maxChangesPerAula;
    }

    console.log(`📝 Cambio reciente registrado para aula ${aulaId}`);
  }

  // Registrar comando pendiente de usuario
  addPendingCommand(sensorId, usuarioId) {
    this.pendingCommands.set(sensorId, {
      timestamp: Date.now(),
      usuarioId: usuarioId
    });
    console.log(`⏳ Comando pendiente registrado: Sensor ${sensorId} por usuario ${usuarioId}`);
  }

  // Verificar y consumir comando pendiente
  consumePendingCommand(sensorId) {
    const pending = this.pendingCommands.get(sensorId);
    
    if (!pending) {
      return null; // No hay comando pendiente
    }

    const age = Date.now() - pending.timestamp;
    
    if (age > this.commandTimeout) {
      // Comando expiró (más de 5 segundos)
      this.pendingCommands.delete(sensorId);
      console.log(`⏱️ Comando pendiente expiró: Sensor ${sensorId} (${age}ms)`);
      return null;
    }

    // Comando válido, consumirlo
    this.pendingCommands.delete(sensorId);
    console.log(`✅ Comando pendiente confirmado: Sensor ${sensorId} (${age}ms) - Usuario ${pending.usuarioId}`);
    return pending.usuarioId;
  }

  // Obtener cambios recientes de un aula
  get(aulaId, limit = 10) {
    const cambios = this.changes.get(aulaId) || [];
    return cambios.slice(0, limit);
  }

  // Limpiar cambios antiguos (más de 1 hora) y comandos expirados
  cleanup() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Limpiar cambios antiguos
    for (const [aulaId, cambios] of this.changes.entries()) {
      const filtered = cambios.filter(c => c.timestamp.getTime() > oneHourAgo);
      this.changes.set(aulaId, filtered);
    }

    // Limpiar comandos expirados
    for (const [sensorId, pending] of this.pendingCommands.entries()) {
      if (Date.now() - pending.timestamp > this.commandTimeout) {
        this.pendingCommands.delete(sensorId);
      }
    }
  }
}

const recentChanges = new RecentChanges();

// Limpiar cada hora
setInterval(() => recentChanges.cleanup(), 60 * 60 * 1000);

module.exports = recentChanges;
