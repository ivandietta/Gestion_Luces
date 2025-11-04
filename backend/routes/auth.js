const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');

// POST /api/auth/register - Registrar nuevo usuario
router.post('/register', async (req, res) => {
  try {
    const { legajo, nombre, apellido, password, rol } = req.body;

    // Validaciones básicas
    if (!legajo || !nombre || !apellido || !password) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son requeridos: legajo, nombre, apellido, password'
      });
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Validar rol
    if (rol && !['administrador', 'operario'].includes(rol)) {
      return res.status(400).json({
        success: false,
        error: 'Rol debe ser administrador u operario'
      });
    }

    // Crear usuario
    const usuarioId = await Usuario.create({
      legajo: legajo.trim(),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      password,
      rol: rol || 'operario'
    });

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: { id: usuarioId }
    });
  } catch (error) {
    if (error.message.includes('ya está registrado')) {
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

// POST /api/auth/login - Iniciar sesión
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Intento de login recibido:', { legajo: req.body.legajo });
    
    const { legajo, password } = req.body;

    // Validaciones básicas
    if (!legajo || !password) {
      console.log('⚠️ Login fallido: Campos faltantes');
      return res.status(400).json({
        success: false,
        error: 'Legajo y contraseña son requeridos'
      });
    }

    // Autenticar usuario
    console.log('🔍 Buscando usuario con legajo:', legajo.trim());
    const { usuario, token } = await Usuario.authenticate(legajo.trim(), password);
    
    console.log('✅ Login exitoso para:', legajo.trim());

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        usuario,
        token
      }
    });
  } catch (error) {
    console.error('❌ Error en login:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.message.includes('Credenciales inválidas') ||
        error.message.includes('Usuario inactivo')) {
      res.status(401).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'production' ? undefined : error.stack
      });
    }
  }
});

// GET /api/auth/profile - Obtener perfil del usuario autenticado
router.get('/profile', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/auth/profile - Actualizar perfil del usuario autenticado
router.put('/profile', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { nombre, apellido, email } = req.body;

    // Validaciones básicas
    if (!nombre || !apellido || !email) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, apellido y email son requeridos'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de email inválido'
      });
    }

    await Usuario.update(req.user.id, {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.trim().toLowerCase()
    });

    // Obtener usuario actualizado
    const usuarioActualizado = await Usuario.findById(req.user.id);

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: usuarioActualizado
    });
  } catch (error) {
    if (error.message === 'Usuario no encontrado') {
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

// POST /api/auth/change-password - Cambiar contraseña
router.post('/change-password', require('../middleware/auth').authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validaciones básicas
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Contraseña actual y nueva contraseña son requeridas'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Verificar contraseña actual
    const usuario = await Usuario.findById(req.user.id);
    const isValidPassword = await Usuario.verifyPassword(currentPassword, usuario.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Contraseña actual incorrecta'
      });
    }

    // Cambiar contraseña
    await Usuario.changePassword(req.user.id, newPassword);

    res.json({
      success: true,
      message: 'Contraseña cambiada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
