/**
 * Archivo: tests/hu-006-renovacion-sesion.test.ts
 * Descripción: Tests de aceptación de la HU-006 (Renovación de sesión) — RF-006.
 * ¿Para qué? Verificar que un refresh token válido entrega una sesión nueva que funciona
 *   (CA-006.1) y que uno expirado, alterado o de otro tipo se rechaza con 401 (CA-006.2).
 * ¿Impacto? Si fallan, la sesión se cerraría cada 15 minutos o, peor, nunca se cerraría.
 */

import { describe, it, expect, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../app.js';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { createVerifiedTestUser, loginTestUser, TEST_USER } from './helpers.js';

const refresh = (refreshToken: string) =>
  request(app).post('/api/v1/auth/refresh').send({ refreshToken });

describe('HU-006 — Renovación de sesión', () => {
  // CA-006.1 / RN-063 — el par nuevo sirve para seguir usando la app.
  it('entrega un access token nuevo que funciona en una ruta protegida', async () => {
    const { refreshToken } = await loginTestUser();
    const res = await refresh(refreshToken);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        tokenType: 'bearer',
      }),
    );

    const me = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${res.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(TEST_USER.email);
  });

  // RN-064 / RN-065 — duración de cada token.
  it('el access token dura 15 minutos y el refresh token 7 días', async () => {
    const { refreshToken } = await loginTestUser();
    const res = await refresh(refreshToken);
    const access = jwt.decode(res.body.data.accessToken) as { iat: number; exp: number };
    const renewed = jwt.decode(res.body.data.refreshToken) as { iat: number; exp: number };

    expect(access.exp - access.iat).toBe(15 * 60);
    expect(renewed.exp - renewed.iat).toBe(7 * 24 * 60 * 60);
  });

  // CA-006.2 — más de 7 días sin actividad.
  it('rechaza con 401 un refresh token expirado', async () => {
    const user = await createVerifiedTestUser();
    const expired = jwt.sign(
      { sub: user.id, email: user.email, role: 'client', type: 'refresh' },
      config.JWT_REFRESH_SECRET,
      { expiresIn: -10 },
    );
    const res = await refresh(expired);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Refresh token inválido o expirado.');
  });

  // RN-061 — un access token no sirve como refresh.
  it('rechaza con 401 un access token enviado como refresh', async () => {
    const { accessToken } = await loginTestUser();
    const res = await refresh(accessToken);

    expect(res.status).toBe(401);
  });

  // RN-060 — firmado con otro secret (token manipulado).
  it('rechaza con 401 un refresh token firmado con otra clave', async () => {
    const user = await createVerifiedTestUser();
    const forged = jwt.sign(
      { sub: user.id, email: user.email, role: 'staff', type: 'refresh' },
      'clave-que-no-es-la-del-servidor',
      { expiresIn: '7d' },
    );
    const res = await refresh(forged);

    expect(res.status).toBe(401);
  });

  // RN-062 — la cuenta ya no existe.
  it('rechaza con 401 el refresh de una cuenta eliminada', async () => {
    const { refreshToken } = await loginTestUser();
    await db.user.deleteMany({ where: { email: TEST_USER.email } });
    const res = await refresh(refreshToken);

    expect(res.status).toBe(401);
  });
});

// ¿Qué? El rate limit se apaga en tests (NODE_ENV=test); aquí se enciende solo para este bloque.
// ¿Impacto? Va al final del archivo porque el contador del limitador vive en memoria: después
//   de este bloque, más logins desde la misma IP responderían 429.
describe('HU-006 — Límite de intentos del refresh (RN-066)', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('agotar el límite del login no bloquea la renovación de sesión', async () => {
    const { refreshToken } = await loginTestUser();
    process.env.NODE_ENV = 'development';

    let lastLogin = 0;
    for (let i = 0; i < 11; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_USER.email, password: 'Incorrecta123' });
      lastLogin = res.status;
    }
    const res = await refresh(refreshToken);

    expect(lastLogin).toBe(429);
    expect(res.status).toBe(200);
  }, 30_000); // 11 logins con bcrypt (12 rondas) superan los 5 s por defecto
});
