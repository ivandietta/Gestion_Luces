import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3003'

// Cache simple para reducir llamadas API repetidas
const cache = new Map()
const CACHE_DURATION = 30000 // 30 segundos

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Timeout de 10 segundos para evitar esperas largas
})

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    // Solo agregar token si estamos en el navegador (localStorage disponible)
    if (typeof window !== 'undefined' && localStorage) {
      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor para manejar respuestas y renovar token si es necesario
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido, limpiar datos y redirigir a login
      if (typeof window !== 'undefined' && localStorage) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authService = {
  login: async (credentials) => {
    console.log('🔐 Intentando login con:', credentials)
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials)
    return response
  },
  logout: () => {
    if (typeof window !== 'undefined' && localStorage) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
    }
    // Limpiar cache al hacer logout
    cache.clear()
  },
}

// Helper para usar cache
const withCache = async (key, fn, duration = CACHE_DURATION) => {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < duration) {
    return cached.data
  }
  
  const data = await fn()
  cache.set(key, { data, timestamp: Date.now() })
  return data
}

export const userService = {
  getAll: async (params = {}) => {
    try {
      // No cachear listado de usuarios (cambia frecuentemente)
      const response = await api.get('/usuarios', { params })
      return response
    } catch (error) {
      throw error
    }
  },
  getById: (id) => api.get(`/usuarios/${id}`),
  create: (userData) => {
    cache.clear() // Limpiar cache al crear
    return api.post('/usuarios', userData)
  },
  update: (id, userData) => {
    cache.clear() // Limpiar cache al actualizar
    return api.put(`/usuarios/${id}`, userData)
  },
  delete: (id) => api.delete(`/usuarios/${id}`),
}

// Servicios placeholder para mantener compatibilidad con las páginas existentes
// Estos servicios devolverán datos vacíos o errores apropiados hasta que se implementen funcionalidades específicas

export const aulaService = {
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/aulas', { params })
      return response
    } catch (error) {
      throw error
    }
  },
  getById: (id) => api.get(`/aulas/${id}`),
  create: (aulaData) => api.post('/aulas', aulaData),
  update: (id, aulaData) => api.put(`/aulas/${id}`, aulaData),
  delete: (id) => api.delete(`/aulas/${id}`),
  heartbeat: (id) => api.post(`/aulas/${id}/heartbeat`),
  updateSensores: (id, sensoresData) => api.put(`/aulas/${id}/sensores`, sensoresData),
}

export const classroomService = aulaService

export const sensorService = {
  getAll: () => api.get('/sensores'),
  getByAulaId: (id_aula) => api.get(`/sensores/aula/${id_aula}`),
  getById: (id) => api.get(`/sensores/${id}`),
  create: (sensorData) => api.post('/sensores', sensorData),
  update: (id, sensorData) => api.put(`/sensores/${id}`, sensorData),
  updateEstado: (id, estado) => api.patch(`/sensores/${id}/estado`, { estado }),
  delete: (id) => api.delete(`/sensores/${id}`),
}

export const registroService = {
  getAll: (params = {}) => api.get('/api/registros', { params }),
  getById: (id) => api.get(`/api/registros/${id}`),
  getBySensorId: (id_sensor, params = {}) => api.get(`/api/registros/sensor/${id_sensor}`, { params }),
  getByAulaId: (id_aula, params = {}) => api.get(`/api/registros/aula/${id_aula}`, { params }),
}

export const historyService = {
  getAll: (params) => registroService.getAll(params),
  getByClassroom: (classroomId, params) => registroService.getByAulaId(classroomId, params),
  getBySensor: (sensorId, params) => registroService.getBySensorId(sensorId, params),
  getEstadisticas: (params) => Promise.resolve({ data: {} }),
  exportarCSV: (params = {}) => api.get('/api/registros/export/csv', { 
    params,
    responseType: 'blob' // Importante para descargar archivos
  }),
}

export default api
