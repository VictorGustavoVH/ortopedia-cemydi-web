/**
 * Cliente axios configurado para el backend
 * 
 * Incluye interceptores para agregar automáticamente el token JWT
 * y manejo centralizado de errores.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_URL_FINAL } from "./api";
import { getToken, getRefreshToken, saveToken, isTokenExpired, removeToken, logout, updateLastActivity } from "./auth";
import { refreshToken } from "./api-requests";

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

// Variable para evitar múltiples refreshes simultáneos
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor para agregar el token en cada petición
apiClient.interceptors.request.use(
  async (config) => {

    // Verificar si el token está expirado o próximo a expirar
    const token = getToken();
    if (token && isTokenExpired(token)) {
      // Intentar refrescar el token
      const refreshTokenValue = getRefreshToken();
      if (refreshTokenValue) {
        if (isRefreshing) {
          // Si ya se está refrescando, esperar en la cola
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((newToken) => {
            if (newToken) {
              config.headers.Authorization = `Bearer ${newToken}`;
            }
            return config;
          }).catch((err) => {
            return Promise.reject(err);
          });
        }

        isRefreshing = true;
        try {
          const tokens = await refreshToken(refreshTokenValue);
          saveToken(tokens.access_token, tokens.refresh_token);
          processQueue(null, tokens.access_token);
          config.headers.Authorization = `Bearer ${tokens.access_token}`;
          isRefreshing = false;
          return config;
        } catch (error) {
          processQueue(error, null);
          isRefreshing = false;
          // Si falla el refresh, cerrar sesión
          await logout();
          return Promise.reject(error);
        }
      } else {
        // No hay refresh token, cerrar sesión
        await logout();
        return Promise.reject(new Error("No hay refresh token disponible"));
      }
    }

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
  (response) => {
    // Actualizar timestamp de última actividad en respuestas exitosas
    updateLastActivity();
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Si recibimos un 401 (no autorizado), intentar refrescar el token
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const isLoginEndpoint = originalRequest.url?.includes("/auth/login");
      const isRefreshEndpoint = originalRequest.url?.includes("/auth/refresh");

      // No intentar refresh en login o refresh endpoints
      if (!isLoginEndpoint && !isRefreshEndpoint) {
        originalRequest._retry = true;

        const refreshTokenValue = getRefreshToken();
        if (refreshTokenValue) {
          if (isRefreshing) {
            // Si ya se está refrescando, esperar en la cola
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            }).then((newToken) => {
              if (newToken && originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              return apiClient(originalRequest);
            }).catch((err) => {
              return Promise.reject(err);
            });
          }

          isRefreshing = true;
          try {
            const tokens = await refreshToken(refreshTokenValue);
            saveToken(tokens.access_token, tokens.refresh_token);
            processQueue(null, tokens.access_token);
            
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
            }
            
            isRefreshing = false;
            return apiClient(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError, null);
            isRefreshing = false;
            
            // Si falla el refresh, cerrar sesión
            if (typeof window !== "undefined") {
              const errorMessage = (error.response?.data as any)?.message;
              const isSessionInvalidated = errorMessage?.toLowerCase().includes("sesión invalidada") ||
                                         errorMessage?.toLowerCase().includes("cerró sesión en otro dispositivo");
              
              removeToken();
              
              if (isSessionInvalidated && errorMessage) {
                window.location.href = `/login?message=${encodeURIComponent(errorMessage)}`;
              } else {
                window.location.href = "/login";
              }
            }
            return Promise.reject(refreshError);
          }
        } else {
          // No hay refresh token, cerrar sesión
          if (typeof window !== "undefined") {
            removeToken();
            window.location.href = "/login";
          }
        }
      } else if (isLoginEndpoint) {
        // En login, no redirigir para permitir que el componente maneje el error
        // No hacer nada aquí
      } else {
        // En refresh endpoint, cerrar sesión si falla
        if (typeof window !== "undefined") {
          removeToken();
          window.location.href = "/login";
        }
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

