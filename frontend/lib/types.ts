/**
 * Tipos TypeScript para las respuestas de la API
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  email: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

export interface ApiError {
  message: string | string[];
  statusCode?: number;
  error?: string;
}

export interface RequestPasswordResetRequest {
  email: string;
}

export interface RequestPasswordResetResponse {
  message: string;
}

export interface VerifyResetTokenResponse {
  valid: boolean;
  message: string;
  email?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ResendVerificationResponse {
  message: string;
}

export interface LoginResponse {
  access_token?: string;
  refresh_token?: string;
  user?: User;
  requiresMfa?: boolean;
  mfaToken?: string;
  message?: string;
}

export interface GenerateMfaSecretResponse {
  secret: string;
  qrCodeUrl: string;
  message: string;
}

export interface EnableMfaRequest {
  secret: string;
  totpCode: string;
}

export interface EnableMfaResponse {
  message: string;
}

export interface DisableMfaResponse {
  message: string;
}

export interface MfaStatusResponse {
  mfaEnabled: boolean;
}

export interface VerifyMfaRequest {
  mfaToken: string;
  totpCode: string;
}

export interface VerifyMfaResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

