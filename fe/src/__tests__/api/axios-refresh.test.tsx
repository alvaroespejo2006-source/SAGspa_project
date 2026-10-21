/**
 * Archivo: __tests__/api/axios-refresh.test.tsx
 * Descripción: Tests de aceptación de la HU-006 sobre el interceptor de Axios y el login.
 * ¿Para qué? Verificar que la sesión se renueva sin que el usuario lo note (CA-006.1) y que,
 *   si el refresh token ya no sirve, se vuelve al login con el aviso (CA-006.2).
 * ¿Impacto? Si fallan, la sesión se cerraría cada 15 minutos o por un simple corte de red.
 */

import { screen } from '@testing-library/react';
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { vi } from 'vitest';
import { apiClient } from '@/api/axios';
import { LoginPage } from '@/pages/LoginPage';
import { renderWithRouter } from '../helpers';

vi.mock('@/components/auth/LoginForm', () => ({ LoginForm: () => <form aria-label="login" /> }));

// ¿Qué? Respuesta 401 como la que da el backend cuando el access token expiró.
function unauthorized(config: InternalAxiosRequestConfig): AxiosError {
  const response = {
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config,
    data: { success: false, error: { code: 'UNAUTHORIZED', message: 'Token expirado' } },
  } as AxiosResponse;
  return new AxiosError('401', 'ERR_BAD_REQUEST', config, null, response);
}

// ¿Qué? Adapter falso: responde 401 si el token es el viejo y 200 si es el nuevo.
const adapter = vi.fn(async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  if (config.headers.Authorization !== 'Bearer access-nuevo') throw unauthorized(config);
  return { status: 200, statusText: 'OK', headers: {}, config, data: { ok: true, url: config.url } };
});

const postSpy = vi.spyOn(axios, 'post');
const originalLocation = window.location;

beforeEach(() => {
  adapter.mockClear();
  postSpy.mockReset();
  apiClient.defaults.adapter = adapter;
  localStorage.setItem('accessToken', 'access-viejo');
  localStorage.setItem('refreshToken', 'refresh-valido');
  // ¿Qué? jsdom no navega al asignar location.href; se reemplaza para poder leerlo.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { pathname: '/app', href: 'http://localhost/app' },
  });
});

afterEach(() => {
  localStorage.clear();
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
});

const refreshOk = () =>
  postSpy.mockResolvedValue({
    data: { data: { accessToken: 'access-nuevo', refreshToken: 'refresh-nuevo' } },
  });

describe('Interceptor de Axios (HU-006)', () => {
  it('CA-006.1 — renueva el access token y repite la petición sin que el usuario lo note', async () => {
    refreshOk();
    const res = await apiClient.get('/pets');

    expect(res.data).toEqual({ ok: true, url: '/pets' });
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy.mock.calls[0]![1]).toEqual({ refreshToken: 'refresh-valido' });
    expect(localStorage.getItem('accessToken')).toBe('access-nuevo');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-nuevo');
  });

  it('varias peticiones con 401 a la vez comparten un solo refresh', async () => {
    refreshOk();
    await Promise.all([apiClient.get('/pets'), apiClient.get('/appointments')]);

    expect(postSpy).toHaveBeenCalledTimes(1);
  });

  it('CA-006.2 — si el refresh token fue rechazado, cierra la sesión y va al login', async () => {
    postSpy.mockRejectedValue(unauthorized({ headers: {} } as InternalAxiosRequestConfig));

    await expect(apiClient.get('/pets')).rejects.toBeInstanceOf(Error);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(window.location.href).toBe('/login?sesion=expirada');
  });

  it('un corte de red durante el refresh no cierra la sesión', async () => {
    postSpy.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));

    await expect(apiClient.get('/pets')).rejects.toThrow('No se pudo conectar con el servidor.');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-valido');
    expect(window.location.href).toBe('http://localhost/app');
  });
});

describe('LoginPage (HU-006)', () => {
  it('CA-006.2 — muestra el aviso de sesión expirada', () => {
    renderWithRouter(<LoginPage />, { initialEntries: ['/login?sesion=expirada'] });

    expect(
      screen.getByText('Tu sesión expiró. Inicia sesión de nuevo para continuar.'),
    ).toBeInTheDocument();
  });

  it('no muestra el aviso en un login normal', () => {
    renderWithRouter(<LoginPage />, { initialEntries: ['/login'] });

    expect(screen.queryByText(/Tu sesión expiró/)).not.toBeInTheDocument();
  });
});
