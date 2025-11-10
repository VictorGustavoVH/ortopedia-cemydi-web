/**
 * Funciones para realizar peticiones a la API del backend
 * 
 * Cada función encapsula una llamada específica al backend,
 * manejando errores y retornando datos tipados.
 */

import apiClient from "./axios";
import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  User,
  ApiError,
  RequestPasswordResetRequest,
  RequestPasswordResetResponse,
  VerifyResetCodeRequest,
  VerifyResetCodeResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from "./types";

/**
 * Registra un nuevo usuario
 */
export const registerUser = async (
  data: RegisterRequest
): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Inicia sesión y obtiene el token JWT
 */
export const loginUser = async (data: LoginRequest): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post<AuthResponse>("/auth/login", data);
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Obtiene la lista de usuarios (requiere autenticación)
 */
export const getUsers = async (): Promise<User[]> => {
  try {
    const response = await apiClient.get<User[]>("/users");
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Obtiene un usuario por ID (requiere autenticación admin)
 */
export const getUserById = async (id: string): Promise<User> => {
  try {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Actualiza los datos de un usuario (requiere autenticación admin)
 */
export const updateUser = async (
  id: string,
  data: { name?: string; email?: string; password?: string }
): Promise<{ message: string; user: User }> => {
  try {
    const response = await apiClient.patch<{ message: string; user: User }>(
      `/users/${id}`,
      data
    );
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Cambia el rol de un usuario (requiere autenticación admin)
 */
export const updateUserRole = async (
  id: string,
  role: 'admin' | 'client'
): Promise<{ message: string; user: User }> => {
  try {
    const response = await apiClient.patch<{ message: string; user: User }>(
      `/users/${id}/role`,
      { role }
    );
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Elimina un usuario (requiere autenticación admin)
 */
export const deleteUser = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/users/${id}`);
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Actualiza el perfil del usuario autenticado (requiere autenticación)
 */
export const updateProfile = async (
  data: { name?: string; email?: string; password?: string }
): Promise<{ message: string; user: User }> => {
  try {
    const response = await apiClient.put<{ message: string; user: User }>(
      "/users/profile",
      data
    );
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Solicita un código de recuperación de contraseña
 */
export const requestPasswordReset = async (
  data: RequestPasswordResetRequest
): Promise<RequestPasswordResetResponse> => {
  try {
    const response = await apiClient.post<RequestPasswordResetResponse>(
      "/auth/request-password-reset",
      data
    );
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Verifica si un código de recuperación es válido
 */
export const verifyResetCode = async (
  data: VerifyResetCodeRequest
): Promise<VerifyResetCodeResponse> => {
  try {
    const response = await apiClient.post<VerifyResetCodeResponse>(
      "/auth/verify-reset-code",
      data
    );
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Restablece la contraseña usando el código de verificación
 */
export const resetPassword = async (
  data: ResetPasswordRequest
): Promise<ResetPasswordResponse> => {
  try {
    const response = await apiClient.post<ResetPasswordResponse>(
      "/auth/reset-password",
      data
    );
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Formatea los errores de la API para mostrar mensajes amigables
 */
function formatApiError(error: any): ApiError {
  if (error.response) {
    // El servidor respondió con un código de error
    const data = error.response.data;
    return {
      message: data.message || "Error en la petición",
      statusCode: error.response.status,
      error: data.error || "Error",
    };
  } else if (error.request) {
    // La petición se hizo pero no se recibió respuesta
    const isBlocked = error.code === "ERR_BLOCKED_BY_CLIENT" || 
                      error.message?.includes("blocked") ||
                      error.message?.includes("ERR_BLOCKED");
    
    if (isBlocked) {
      return {
        message: "La petición fue bloqueada. Por favor, desactiva las extensiones del navegador (bloqueadores de anuncios) y vuelve a intentar.",
        statusCode: 0,
      };
    }
    
    return {
      message: "No se pudo conectar con el servidor. Verifica que el backend esté corriendo y que la variable NEXT_PUBLIC_API_URL esté configurada correctamente.",
      statusCode: 0,
    };
  } else {
    // Algo pasó al configurar la petición
    return {
      message: error.message || "Error desconocido",
    };
  }
}

