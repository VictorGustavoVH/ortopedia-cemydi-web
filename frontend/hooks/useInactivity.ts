"use client";

import { useEffect } from "react";
import { isInactive, logout } from "@/lib/auth";

/**
 * Hook para detectar inactividad del usuario y cerrar sesión automáticamente
 * después de 15 minutos de inactividad
 */
export const useInactivity = () => {
  useEffect(() => {
    // Verificar inactividad cada minuto
    const interval = setInterval(() => {
      if (isInactive()) {
        // Si hay inactividad, cerrar sesión automáticamente
        logout();
      }
    }, 60 * 1000); // Verificar cada minuto

    // Limpiar intervalo al desmontar
    return () => {
      clearInterval(interval);
    };
  }, []);
};

