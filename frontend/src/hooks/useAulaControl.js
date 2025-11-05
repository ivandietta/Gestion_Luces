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
      
      // Determinar nuevo estado según la lógica especificada:
      // - Si TODAS las luces están OFF (0) → encender TODAS
      // - Si HAY 1 o más luces ON (1) → apagar SOLO las que están ON
      const todasApagadas = sensoresFiltrados.every(s => s.estado === 0);
      
      let sensoresAActualizar = [];
      
      if (todasApagadas) {
        // Caso 1: Todas las luces OFF → encender TODAS
        sensoresAActualizar = sensoresFiltrados.map(s => ({
          id: s.id,
          nuevoEstado: 1
        }));
      } else {
        // Caso 2: Hay 1 o más luces ON → apagar SOLO las que están ON
        sensoresAActualizar = sensoresFiltrados
          .filter(s => s.estado === 1) // Solo las que están encendidas
          .map(s => ({
            id: s.id,
            nuevoEstado: 0
          }));
      }
      
      // Actualizar solo los sensores necesarios
      await Promise.all(
        sensoresAActualizar.map(({ id, nuevoEstado }) => 
          sensorService.updateEstado(id, nuevoEstado)
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
