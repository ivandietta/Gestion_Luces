import { useCallback } from 'react';
import { sensorService } from '../services/api';
import { usePendingState } from './usePendingState';

/**
 * Hook para controlar sensores individuales con estado pendiente
 * 
 * @param {Function} onUpdate - Callback opcional cuando se actualiza un sensor
 * @returns {Object} - { toggleSensor, isPending, clearPending }
 */
export function useSensorControl(onUpdate) {
  const { setPending, clearPending, isPending } = usePendingState(20000); // 20 segundos de espera

  const toggleSensor = useCallback(async (sensorId, currentState, isOnline = true) => {
    // Si está offline o ya está pendiente, no hacer nada
    if (!isOnline || isPending(sensorId)) {
      return;
    }

    try {
      const newState = currentState === 1 ? 0 : 1;

      // Marcar como pendiente SIN cambiar el estado visual
      setPending(sensorId, {
        expectedState: newState,
        originalState: currentState
      });

      // Enviar al servidor
      await sensorService.updateEstado(sensorId, newState);

      // El WebSocket se encargará de actualizar cuando llegue confirmación
      
    } catch (err) {
      console.error('Error cambiando estado del sensor:', err);
      
      // Quitar de pendientes en caso de error
      clearPending(sensorId);
      
      throw err; // Re-lanzar para que el componente lo maneje
    }
  }, [setPending, clearPending, isPending]);

  return {
    toggleSensor,
    isPending,
    clearPending
  };
}
