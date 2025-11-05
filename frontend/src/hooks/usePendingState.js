import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook personalizado para manejar estados pendientes con timeout automático
 * 
 * @param {number} timeout - Tiempo en milisegundos antes de limpiar el estado pendiente (default: 20000)
 * @returns {Object} - { pendingItems, setPending, clearPending, isPending }
 */
export function usePendingState(timeout = 20000) {
  const [pendingItems, setPendingItems] = useState({});
  const timersRef = useRef({});

  const setPending = useCallback((id, data = {}) => {
    // Limpiar timer anterior si existe
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
    }

    // Marcar como pendiente
    setPendingItems(prev => ({
      ...prev,
      [id]: data
    }));

    // Configurar nuevo timer
    timersRef.current[id] = setTimeout(() => {
      setPendingItems(prev => {
        const newPending = { ...prev };
        delete newPending[id];
        return newPending;
      });
      delete timersRef.current[id];
    }, timeout);
  }, [timeout]);

  const clearPending = useCallback((id) => {
    // Limpiar timer si existe
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }

    // Quitar de pendientes
    setPendingItems(prev => {
      const newPending = { ...prev };
      delete newPending[id];
      return newPending;
    });
  }, []);

  const isPending = useCallback((id) => {
    return !!pendingItems[id];
  }, [pendingItems]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(timer => clearTimeout(timer));
      timersRef.current = {};
    };
  }, []);

  return {
    pendingItems,
    setPending,
    clearPending,
    isPending
  };
}
