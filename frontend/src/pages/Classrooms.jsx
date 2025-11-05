import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { aulaService, sensorService } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { useAulaControl } from '../hooks/useAulaControl';

const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const MagnifyingGlassIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const PencilIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// Iconos de sensores
const LightBulbIcon = ({ active }) => (
  <svg className={`h-6 w-6 ${active ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const WindowIcon = ({ active }) => (
  <svg className={`h-6 w-6 ${active ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
    <line x1="12" y1="3" x2="12" y2="21" strokeWidth={2} />
    <line x1="3" y1="12" x2="21" y2="12" strokeWidth={2} />
  </svg>
);

const PersonIcon = ({ active }) => (
  <svg className={`h-6 w-6 ${active ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const Classrooms = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();
  
  // Hook para control de aulas con estado pendiente
  const { toggleAulaSensors, isPending: isAulaPending, clearPending } = useAulaControl();
  
  const [aulas, setAulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAula, setEditingAula] = useState(null);

  const loadAulas = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const response = await aulaService.getAll();
      
      console.log('Response from API:', response); // Debug
      
      // Asegurarse de que siempre sea un array
      let aulasData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          aulasData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          aulasData = response.data.data;
        } else if (response.data.results && Array.isArray(response.data.results)) {
          aulasData = response.data.results;
        }
      }
      
      console.log('Aulas data:', aulasData); // Debug
      setAulas(aulasData);
    } catch (err) {
      console.error('Error cargando aulas:', err);
      setError('Error cargando aulas: ' + (err.response?.data?.message || err.message));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadAulas(true); // Primera carga con loading
    
    // Escuchar actualizaciones en tiempo real vía WebSocket
    if (socket) {
      socket.on('sensorUpdate', async (data) => {
        console.log('⚡ Cambio de sensor detectado en aula', data.id_aula, '- Tipo:', data.tipo, 'Estado:', data.estado);
        
        // Recargar todos los sensores del aula afectada para actualizar los iconos
        try {
          const response = await sensorService.getByAulaId(data.id_aula);
          const sensores = response.data?.data || response.data || [];
          
          // Calcular estados agregados de todos los sensores
          const luces_encendidas = sensores.some(s => s.tipo === 'Sensor de luz' && s.estado === 1) ? 1 : 0;
          const ventanas_abiertas = sensores.some(s => s.tipo === 'Sensor de ventana' && s.estado === 1) ? 1 : 0;
          const personas_detectadas = sensores.some(s => s.tipo === 'Sensor de movimiento' && s.estado === 1) ? 1 : 0;
          
          // Actualizar solo el aula afectada con los estados calculados
          setAulas(prevAulas => prevAulas.map(aula => {
            if (aula.id === data.id_aula) {
              return {
                ...aula,
                luces_encendidas,
                ventanas_abiertas,
                personas_detectadas
              };
            }
            return aula;
          }));
          
          // Quitar el estado pendiente del aula si existe
          clearPending(data.id_aula);
        } catch (err) {
          console.error('Error actualizando sensores del aula', data.id_aula, ':', err);
        }
      });
    }
    
    return () => {
      if (socket) {
        socket.off('sensorUpdate');
      }
    };
  }, [socket]);

  // Función para verificar si un aula está online (máximo 15 segundos sin señal)
  const isOnline = (aula) => {
    if (!aula || aula.isOffline !== undefined) {
      return !aula?.isOffline;
    }
    if (!aula.ultima_senal) return false;
    const now = new Date();
    const signalDate = new Date(aula.ultima_senal);
    const diffSeconds = (now - signalDate) / 1000;
    return diffSeconds < 15; // 15 segundos máximo
  };

  // Filtrar aulas en el cliente (como en Users.jsx)
  const filteredAulas = useMemo(() => {
    let filtered = [...aulas];

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(aula =>
        aula.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por estado
    if (statusFilter) {
      filtered = filtered.filter(aula => aula.estado_conexion === statusFilter);
    }

    // Ordenar alfabéticamente
    filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));

    return filtered;
  }, [aulas, searchTerm, statusFilter]);

  const handleCreateAula = () => {
    setEditingAula(null);
    setShowModal(true);
  };

  const handleEditAula = (aula) => {
    setEditingAula(aula);
    setShowModal(true);
  };

  const handleSaveAula = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const aulaData = {
      nombre: formData.get('nombre'),
      ip: formData.get('ip')
    };

    try {
      if (editingAula) {
        await aulaService.update(editingAula.id, aulaData);
      } else {
        await aulaService.create(aulaData);
      }
      setShowModal(false);
      setEditingAula(null);
      loadAulas();
    } catch (err) {
      console.error('Error guardando aula:', err);
      let errorMessage = 'Error guardando aula';
      
      if (err.response) {
        // El servidor respondió con un código de error
        if (err.response.status === 409) {
          errorMessage = err.response.data?.error || 'Ya existe un aula con ese nombre o IP';
        } else {
          errorMessage = err.response.data?.error || err.response.data?.message || errorMessage;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      alert(errorMessage);
    }
  };

  const handleToggleSensor = async (aulaId, sensorType) => {
    // Verificar si el aula está offline
    const aula = aulas.find(a => a.id === aulaId);
    if (!aula || !isOnline(aula)) {
      return; // No hacer nada si está offline (botón ya está deshabilitado)
    }

    try {
      await toggleAulaSensors(aulaId, sensorType, isOnline(aula));
      // El hook se encarga de todo: estado pendiente, timeout, y limpieza
      // El WebSocket actualizará el estado cuando llegue confirmación
    } catch (err) {
      if (!err.response?.data?.offline) {
        alert('Error actualizando sensor: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleDeleteAula = async (aulaId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta aula?')) {
      return;
    }

    try {
      await aulaService.delete(aulaId);
      loadAulas();
    } catch (err) {
      setError('Error eliminando aula: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isAdmin = user?.rol === 'administrador' || user?.rol === 'Admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Aulas</h1>
          <p className="text-gray-600">Administra las aulas</p>
        </div>
        {isAdmin && (
          <button onClick={handleCreateAula} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors flex-shrink-0">
            <PlusIcon />
            <span className="hidden md:inline">Nueva Aula</span>
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute left-3 top-3 text-gray-400"><MagnifyingGlassIcon /></div>
              <input type="text" placeholder="Buscar aulas por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">Todos</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
      </div>

      {error && (<div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-red-800">{error}</p></div>)}

      {filteredAulas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay aulas registradas</h3>
          <p className="text-gray-600 mb-4">{searchTerm || statusFilter ? 'No se encontraron aulas que coincidan con los filtros aplicados.' : 'Comienza creando tu primera aula.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {filteredAulas.map((aula) => (
              <li 
                key={aula.id} 
                onClick={() => navigate(`/aulas/${aula.id}`)}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="px-6 py-4">
                  {/* Layout responsive */}
                  <div className="flex flex-col gap-3">
                    {/* Fila superior: Nombre/IP + Botón e Iconos (desktop) */}
                    <div className="flex items-center justify-between">
                      {/* Nombre e IP */}
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${aula.estado_conexion === 'online' ? 'bg-green-500' : 'bg-red-500'}`} title={aula.estado_conexion === 'online' ? 'En línea' : 'Fuera de línea'}></div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{aula.nombre}</h3>
                          <p className="text-sm text-gray-500">IP: {aula.ip}</p>
                        </div>
                      </div>

                      {/* Derecha: Iconos + Botón (en desktop), solo iconos (en mobile) */}
                      <div className="flex items-center gap-4">
                        {/* Iconos de sensores (siempre visibles a la derecha) */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <LightBulbIcon active={aula.luces_encendidas} />
                          </div>
                          <div className="flex items-center gap-1">
                            <WindowIcon active={aula.ventanas_abiertas} />
                          </div>
                          <div className="flex items-center gap-1">
                            <PersonIcon active={aula.personas_detectadas} />
                          </div>
                        </div>

                        {/* Botón de control (solo visible en desktop, a la derecha de los iconos) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSensor(aula.id, 'luces');
                          }}
                          disabled={!isOnline(aula) || isAulaPending(aula.id)}
                          className={`hidden md:block p-2 rounded-lg border transition-colors ${
                            !isOnline(aula)
                              ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                              : isAulaPending(aula.id)
                              ? 'text-yellow-600 bg-yellow-50 border-yellow-300 cursor-wait animate-pulse'
                              : aula.luces_encendidas
                              ? 'text-green-600 bg-green-50 hover:text-green-900 hover:bg-green-100 border-green-200'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-300'
                          }`}
                          title={
                            !isOnline(aula)
                              ? 'Aula fuera de línea'
                              : isAulaPending(aula.id)
                              ? 'Esperando confirmación...'
                              : aula.luces_encendidas ? 'Apagar luces' : 'Prender luces'
                          }
                        >
                          {/* Icono clásico de power - más visible */}
                          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 2v6m-5.3-.8a8 8 0 1010.6 0" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Botón de control de luces (solo en mobile, full-width centrado debajo) */}
                    <div className="flex md:hidden justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSensor(aula.id, 'luces');
                        }}
                        disabled={!isOnline(aula) || isAulaPending(aula.id)}
                        className={`flex-1 p-2 rounded-lg border transition-colors ${
                          !isOnline(aula)
                            ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                            : isAulaPending(aula.id)
                            ? 'text-yellow-600 bg-yellow-50 border-yellow-300 cursor-wait animate-pulse'
                            : aula.luces_encendidas
                            ? 'text-green-600 bg-green-50 hover:text-green-900 hover:bg-green-100 border-green-200'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-gray-300'
                        }`}
                        title={
                          !isOnline(aula)
                            ? 'Aula fuera de línea'
                            : isAulaPending(aula.id)
                            ? 'Esperando confirmación...'
                            : aula.luces_encendidas ? 'Apagar luces' : 'Prender luces'
                        }
                      >
                        {/* Icono clásico de power - más visible en mobile */}
                        <svg className="h-5 w-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 2v6m-5.3-.8a8 8 0 1010.6 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{editingAula ? 'Editar Aula' : 'Nueva Aula'}</h2>
            </div>
            <form onSubmit={handleSaveAula}>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre del Aula <span className="text-red-500">*</span></label>
                  <input type="text" id="nombre" name="nombre" defaultValue={editingAula?.nombre || ''} maxLength={40} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ej: Aula 101" />
                  <p className="mt-1 text-xs text-gray-500">Máximo 40 caracteres</p>
                </div>
                <div>
                  <label htmlFor="ip" className="block text-sm font-medium text-gray-700 mb-1">Dirección IP <span className="text-red-500">*</span></label>
                  <input type="text" id="ip" name="ip" defaultValue={editingAula?.ip || ''} required pattern="^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ej: 192.168.1.100" />
                  <p className="mt-1 text-xs text-gray-500">Formato IPv4 (ej: 192.168.1.100)</p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button type="button" onClick={() => { setShowModal(false); setEditingAula(null); }} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">{editingAula ? 'Guardar Cambios' : 'Crear Aula'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classrooms;
