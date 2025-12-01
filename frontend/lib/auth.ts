/**
 * Utilidades para manejo de autenticación
 * 
 * Funciones helper para trabajar con el token JWT
 * y el estado de autenticación del usuario.
 */

import { jwtDecode } from 'jwt-decode';

interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Valida que el token tenga el formato correcto de JWT (3 partes separadas por punto)
 */
const isValidTokenFormat = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
};

/**
 * Decodifica el token JWT y extrae el payload
 * Si el token es inválido, lo elimina automáticamente
 */
export const decodeToken = (token: string): JWTPayload | null => {
  if (!token || !isValidTokenFormat(token)) {
    // Si el token no tiene el formato correcto, eliminarlo
    if (typeof window !== "undefined") {
      removeToken();
    }
    return null;
  }

  try {
    return jwtDecode<JWTPayload>(token);
  } catch (error) {
    // Si hay error al decodificar, el token es inválido - eliminarlo
    if (typeof window !== "undefined") {
      removeToken();
    }
    // No loguear el error en consola para evitar ruido
    return null;
  }
};

/**
 * Extrae el rol del usuario del token JWT
 */
export const getUserRole = (): string | null => {
  if (typeof window === "undefined") return null;
  
  const token = getToken();
  if (!token) return null;

  const decoded = decodeToken(token);
  return decoded?.role || null;
};

/**
 * Guarda el token JWT y refresh token en localStorage y extrae el rol
 */
export const saveToken = (token: string, refreshToken?: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
  
  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
  }
  
  // Extraer y guardar el rol del token
  const decoded = decodeToken(token);
  if (decoded?.role) {
    localStorage.setItem("userRole", decoded.role);
  }
  
  // Guardar timestamp de última actividad
  localStorage.setItem("lastActivity", Date.now().toString());
};

/**
 * Obtiene el token JWT del localStorage
 */
export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

/**
 * Obtiene el refresh token del localStorage
 */
export const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
};

/**
 * Elimina el token JWT, refresh token y el rol del localStorage
 */
export const removeToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userRole");
  localStorage.removeItem("lastActivity");
};

/**
 * Verifica si el usuario está autenticado (tiene token válido)
 */
export const isAuthenticated = (): boolean => {
  const token = getToken();
  if (!token || token.trim() === "") return false;
  
  // Verificar que el token tenga formato válido
  if (!isValidTokenFormat(token)) {
    // Token inválido, eliminarlo
    removeToken();
    return false;
  }
  
  return true;
};

/**
 * Obtiene el rol del usuario desde localStorage o del token
 */
export const getStoredUserRole = (): string | null => {
  if (typeof window === "undefined") return null;
  
  // Primero intentar obtener del localStorage (más rápido)
  const storedRole = localStorage.getItem("userRole");
  if (storedRole) return storedRole;
  
  // Si no está en localStorage, extraer del token (solo si es válido)
  try {
    return getUserRole();
  } catch (error) {
    // Si hay error, el token es inválido - limpiar todo
    removeToken();
    return null;
  }
};

/**
 * Verifica si el usuario es administrador
 */
export const isAdmin = (): boolean => {
  const role = getStoredUserRole();
  return role === "admin";
};

/**
 * Verifica si el usuario es cliente
 */
export const isClient = (): boolean => {
  const role = getStoredUserRole();
  return role === "client";
};

/**
 * Verifica si el token está expirado o próximo a expirar
 */
export const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  // Considerar expirado si falta menos de 1 minuto
  const expirationTime = decoded.exp * 1000; // Convertir a milisegundos
  const now = Date.now();
  const buffer = 60 * 1000; // 1 minuto de buffer
  
  return expirationTime - now < buffer;
};

/**
 * Verifica si ha habido inactividad por más de 15 minutos
 */
export const isInactive = (): boolean => {
  if (typeof window === "undefined") return false;
  
  const lastActivity = localStorage.getItem("lastActivity");
  if (!lastActivity) return true;
  
  const lastActivityTime = parseInt(lastActivity, 10);
  const now = Date.now();
  const inactiveTime = now - lastActivityTime;
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 15 minutos en milisegundos
  
  return inactiveTime > INACTIVITY_TIMEOUT;
};

/**
 * Actualiza el timestamp de última actividad
 */
export const updateLastActivity = (): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("lastActivity", Date.now().toString());
};

/**
 * Cierra sesión: revoca el token en el servidor, elimina el token local y redirige al login
 */
export const logout = async (): Promise<void> => {
  // Importar dinámicamente para evitar dependencias circulares
  const { logoutUser } = await import('./api-requests');
  
  // Intentar revocar el token en el servidor
  try {
    await logoutUser();
  } catch (error) {
    // Si falla, continuar con el logout local
    console.error('Error al revocar token en servidor:', error);
  }
  
  // Eliminar token local
  removeToken();
  
  // Redirigir al login
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

