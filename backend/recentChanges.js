// Almacén temporal de cambios recientes para actualización rápida del frontend
class RecentChanges {
  constructor() {
    this.changes = new Map(); // Map<aulaId, Array<cambios>>
    this.maxChangesPerAula = 50; // Mantener últimos 50 cambios por aula
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

  // Obtener cambios recientes de un aula
  get(aulaId, limit = 10) {
    const cambios = this.changes.get(aulaId) || [];
    return cambios.slice(0, limit);
  }

  // Limpiar cambios antiguos (más de 1 hora)
  cleanup() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [aulaId, cambios] of this.changes.entries()) {
      const filtered = cambios.filter(c => c.timestamp.getTime() > oneHourAgo);
      this.changes.set(aulaId, filtered);
    }
  }
}

const recentChanges = new RecentChanges();

// Limpiar cada hora
setInterval(() => recentChanges.cleanup(), 60 * 60 * 1000);

module.exports = recentChanges;
