/**
 * Archivo: api/auth.ts
 * Descripción: Funciones para cada endpoint de autenticación de la API (RF-001 a RF-008).
 * ¿Para qué? Encapsular todas las llamadas HTTP de auth en un solo módulo —
 *   los componentes no saben nada de URLs, headers ni axios.
 */

import { apiClient } from './axios';
import type {
  ApiResponse,
  AuthTokens,
  ChangePasswordRequest,
  CreateStaffRequest,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RegisterRequest,
  ResetPasswordRequest,
  User,
  VerifyEmailRequest,
} from '@/types/auth';

export async function register(data: RegisterRequest): Promise<User> {
  const res = await apiClient.post<ApiResponse<User>>('/auth/register', data);
  return res.data.data;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data);
  return res.data.data;
}

export async function refreshToken(data: RefreshTokenRequest): Promise<LoginResponse> {
  const res = await apiClient.post<ApiResponse<LoginResponse>>('/auth/refresh', data);
  return res.data.data;
}

// ¿Qué? Cambia la contraseña y guarda los tokens nuevos que devuelve el backend (HU-004).
// ¿Para qué? Al cambiar la contraseña el backend invalida los refresh tokens anteriores;
//   sin guardar los nuevos, esta misma sesión se cerraría al expirar el access token.
export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  const res = await apiClient.post<ApiResponse<AuthTokens>>('/auth/change-password', data);
  localStorage.setItem('accessToken', res.data.data.accessToken);
  localStorage.setItem('refreshToken', res.data.data.refreshToken);
}

export async function forgotPassword(data: ForgotPasswordRequest): Promise<void> {
  await apiClient.post('/auth/forgot-password', data);
}

export async function resetPassword(data: ResetPasswordRequest): Promise<void> {
  await apiClient.post('/auth/reset-password', data);
}

// ¿Qué? Obtener el perfil del usuario actualmente autenticado.
// ¿Para qué? Restaurar la sesión al recargar la página.
export async function getMe(): Promise<User> {
  const res = await apiClient.get<ApiResponse<User>>('/users/me');
  return res.data.data;
}

export async function verifyEmail(data: VerifyEmailRequest): Promise<void> {
  await apiClient.post('/auth/verify-email', data);
}

// ¿Qué? Crea una nueva cuenta de staff (RF-008) — solo la puede llamar otro staff autenticado.
export async function createStaff(data: CreateStaffRequest): Promise<User> {
  const res = await apiClient.post<ApiResponse<User>>('/staff', data);
  return res.data.data;
}
