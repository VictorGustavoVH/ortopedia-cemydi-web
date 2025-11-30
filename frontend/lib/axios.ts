/**
 * Cliente axios configurado para el backend
 * 
 * Incluye interceptores para agregar automáticamente el token JWT
 * y manejo centralizado de errores.
 */

import axios from "axios";
import { API_URL_FINAL } from "./api";
import { getToken } from "./auth";

// Crear instancia de axios con configuración base
const apiClient = axios.create({
  baseURL: API_URL_FINAL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 segundos
});

// Log de la URL configurada (solo en desarrollo para debugging)
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  console.log("🔗 API URL configurada correctamente");
  if (API_URL_FINAL.includes("localhost") && window.location.hostname !== "localhost") {
    console.error("❌ PROBLEMA DETECTADO: Estás usando localhost:4000 en producción!");
    console.error("💡 Solución: Configura NEXT_PUBLIC_API_URL en Netlify Environment Variables");
  }
}

// Interceptor para agregar el token en cada petición
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si recibimos un 401 (no autorizado), limpiar el token y redirigir
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    
    // Log detallado de errores solo en desarrollo (para evitar exponer detalles en producción)
    if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
      if (error.code === "ERR_BLOCKED_BY_CLIENT" || error.message?.includes("blocked")) {
        console.error("⚠️ Error: Petición bloqueada. Puede ser por una extensión del navegador (bloqueador de anuncios).");
        console.error("💡 Solución: Desactiva temporalmente las extensiones del navegador.");
      }
      if (!error.response && error.request) {
        console.error("⚠️ Error de conexión:", error.message);
        console.error("🔗 URL intentada:", error.config?.url);
        console.error("🌐 Base URL configurada:", API_URL_FINAL);
        console.error("🌍 Hostname actual:", window.location.hostname);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;

