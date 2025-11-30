/**
 * Configuración de la API del backend
 * 
 * Este archivo centraliza la URL base del backend.
 * Para las peticiones HTTP, usa el cliente axios en lib/axios.ts
 */

// URL del backend API
// En producción, NEXT_PUBLIC_API_URL DEBE estar configurada durante el BUILD
// En desarrollo, usar localhost por defecto
// 
// IMPORTANTE: Las variables NEXT_PUBLIC_* se reemplazan en tiempo de BUILD
// Si no está configurada en Netlify durante el build, será undefined
const envUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const getApiUrl = () => {
  // Si hay variable de entorno configurada, usarla
  if (envUrl && envUrl.trim() !== "") {
    return envUrl.trim();
  }
  
  // Si no hay variable, determinar si estamos en desarrollo o producción
  // En tiempo de build, window no existe, así que verificamos NODE_ENV
  const isBuildTime = typeof window === "undefined";
  const isDevelopmentEnv = process.env.NODE_ENV === "development";
  
  // En tiempo de build o desarrollo, usar localhost
  if (isBuildTime || isDevelopmentEnv) {
    return "http://localhost:4000";
  }
  
  // En runtime en producción, verificar el hostname
  if (typeof window !== "undefined") {
    const isLocalhost = window.location.hostname === "localhost" || 
                       window.location.hostname === "127.0.0.1";
    
    if (isLocalhost) {
      return "http://localhost:4000";
    }
    
    // Estamos en producción sin variable configurada
    console.error("❌ ERROR: NEXT_PUBLIC_API_URL no está configurada en producción.");
    console.error("💡 Solución: Configura la variable de entorno NEXT_PUBLIC_API_URL en Netlify.");
    console.error("📝 Ve a: Site settings → Environment variables → Add variable");
    console.error("⚠️ IMPORTANTE: Después de agregar la variable, haz un REDEPLOY completo.");
    
    // Retornar una URL que falle claramente
    return "https://API_URL_NO_CONFIGURADA.verifica-tu-configuracion-en-netlify.com";
  }
  
  // Fallback (no debería llegar aquí)
  return "http://localhost:4000";
};

export const API_URL = getApiUrl();

// Validar que la URL no termine en /
export const cleanApiUrl = API_URL.replace(/\/$/, "");
export const API_URL_FINAL = cleanApiUrl;

// Log de la URL que se está usando (solo en desarrollo para evitar exponer detalles en producción)
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  console.log("🔗 API URL configurada:");
  if (API_URL_FINAL.includes("API_URL_NO_CONFIGURADA")) {
    console.error("❌ CRÍTICO: La variable NEXT_PUBLIC_API_URL no está configurada correctamente en Netlify.");
  }
}

