import { useState, useEffect, useRef, useCallback } from 'react';
import { aulaService, sensorService } from '../services/api';
import { useSocket } from '../contexts/SocketContext';

/**
 * Hook para manejar la vista de detalle de un aula con sensores
 * 
 * @param {string} aulaId - ID del aula
 * @param {Function} onSensorUpdate - Callback opcional cuando un sensor se actualiza (para limpiar pendientes)
 * @returns {Object} - Estado y funciones del aula y sensores
 */
export function useAulaSensors(aulaId, onSensorUpdate) {
  const socket = useSocket();
  
  // Estados del aula
  const [aula, setAula] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados de sensores
  const [sensores, setSensores] = useState([]);
  const [loadingSensores, setLoadingSensores] = useState(false);
  const sensoresInitialLoadedRef = useRef(false);

  // Verificar si el aula está online (máximo 15 segundos sin señal)
  const isOnline = useCallback((lastSignal) => {
    if (!lastSignal) return false;
    const now = new Date();
    const signalDate = new Date(lastSignal);
    const diffSeconds = (now - signalDate) / 1000;
    return diffSeconds < 15; // 15 segundos máximo
  }, []);

  // Cargar datos del aula
  const loadAulaData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const response = await aulaService.getById(aulaId);
      const aulaData = response.data?.data || response.data || response;
      setAula(aulaData);
    } catch (err) {
      console.error('Error cargando aula:', err);
      setError('No se pudo cargar la información del aula');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [aulaId]);

  // Cargar sensores
  const loadSensores = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoadingSensores(true);
      }
      const response = await sensorService.getByAulaId(aulaId);
      let sensoresData = response.data?.data || response.data || [];
      
      // Si el aula está offline, forzar todos los sensores a estado 0
      if (aula && !isOnline(aula.ultima_senal)) {
        sensoresData = sensoresData.map(sensor => ({
          ...sensor,
          estado: 0
        }));
      }
      
      setSensores(sensoresData);
    } catch (err) {
      console.error('Error cargando sensores:', err);
    } finally {
      if (showLoading) {
        setLoadingSensores(false);
      }
    }
  }, [aulaId, aula, isOnline]);

  // Actualizar un sensor específico
  const updateSensor = useCallback((sensorId, newState) => {
    setSensores(prev => prev.map(s => 
      s.id === sensorId ? { ...s, estado: newState } : s
    ));
  }, []);

  // Formatear última señal
  const formatLastSignal = useCallback((lastSignal) => {
    if (!lastSignal) return 'Nunca';
    
    const now = new Date();
    const signalDate = new Date(lastSignal);
    const diffMs = now - signalDate;
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) return 'Hace menos de un minuto';
    if (diffMinutes < 60) return `Hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
    
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
  }, []);

  // Cargar aula al montar
  useEffect(() => {
    loadAulaData(true);
    
    // Polling para actualizar estado del aula cada 5 segundos (más frecuente para detectar offline rápido)
    const aulaPollingInterval = setInterval(() => {
      loadAulaData(false);
    }, 5000);
    
    return () => clearInterval(aulaPollingInterval);
  }, [loadAulaData]);

  // Cargar sensores cuando el aula esté disponible
  useEffect(() => {
    if (aulaId && aula) {
      const showLoadingForThisLoad = !sensoresInitialLoadedRef.current;
      loadSensores(showLoadingForThisLoad);
      sensoresInitialLoadedRef.current = true;

      // Escuchar cambios de sensores vía WebSocket
      if (socket) {
        const handleSensorUpdate = (data) => {
          if (data.id_aula === parseInt(aulaId)) {
            console.log('⚡ Cambio de sensor detectado vía WebSocket:', data);
            updateSensor(data.id, data.estado);
            
            // Llamar callback si existe (para limpiar estado pendiente)
            if (onSensorUpdate) {
              onSensorUpdate(data.id);
            }
          }
        };

        socket.on('sensorUpdate', handleSensorUpdate);

        return () => {
          socket.off('sensorUpdate', handleSensorUpdate);
        };
      }
    }
  }, [aulaId, aula, socket, loadSensores, updateSensor, onSensorUpdate]);

  return {
    aula,
    loading,
    error,
    sensores,
    loadingSensores,
    isOnline: aula ? isOnline(aula.ultima_senal) : false,
    loadAulaData,
    loadSensores,
    updateSensor,
    formatLastSignal,
    setError
  };
}
