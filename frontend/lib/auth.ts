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
 * Decodifica el token JWT y extrae el payload
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwtDecode<JWTPayload>(token);
  } catch (error) {
    console.error('Error al decodificar token:', error);
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
 * Guarda el token JWT en localStorage y extrae el rol
 */
export const saveToken = (token: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
  
  // Extraer y guardar el rol del token
  const decoded = decodeToken(token);
  if (decoded?.role) {
    localStorage.setItem("userRole", decoded.role);
  }
};

/**
 * Obtiene el token JWT del localStorage
 */
export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

/**
 * Elimina el token JWT y el rol del localStorage
 */
export const removeToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("userRole");
};

/**
 * Verifica si el usuario está autenticado (tiene token)
 */
export const isAuthenticated = (): boolean => {
  const token = getToken();
  return token !== null && token.trim() !== "";
};

/**
 * Obtiene el rol del usuario desde localStorage o del token
 */
export const getStoredUserRole = (): string | null => {
  if (typeof window === "undefined") return null;
  
  // Primero intentar obtener del localStorage (más rápido)
  const storedRole = localStorage.getItem("userRole");
  if (storedRole) return storedRole;
  
  // Si no está en localStorage, extraer del token
  return getUserRole();
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
 * Cierra sesión: elimina el token y el rol, luego redirige al login
 */
export const logout = (): void => {
  removeToken();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

