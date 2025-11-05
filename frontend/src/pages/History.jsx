import { useState, useEffect, useCallback } from 'react'
import { historyService, aulaService, userService } from '../services/api'

const History = () => {
  // Estados principales
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingExport, setLoadingExport] = useState(false)

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)

      // Construir parámetros para la API de registros
      const params = {
        limit: 10,
        offset: (currentPage - 1) * 10
      }

      const response = await historyService.getAll(params)

      // La API de registros devuelve { success, data, pagination }
      if (response.data.success && response.data.data) {
        setHistory(response.data.data || [])
        setTotalCount(response.data.pagination?.total || 0)
        setTotalPages(Math.ceil((response.data.pagination?.total || 0) / 10))
      } else {
        // Fallback por si la estructura es diferente
        const data = response.data.data || response.data || []
        setHistory(Array.isArray(data) ? data : [])
        setTotalPages(1)
        setTotalCount(Array.isArray(data) ? data.length : 0)
      }

      // Cargar estadísticas con los mismos filtros
      // loadEstadisticas()
    } catch (error) {
      console.error('Error loading history:', error)
      setHistory([])
      setTotalPages(1)
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [currentPage])

  // Recargar cuando cambie la página
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const exportToCSV = async () => {
    try {
      setLoadingExport(true)

      const response = await historyService.exportarCSV()

      // Crear blob y descargar
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `historial_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Error al exportar el archivo CSV')
    } finally {
      setLoadingExport(false)
    }
  }

  const getTipoIcon = (tipo) => {
    const icons = {
      'usuario': '👤',
      'inactividad': '⏰',
      'externo': '🔧',
      'estado': '🔄',
      'lectura': '📊',
      'accion': '⚡',
      'alarma': '🚨'
    }
    return icons[tipo] || '📋'
  }

  const getFuenteColor = (fuente) => {
    const colors = {
      'usuario': 'bg-green-100 text-green-800',
      'inactividad': 'bg-yellow-100 text-yellow-800',
      'externo': 'bg-blue-100 text-blue-800',
      'sensor': 'bg-blue-100 text-blue-800',
      'manual': 'bg-green-100 text-green-800',
      'automatico': 'bg-purple-100 text-purple-800'
    }
    return colors[fuente] || 'bg-gray-100 text-gray-800'
  }

  const getFuenteLabel = (tipo_actuador) => {
    const labels = {
      'usuario': 'Usuario',
      'inactividad': 'Sistema',
      'externo': 'Externo'
    }
    return labels[tipo_actuador] || 'Sistema'
  }

  const getEstadoLabel = (tipoSensor, estado) => {
    // Normalizar tipo de sensor a minúsculas
    const tipo = (tipoSensor || '').toLowerCase()
    
    if (tipo.includes('luz')) {
      return estado === 1 ? 'Prendido' : 'Apagado'
    } else if (tipo.includes('puerta') || tipo.includes('ventana')) {
      return estado === 1 ? 'Abierta' : 'Cerrada'
    } else if (tipo.includes('movimiento')) {
      return estado === 1 ? 'Ocupada' : 'Desocupada'
    }
    
    // Por defecto
    return estado === 1 ? 'Encendido' : 'Apagado'
  }

  // Función para formatear fecha/hora en zona horaria de Argentina
  const formatDateTimeArgentina = (fechaHora) => {
    // SQLite guarda en formato "YYYY-MM-DD HH:MM:SS" en UTC
    // Necesitamos agregar 'Z' para que JavaScript lo interprete como UTC
    let fechaUTC = fechaHora
    if (!fechaHora.endsWith('Z') && !fechaHora.includes('+')) {
      fechaUTC = fechaHora.replace(' ', 'T') + 'Z'
    }
    
    // Crear fecha desde el string ISO (que ahora sabemos que es UTC)
    const fecha = new Date(fechaUTC)
    
    // Restar 3 horas para convertir de UTC a Argentina (UTC-3)
    const fechaArgentina = new Date(fecha.getTime() - (3 * 60 * 60 * 1000))
    
    // Obtener componentes de la fecha Argentina
    const año = fechaArgentina.getUTCFullYear()
    const mes = String(fechaArgentina.getUTCMonth() + 1).padStart(2, '0')
    const dia = String(fechaArgentina.getUTCDate()).padStart(2, '0')
    const horas = String(fechaArgentina.getUTCHours()).padStart(2, '0')
    const minutos = String(fechaArgentina.getUTCMinutes()).padStart(2, '0')
    const segundos = String(fechaArgentina.getUTCSeconds()).padStart(2, '0')
    
    return {
      fecha: `${dia}/${mes}/${año}`,
      hora: `${horas}:${minutos}:${segundos}`
    }
  }

  if (loading && currentPage === 1) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Historial de Registros</h1>
          <p className="text-gray-600 mt-1">
            {totalCount} registros encontrados
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            disabled={loadingExport || history.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingExport ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      {/* Tabla de registros */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {history.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay registros</h3>
            <p className="mt-1 text-sm text-gray-500">No se encontraron registros en el historial.</p>
          </div>
        ) : (
          <>
            {/* Tabla para desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aula
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sensor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nuevo Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fuente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.map((record, index) => {
                    const { fecha, hora } = formatDateTimeArgentina(record.fecha_hora)
                    
                    return (
                    <tr key={record.id || index} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">{fecha}</div>
                        <div className="text-gray-500">{hora}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">{record.aula_nombre || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="text-gray-600">
                          {record.tipo_sensor || 'N/A'}
                        </div>
                        <div className="text-gray-500 text-xs">
                          Pin {record.pin}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${record.estado === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {getEstadoLabel(record.tipo_sensor, record.estado)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 text-sm rounded-full ${getFuenteColor(record.tipo_actuador)}`}>
                          {getFuenteLabel(record.tipo_actuador)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.usuario_legajo || '----'}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Vista móvil - Formato 3 columnas */}
            <div className="md:hidden space-y-3 p-4">
              {history.map((record, index) => {
                const { fecha, hora } = formatDateTimeArgentina(record.fecha_hora)
                
                return (
                <div key={record.id || index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                  {/* Primera fila: Aula / Sensor / Fecha y Hora */}
                  <div className="grid grid-cols-3 gap-2 pb-3 border-b border-gray-200">
                    <div className="text-left">
                      <div className="text-xs text-gray-500 mb-0.5">Aula</div>
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {record.aula_nombre || 'N/A'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-0.5">Sensor</div>
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {record.tipo_sensor || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-400">Pin {record.pin}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-0.5">Fecha y Hora</div>
                      <div className="text-sm font-medium text-gray-900">{fecha}</div>
                      <div className="text-xs text-gray-500">{hora}</div>
                    </div>
                  </div>

                  {/* Segunda fila: Fuente / Nuevo Estado / Usuario */}
                  <div className="grid grid-cols-3 gap-2 pt-3">
                    <div className="text-left">
                      <div className="text-xs text-gray-500 mb-1">Fuente</div>
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${getFuenteColor(record.tipo_actuador)}`}>
                        {getFuenteLabel(record.tipo_actuador)}
                      </span>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Nuevo Estado</div>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${record.estado === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {getEstadoLabel(record.tipo_sensor, record.estado)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">Usuario</div>
                      <div className="text-sm font-medium text-gray-900">
                        {record.usuario_legajo || '----'}
                      </div>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          {/* Botón Anterior - Responsive: texto en desktop, flecha en móvil */}
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <span className="hidden md:inline">Anterior</span>
            <span className="md:hidden">←</span>
          </button>

          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-2 border rounded ${
                    pageNum === currentPage
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <span className="hidden md:inline">Siguiente</span>
            <span className="md:hidden">→</span>
          </button>
          {/* Fin paginación responsive */}
        </div>
      )}
    </div>
  )
}

export default History
