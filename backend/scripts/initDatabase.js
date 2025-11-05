const db = require('../database');
const bcrypt = require('bcryptjs');

async function initializeDatabase(closeConnection = true) {
  try {
    console.log('🔧 Inicializando base de datos...');

    // Conectar a la base de datos solo si se ejecuta standalone
    if (closeConnection) {
      await db.connect();
    }

    // Inicializar tablas solo si se ejecuta standalone
    if (closeConnection) {
      await db.initialize();
    }

    // Insertar datos de ejemplo si es necesario
    await insertSampleData();

    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando la base de datos:', error.message);
    if (closeConnection) {
      process.exit(1);
    } else {
      throw error;
    }
  } finally {
    // Cerrar conexión solo si se ejecuta standalone
    if (closeConnection) {
      await db.disconnect();
      process.exit(0);
    }
  }
}

async function insertSampleData() {
  try {
    // Verificar si ya existen usuarios
    const existingUsers = await db.get('SELECT COUNT(*) as count FROM usuarios');

    if (existingUsers.count > 0) {
      console.log('📋 Ya existen datos en la base de datos');
      return;
    }

    console.log('📝 Insertando datos iniciales...');

    // 1. Crear usuario administrador por defecto
    const saltRounds = 10;
    const adminPassword = await bcrypt.hash('admin123', saltRounds);

    await db.run(`
      INSERT INTO usuarios (legajo, nombre, apellido, password_hash, rol)
      VALUES (?, ?, ?, ?, ?)
    `, ['ADMIN001', 'Administrador', 'Sistema', adminPassword, 'administrador']);

    // 2. Crear usuario operario por defecto
    const operarioPassword = await bcrypt.hash('operario123', saltRounds);

    await db.run(`
      INSERT INTO usuarios (legajo, nombre, apellido, password_hash, rol)
      VALUES (?, ?, ?, ?, ?)
    `, ['OP001', 'Operario', 'Ejemplo', operarioPassword, 'operario']);

    console.log('👥 Usuarios creados:');
    console.log('   - Admin: ADMIN001 / admin123');
    console.log('   - Operario: OP001 / operario123');

    // 3. Crear aula de ejemplo
    const aulaResult = await db.run(`
      INSERT INTO aulas (nombre, ip, ultima_senal)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, ['Aula Real', '192.168.1.100']);

    const aulaId = aulaResult.lastID;
    console.log(`🏫 Aula creada: "Aula Real" (ID: ${aulaId})`);

    // 4. Crear sensores para el aula
    const sensores = [
      { tipo: 'Sensor de luz', descripcion: 'Luz 1', pin: 32, estado: 0 },
      { tipo: 'Sensor de luz', descripcion: 'Luz 2', pin: 33, estado: 0 },
      { tipo: 'Sensor de movimiento', descripcion: 'Sensor PIR', pin: 34, estado: 0 },
      { tipo: 'Sensor de ventana', descripcion: 'Ventana 1', pin: 22, estado: 0 },
      { tipo: 'Sensor de ventana', descripcion: 'Ventana 2', pin: 23, estado: 0 }
    ];

    for (const sensor of sensores) {
      await db.run(`
        INSERT INTO sensores (tipo, descripcion, pin, estado, id_aula)
        VALUES (?, ?, ?, ?, ?)
      `, [sensor.tipo, sensor.descripcion, sensor.pin, sensor.estado, aulaId]);
    }

    console.log('🔌 Sensores creados: 5 sensores (2 luces, 1 movimiento, 2 ventanas)');
    console.log('✅ Datos iniciales insertados correctamente');

  } catch (error) {
    console.error('❌ Error insertando datos iniciales:', error.message);
    throw error;
  }
}

// Ejecutar inicialización si se ejecuta directamente
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
