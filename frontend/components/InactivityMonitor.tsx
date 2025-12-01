"use client";

import { useEffect, useRef } from "react";
import { isInactive, logout, updateLastActivity, isAuthenticated } from "@/lib/auth";

/**
 * Componente que monitorea la inactividad del usuario
 * y cierra sesión automáticamente después del tiempo configurado de inactividad
 * 
 * OPTIMIZADO: Usa throttling para evitar actualizar localStorage constantemente
 */
export default function InactivityMonitor() {
  const lastUpdateRef = useRef<number>(0);
  const throttleDelay = 10000; // Actualizar máximo cada 10 segundos

  useEffect(() => {
    // Función para actualizar la última actividad con throttling
    // Solo actualiza localStorage si han pasado al menos 10 segundos
    // Esto evita saturar el navegador con escrituras constantes
    const handleActivity = () => {
      // Solo actualizar si el usuario está autenticado
      if (!isAuthenticated()) {
        return;
      }

      const now = Date.now();
      
      // Throttling: solo actualizar localStorage si han pasado suficientes segundos
      if (now - lastUpdateRef.current > throttleDelay) {
        updateLastActivity();
        lastUpdateRef.current = now;
      }
    };

    // Eventos que indican actividad del usuario
    // IMPORTANTE: NO incluimos 'mousemove' porque se dispara miles de veces por segundo
    // Solo usamos eventos que realmente indican interacción intencional del usuario
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click', 'focus', 'keydown'];

    // Agregar listeners para eventos de actividad
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // También escuchar cuando el usuario vuelve a la pestaña
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated()) {
        // Si la pestaña vuelve a estar visible, verificar inactividad
        if (isInactive()) {
          logout();
        } else {
          // Actualizar actividad cuando vuelve a la pestaña
          updateLastActivity();
          lastUpdateRef.current = Date.now();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Verificar inactividad periódicamente (cada 30 segundos)
    // Esto es suficiente para detectar inactividad sin sobrecargar el sistema
    const interval = setInterval(() => {
      if (isAuthenticated() && isInactive()) {
        logout();
      }
    }, 30 * 1000); // Verificar cada 30 segundos

    // Inicializar la última actividad al montar
    updateLastActivity();
    lastUpdateRef.current = Date.now();

    // Limpiar listeners y intervalos al desmontar
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  // Este componente no renderiza nada
  return null;
}

