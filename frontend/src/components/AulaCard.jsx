import React, { useState, useEffect, useCallback } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import ConnectionStatus from './ConnectionStatus';
import CountdownTimer from './CountdownTimer';
import ConfiguracionApagadoModal from './ConfiguracionApagadoModal';

// Íconos SVG básicos como alternativa a Heroicons
const WifiIconSolid = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

const WifiOffIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

const DevicePhoneMobileIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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

const CogIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AulaCard = ({
  aula,
  viewMode,
  onEdit,
  onDelete,
  onCheckConnectivity,
  onToggleLights,
  isAdmin,
  showConnectionStatus = false,
  onConfigureAutoShutdown
}) => {
  // Estado local para actualizaciones en tiempo real
  const [realTimeAula, setRealTimeAula] = useState(aula);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownTime, setCountdownTime] = useState(0);
  // Estado para trackear si hay una operación pendiente
  const [isPending, setIsPending] = useState(false);

  // Hook WebSocket para esta aula específica
  const {
    isConnected,
    connectionError,
    sensorUpdates,
    sendCommand,
    reconnect
  } = useWebSocket(aula.id, isRealTimeEnabled);

  // Actualizar estado local cuando cambian las props del aula
  useEffect(() => {
    setRealTimeAula(aula);
  }, [aula]);

  // Escuchar actualizaciones de sensores para quitar estado pendiente
  useEffect(() => {
    if (sensorUpdates && sensorUpdates.length > 0) {
      // Si hay actualizaciones de sensores, quitar el estado pendiente
      setIsPending(false);
    }
  }, [sensorUpdates]);

  // Función para manejar actualizaciones optimistas del estado del aula
  const handleOptimisticUpdate = useCallback((data) => {
    if (data.sensor_id) {
      // Actualización de sensor específico
      setRealTimeAula(prev => ({
        ...prev,
        sensores_por_tipo: prev.sensores_por_tipo ? {
          ...prev.sensores_por_tipo,
          // Aquí podrías actualizar el conteo de sensores activos
        } : prev.sensores_por_tipo
      }));
    }
  }, []);

  // Función para abrir modal de configuración
  const handleConfigureAutoShutdown = useCallback(() => {
    setShowConfigModal(true);
  }, []);

  // Función para cerrar modal de configuración
  const handleCloseConfigModal = useCallback(() => {
    setShowConfigModal(false);
  }, []);

  // Función para guardar configuración
  const handleSaveConfig = useCallback(async (configData) => {
    try {
      if (onConfigureAutoShutdown) {
        await onConfigureAutoShutdown(aula.id, configData);
      }
      setShowConfigModal(false);
    } catch (error) {
      console.error('Error guardando configuración:', error);
      throw error;
    }
  }, [aula.id, onConfigureAutoShutdown]);

  // Función para manejar cuenta regresiva
  const handleCountdownComplete = useCallback(() => {
    setCountdownActive(false);
    setCountdownTime(0);
    // Aquí podrías mostrar una notificación de que las luces se apagaron
  }, []);

  const handleCancelCountdown = useCallback(() => {
    setCountdownActive(false);
    setCountdownTime(0);
  }, []);

  // Función para manejar el toggle de luces con actualización optimista
  const handleToggleLightsOptimistic = useCallback(async () => {
    if (!isAdmin || !isConnected || isPending) {
      if (!isPending) {
        onToggleLights();
      }
      return;
    }

    // Marcar como pendiente (SIN cambiar el estado visual aún)
    setIsPending(true);
    
    // Configurar timeout de 20 segundos
    const timeoutId = setTimeout(() => {
      // Si después de 20 segundos sigue pendiente, quitar estado pendiente
      setIsPending(false);
    }, 20000);

    try {
      // Enviar comando a través de WebSocket
      // Buscar el sensor de luces (tipo 'luz' o 'rele')
      const luzSensors = realTimeAula.sensores_por_tipo?.luz?.sensores || [];
      if (luzSensors.length > 0) {
        await sendCommand(luzSensors[0].id, 'toggle');
        
        // NO actualizar estado localmente - esperar confirmación del WebSocket
        // El estado pendiente se quitará cuando llegue la actualización del sensor
      } else {
        // Fallback a la función original
        await onToggleLights();
        clearTimeout(timeoutId);
        setIsPending(false);
      }
    } catch (error) {
      // Limpiar timeout y quitar estado pendiente en caso de error
      clearTimeout(timeoutId);
      setIsPending(false);
      console.error('Error en toggle de luces:', error);
      // Fallback a la función original
      onToggleLights();
    }
  }, [isAdmin, isConnected, realTimeAula, sendCommand, onToggleLights, isPending]);

  // Usar el aula con actualizaciones en tiempo real
  const displayAula = realTimeAula;
  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <WifiIconSolid className="h-4 w-4" />;
      case 'offline':
        return <WifiOffIcon className="h-4 w-4" />;
      default:
        return <DevicePhoneMobileIcon className="h-4 w-4" />;
    }
  };

  const formatTime = (tiempo) => {
    if (!tiempo) return 'Nunca';

    const minutos = tiempo.minutos || 0;
    const segundos = tiempo.segundos || 0;

    if (minutos === 0) {
      return `${segundos}s`;
    }
    return `${minutos}m ${segundos}s`;
  };

  const getSensorSummary = (sensoresPorTipo) => {
    if (!sensoresPorTipo) return [];

    return Object.entries(sensoresPorTipo).map(([tipo, datos]) => {
      const icon = tipo === 'luz' ? '💡' :
                  tipo === 'movimiento' ? '🚶' :
                  tipo === 'ventana' ? '🪟' : '📡';

      return {
        tipo,
        icon,
        total: datos.total,
        activos: datos.activos
      };
    });
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Estado de conexión */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(displayAula.estado_conexion)}`}>
              {getStatusIcon(displayAula.estado_conexion)}
              <span className="text-sm font-medium capitalize">
                {displayAula.estado_conexion === 'online' ? 'En línea' :
                 displayAula.estado_conexion === 'offline' ? 'Fuera de línea' : 'Desconocido'}
              </span>
            </div>

            {/* Información del aula */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{displayAula.nombre}</h3>
              <p className="text-sm text-gray-600">{displayAula.ip_esp32}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Información adicional */}
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <ClockIcon className="h-4 w-4" />
                {formatTime(displayAula.tiempo_desde_ultima_senal)}
              </div>
              <p className="text-sm text-gray-600">{displayAula.sensores_count} sensores</p>
            </div>

            {/* Acciones */}
            <div className="flex gap-2">
              <button
                onClick={onCheckConnectivity}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Verificar conectividad"
              >
                <EyeIcon className="h-4 w-4" />
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={handleConfigureAutoShutdown}
                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Configurar apagado automático"
                  >
                    <CogIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={onEdit}
                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Editar aula"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={onDelete}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar aula"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sensores en vista lista */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">Sensores:</span>
            <div className="flex gap-2">
              {getSensorSummary(displayAula.sensores_por_tipo).map((sensor) => (
                <span key={sensor.tipo} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-gray-700">
                  <span>{sensor.icon}</span>
                  <span>{sensor.total}</span>
                  {sensor.activos > 0 && (
                    <span className="text-green-600">({sensor.activos} activo{sensor.activos !== 1 ? 's' : ''})</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Vista Grid (Card)
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      {/* Header de la card */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Estado de conexión */}
          <div className={`flex items-center gap-2 px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(displayAula.estado_conexion)}`}>
            {getStatusIcon(displayAula.estado_conexion)}
            <span className="capitalize">
              {displayAula.estado_conexion === 'online' ? 'Online' :
               displayAula.estado_conexion === 'offline' ? 'Offline' : 'N/A'}
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-1">
          <button
            onClick={onCheckConnectivity}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Verificar conectividad"
          >
            <EyeIcon className="h-4 w-4" />
          </button>

          {isAdmin && (
            <>
              <button
                onClick={handleConfigureAutoShutdown}
                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                title="Configurar apagado automático"
              >
                <CogIcon className="h-4 w-4" />
              </button>

              <button
                onClick={onEdit}
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                title="Editar aula"
              >
                <PencilIcon className="h-4 w-4" />
              </button>

              <button
                onClick={onDelete}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Eliminar aula"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Información principal */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{displayAula.nombre}</h3>
        <p className="text-sm text-gray-600 font-mono">{displayAula.ip_esp32}</p>
      </div>

      {/* Estadísticas rápidas */}
      <div className="space-y-3 mb-4">
        {/* Tiempo desde última señal */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <ClockIcon className="h-4 w-4" />
          <span>
            Última señal: {formatTime(displayAula.tiempo_desde_ultima_senal)}
          </span>
        </div>

        {/* Sensores */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <DevicePhoneMobileIcon className="h-4 w-4" />
          <span>{displayAula.sensores_count} sensores</span>
        </div>
      </div>

      {/* Sensores por tipo */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1">
          {getSensorSummary(displayAula.sensores_por_tipo).map((sensor) => (
            <span
              key={sensor.tipo}
              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
            >
              <span>{sensor.icon}</span>
              <span>{sensor.total}</span>
              {sensor.activos > 0 && (
                <span className="text-green-600 font-medium">({sensor.activos})</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Luces prendidas */}
      {displayAula.luces_prendidas > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <LightBulbIcon className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              {displayAula.luces_prendidas} luz{displayAula.luces_prendidas !== 1 ? 'es' : ''} encendida{displayAula.luces_prendidas !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Botón de control de luces (solo admin) */}
      {isAdmin && (
        <button
          onClick={handleToggleLightsOptimistic}
          className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            isPending
              ? 'bg-yellow-500 text-white cursor-wait animate-pulse'
              : isConnected
              ? 'bg-gray-900 hover:bg-gray-800 text-white'
              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
          }`}
          disabled={!isConnected || isPending}
        >
          {isPending 
            ? 'Esperando confirmación...' 
            : isConnected 
            ? 'Apagar Luces' 
            : 'Sin conexión'}
        </button>
      )}

      {/* Indicador de conexión (opcional) */}
      {showConnectionStatus && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <ConnectionStatus
            isConnected={isConnected}
            connectionError={connectionError}
            lastHeartbeat={null}
            onReconnect={reconnect}
          />
        </div>
      )}

      {/* Modal de configuración de apagado automático */}
      {showConfigModal && (
        <ConfiguracionApagadoModal
          aula={aula}
          configuracion={aula.configuracion}
          onClose={handleCloseConfigModal}
          onSave={handleSaveConfig}
        />
      )}

      {/* Cuenta regresiva de apagado automático */}
      {countdownActive && (
        <div className="mt-4">
          <CountdownTimer
            initialTime={countdownTime}
            isActive={countdownActive}
            onComplete={handleCountdownComplete}
            onCancel={handleCancelCountdown}
            aulaNombre={aula.nombre}
          />
        </div>
      )}
    </div>
  );
};

export default AulaCard;
