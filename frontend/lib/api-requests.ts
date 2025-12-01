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
  RegisterResponse,
  User,
  ApiError,
  RequestPasswordResetRequest,
  RequestPasswordResetResponse,
  VerifyResetTokenResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  LoginResponse,
  GenerateMfaSecretResponse,
  EnableMfaRequest,
  EnableMfaResponse,
  DisableMfaResponse,
  MfaStatusResponse,
  VerifyMfaRequest,
  VerifyMfaResponse,
} from "./types";

/**
 * Registra un nuevo usuario
 * Retorna un mensaje indicando que se debe verificar el email
 */
export const registerUser = async (
  data: RegisterRequest
): Promise<RegisterResponse> => {
  try {
    const response = await apiClient.post<RegisterResponse>("/auth/register", data);
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Inicia sesión y obtiene el token JWT
 * Puede retornar requiresMfa si el usuario tiene MFA activado
 */
export const loginUser = async (data: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<LoginResponse>("/auth/login", data);
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
 * Verifica si un token de recuperación es válido
 */
export const verifyResetToken = async (
  token: string
): Promise<VerifyResetTokenResponse> => {
  try {
    const response = await apiClient.get<VerifyResetTokenResponse>(
      `/auth/verify-reset-token?token=${encodeURIComponent(token)}`
    );
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Restablece la contraseña usando el token de recuperación
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
 * Refresca el access token usando un refresh token
 */
export const refreshToken = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  try {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Cierra sesión y revoca el token en el servidor
 */
export const logoutUser = async (): Promise<void> => {
  try {
    await apiClient.post('/auth/logout');
  } catch (error: any) {
    // Incluso si falla, continuar con el logout local
    console.error('Error al cerrar sesión en el servidor:', error);
  }
};

/**
 * Verifica el correo electrónico usando el token de verificación
 */
export const verifyEmail = async (
  data: VerifyEmailRequest
): Promise<VerifyEmailResponse> => {
  try {
    const response = await apiClient.post<VerifyEmailResponse>(
      "/auth/verify-email",
      data
    );
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Reenvía el correo de verificación
 */
export const resendVerificationEmail = async (
  data: ResendVerificationRequest
): Promise<ResendVerificationResponse> => {
  try {
    const response = await apiClient.post<ResendVerificationResponse>(
      "/auth/resend-verification",
      data
    );
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Obtiene el estado de MFA del usuario autenticado
 */
export const getMfaStatus = async (): Promise<MfaStatusResponse> => {
  try {
    const response = await apiClient.get<MfaStatusResponse>("/auth/mfa/status");
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Genera un secret TOTP y QR code para configurar MFA
 */
export const generateMfaSecret = async (): Promise<GenerateMfaSecretResponse> => {
  try {
    const response = await apiClient.get<GenerateMfaSecretResponse>("/auth/mfa/generate-secret");
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Activa MFA para un usuario después de verificar el código TOTP
 */
export const enableMfa = async (
  data: EnableMfaRequest
): Promise<EnableMfaResponse> => {
  try {
    const response = await apiClient.post<EnableMfaResponse>("/auth/mfa/enable", data);
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Desactiva MFA para un usuario
 */
export const disableMfa = async (): Promise<DisableMfaResponse> => {
  try {
    const response = await apiClient.post<DisableMfaResponse>("/auth/mfa/disable");
    return response.data;
  } catch (error: any) {
    throw formatApiError(error);
  }
};

/**
 * Verifica el código TOTP durante el login
 */
export const verifyMfa = async (
  data: VerifyMfaRequest
): Promise<VerifyMfaResponse> => {
  try {
    const response = await apiClient.post<VerifyMfaResponse>("/auth/mfa/verify", data);
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

