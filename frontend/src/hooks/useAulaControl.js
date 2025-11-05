import { useCallback } from 'react';
import { sensorService } from '../services/api';
import { usePendingState } from './usePendingState';

/**
 * Hook para controlar sensores de un aula completa
 * 
 * @returns {Object} - { toggleAulaSensors, isPending, clearPending }
 */
export function useAulaControl() {
  const { setPending, clearPending, isPending } = usePendingState(20000); // 20 segundos de espera

  const toggleAulaSensors = useCallback(async (aulaId, sensorType, isOnline = true) => {
    // Si está offline o ya está pendiente, no hacer nada
    if (!isOnline || isPending(aulaId)) {
      return;
    }

    try {
      // Marcar aula como pendiente
      setPending(aulaId, { tipo: sensorType });

      // Obtener todos los sensores del aula
      const response = await sensorService.getByAulaId(aulaId);
      const sensores = response.data?.data || response.data || [];
      
      // Filtrar sensores según el tipo
      let sensoresFiltrados = [];
      if (sensorType === 'luces') {
        sensoresFiltrados = sensores.filter(s => s.tipo === 'Sensor de luz');
      } else if (sensorType === 'ventanas') {
        sensoresFiltrados = sensores.filter(s => s.tipo === 'Sensor de ventana');
      } else if (sensorType === 'personas') {
        sensoresFiltrados = sensores.filter(s => s.tipo === 'Sensor de movimiento');
      }
      
      if (sensoresFiltrados.length === 0) {
        console.warn(`No hay sensores de tipo ${sensorType} en el aula ${aulaId}`);
        clearPending(aulaId);
        return;
      }
      
      // Determinar nuevo estado: si alguno está encendido, apagar todos; si todos están apagados, encender todos
      const algunoEncendido = sensoresFiltrados.some(s => s.estado === 1);
      const nuevoEstado = algunoEncendido ? 0 : 1;
      
      // Actualizar todos los sensores de ese tipo
      await Promise.all(
        sensoresFiltrados.map(sensor => 
          sensorService.updateEstado(sensor.id, nuevoEstado)
        )
      );
      
      // NO actualizar estado local - esperar confirmación del WebSocket
      
    } catch (err) {
      console.error('Error actualizando sensores del aula:', err);
      
      // Quitar de pendientes en caso de error
      clearPending(aulaId);
      
      throw err; // Re-lanzar para que el componente lo maneje
    }
  }, [setPending, clearPending, isPending]);

  return {
    toggleAulaSensors,
    isPending,
    clearPending
  };
}
