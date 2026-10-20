/**
 * Archivo: api/axios.ts
 * Descripción: Instancia de Axios configurada para la API del backend.
 * ¿Para qué? Centralizar la configuración HTTP: baseURL, headers, inyección del JWT
 *   y la renovación automática y transparente de la sesión (HU-006).
 * ¿Impacto? Si se usa axios directamente en los componentes, cada uno tendría
 *   que gestionar el token manualmente — este módulo lo hace una sola vez.
 */

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorResponse, ApiResponse, AuthTokens } from '@/types/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

// ¿Qué? Error de la API con el `code` interno del backend además del mensaje.
// ¿Para qué? Algunos flujos necesitan reaccionar a un código concreto —
//   p. ej. PET_CONDITION_BLOCKS_BOOKING deriva al reporte de síntoma (RF-009/RF-010).
// ¿Impacto? Sigue siendo un Error normal, así que `err.message` funciona igual que antes.
export class ApiError extends Error {
  readonly code: string | null;
  readonly status: number | null;

  constructor(message: string, code: string | null, status: number | null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ¿Qué? Interceptor de request que inyecta el Bearer token en cada llamada.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ¿Qué? El middleware `validate` del backend (422) manda en `message` un JSON en texto:
//   '[{"field":"date","message":"..."}]'. Esto lo convierte en las frases legibles.
// ¿Para qué? Antes la pantalla mostraba ese JSON tal cual al usuario (HU-009).
// ¿Impacto? Si el texto no es ese JSON (cualquier otro error), se devuelve sin cambios.
function readableMessage(message: string): string {
  if (!message.startsWith('[')) return message;
  try {
    const details = JSON.parse(message) as { message?: unknown }[];
    const messages = details
      .map((d) => d.message)
      .filter((m): m is string => typeof m === 'string');
    return messages.length > 0 ? [...new Set(messages)].join(' ') : message;
  } catch {
    return message;
  }
}

// ¿Qué? Convierte un AxiosError en un ApiError con mensaje + código legibles.
function toApiError(err: AxiosError<ApiErrorResponse>): ApiError {
  const body = err.response?.data;
  const status = err.response?.status ?? null;
  if (!body) return new ApiError('No se pudo conectar con el servidor.', null, status);
  if (typeof body.error === 'string') return new ApiError(body.error, null, status);
  return new ApiError(
    readableMessage(body.error?.message ?? 'Ocurrió un error inesperado.'),
    body.error?.code ?? null,
    status,
  );
}

// ¿Qué? Evita que múltiples requests que fallan a la vez disparen varios refresh en paralelo.
// ¿Para qué? Si 3 peticiones reciben 401 al mismo tiempo, todas esperan el MISMO refresh
//   en curso en vez de pedir 3 refresh tokens nuevos (que además rotan — RN-063).
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No hay sesión activa.');

  const res = await axios.post<ApiResponse<AuthTokens>>(`${BASE_URL}/auth/refresh`, {
    refreshToken,
  });
  const tokens = res.data.data;
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
  return tokens.accessToken;
}

// ¿Qué? Ruta a la que se envía al usuario cuando su sesión ya no se puede renovar.
// ¿Para qué? LoginPage lee `sesion=expirada` y muestra el aviso de CA-006.2.
export const SESSION_EXPIRED_PATH = '/login?sesion=expirada';

// ¿Qué? ¿El refresh falló porque el backend rechazó la sesión (y no por la red)?
// ¿Para qué? Solo en ese caso hay que cerrar la sesión. Con un corte de red, un 429 o
//   un 500 el refresh token puede seguir siendo válido: sacar al usuario al login por
//   eso le hacía perder lo que estaba haciendo sin motivo.
function isSessionRejected(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return true; // no había refresh token guardado
  const status = err.response?.status;
  return status === 401 || status === 403;
}

// ¿Qué? Borra los tokens y lleva al login con el aviso de sesión expirada (CA-006.2).
function endSession(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  if (window.location.pathname !== '/login') {
    window.location.href = SESSION_EXPIRED_PATH;
  }
}

// ¿Qué? Interceptor de response — ante un 401, intenta renovar la sesión UNA vez
//   y reintenta la petición original (HU-006, CA-006.1). Si el backend rechaza el
//   refresh token, cierra la sesión y lleva al login (CA-006.2).
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiErrorResponse>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    const isAuthEndpoint = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const newAccessToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(original);
      } catch (refreshError) {
        if (isSessionRejected(refreshError)) {
          endSession();
        } else {
          return Promise.reject(toApiError(refreshError as AxiosError<ApiErrorResponse>));
        }
      }
    }

    return Promise.reject(toApiError(error));
  },
);
