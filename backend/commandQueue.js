// Cola de comandos pendientes para ESP32
class CommandQueue {
  constructor() {
    this.queues = new Map(); // Map<ip, Array<comando>>
  }

  // Agregar comando a la cola de un ESP32
  add(ip, comando) {
    if (!this.queues.has(ip)) {
      this.queues.set(ip, []);
    }
    this.queues.get(ip).push(comando);
    console.log(`📥 Comando agregado a cola para ${ip}:`, comando);
  }

  // Obtener y limpiar comandos pendientes
  getAndClear(ip) {
    const comandos = this.queues.get(ip) || [];
    this.queues.set(ip, []);
    return comandos;
  }

  // Verificar si hay comandos pendientes
  hasPending(ip) {
    return this.queues.has(ip) && this.queues.get(ip).length > 0;
  }
}

module.exports = new CommandQueue();
