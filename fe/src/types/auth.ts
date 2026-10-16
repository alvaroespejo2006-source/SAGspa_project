/**
 * Archivo: types/auth.ts
 * Descripción: Tipos TypeScript para todo el dominio de autenticación (RF-001 a RF-008).
 * ¿Para qué? Centralizar los tipos evita duplicación y garantiza consistencia
 *   entre la capa de API, el contexto y los componentes.
 * ¿Impacto? Si un tipo cambia aquí, TypeScript detecta inmediatamente
 *   todos los lugares que necesitan actualizarse.
 */

export type UserRole = 'client' | 'staff';

// ¿Qué? Datos del usuario autenticado (sin contraseña).
export interface User {
  id: string;
  documentId: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: string;
}

// ¿Qué? Tokens devueltos al hacer login o refresh.
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'bearer';
}

// ¿Qué? Respuesta del login (RF-002) — incluye un resumen del usuario con su rol.
export interface LoginResponse extends AuthTokens {
  user: {
    id: string;
    firstName: string;
    role: UserRole;
    isEmailVerified: boolean;
  };
}

// ¿Qué? Request body para el registro de un nuevo cliente (RF-001).
export interface RegisterRequest {
  documentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
}

// ¿Qué? Request body para el login.
export interface LoginRequest {
  email: string;
  password: string;
}

// ¿Qué? Request body para renovar el access token.
export interface RefreshTokenRequest {
  refreshToken: string;
}

// ¿Qué? Request body para cambiar la contraseña (usuario autenticado).
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ¿Qué? Request body para solicitar el email de recuperación.
export interface ForgotPasswordRequest {
  email: string;
}

// ¿Qué? Request body para restablecer la contraseña con el token del email.
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// ¿Qué? Request body para verificar el email con el token del enlace de activación.
export interface VerifyEmailRequest {
  token: string;
}

// ¿Qué? Request body para pedir un nuevo enlace de verificación (HU-003).
export interface ResendVerificationRequest {
  email: string;
}

// ¿Qué? Request body para que un staff cree a otro staff (RF-008).
export interface CreateStaffRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

// ¿Qué? Estructura genérica de respuesta exitosa de la API.
// ¿Para qué? El backend siempre envuelve los datos en { success: true, data: T };
//   este tipo garantiza que el frontend espere esa forma antes de usar los datos.
export interface ApiResponse<T> {
  success: true;
  data: T;
}

// ¿Qué? Estructura genérica de respuesta de error de la API.
export interface ApiErrorResponse {
  success: false;
  error: { code: string; message: string } | string;
}
