/**
 * Archivo: __tests__/api/axios-errors.test.ts
 * Descripción: Tests de cómo el cliente HTTP convierte los errores del backend en mensajes.
 * ¿Para qué? Verificar que un 422 del middleware `validate` se muestra como frases legibles
 *   y no como el JSON en texto que manda el backend (HU-009).
 */

import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { vi } from 'vitest';
import { apiClient, ApiError } from '@/api/axios';

// ¿Qué? Adapter falso que responde siempre con el status y body indicados.
function respondWith(status: number, data: unknown) {
  apiClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
    const response = { status, statusText: '', headers: {}, config, data } as AxiosResponse;
    throw new AxiosError(String(status), 'ERR_BAD_REQUEST', config, null, response);
  });
}

async function errorOf(): Promise<ApiError> {
  try {
    await apiClient.post('/appointments', {});
  } catch (err) {
    return err as ApiError;
  }
  throw new Error('La petición no falló');
}

describe('Mensajes de error de la API (HU-009)', () => {
  it('convierte el JSON de validación en las frases de cada campo', async () => {
    respondWith(422, {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: JSON.stringify([
          { field: 'date', message: 'La fecha debe tener el formato AAAA-MM-DD.' },
          { field: 'time', message: 'La hora debe tener el formato HH:mm.' },
        ]),
      },
    });
    const err = await errorOf();

    expect(err.message).toBe(
      'La fecha debe tener el formato AAAA-MM-DD. La hora debe tener el formato HH:mm.',
    );
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.status).toBe(422);
  });

  it('no repite un mismo mensaje', async () => {
    const msg = 'Selecciona una opción.';
    respondWith(422, {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: JSON.stringify([{ message: msg }, { message: msg }]) },
    });

    expect((await errorOf()).message).toBe(msg);
  });

  it('deja igual un mensaje normal', async () => {
    respondWith(400, {
      success: false,
      error: { code: 'DATE_TOO_SOON', message: 'La cita debe ser a partir de mañana.' },
    });

    expect((await errorOf()).message).toBe('La cita debe ser a partir de mañana.');
  });
});
