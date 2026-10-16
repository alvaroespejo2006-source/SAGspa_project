/**
 * Archivo: tests/hu-002-login.test.ts
 * Descripción: Tests de aceptación de la HU-002 (Inicio de sesión) — RF-002.
 * ¿Para qué? Verificar lo que auth.test.ts no cubre: mensaje genérico idéntico, rol en la
 *   respuesta, contenido y duración de los tokens, y renovación de sesión.
 * ¿Impacto? Si fallan, un atacante podría averiguar qué correos existen, o el frontend
 *   mandaría al staff a la vista de cliente.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { createTestUser, createVerifiedStaffUser, createVerifiedTestUser, TEST_USER } from './helpers.js';

interface TokenPayload {
  sub: string;
  role: string;
  type: string;
  iat: number;
  exp: number;
}

describe('HU-002 — Inicio de sesión', () => {
  // CA-002.2 / RN-022 — mismo mensaje y status para correo inexistente y contraseña errada.
  it('responde igual a un correo inexistente y a una contraseña incorrecta', async () => {
    await createVerifiedTestUser();

    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: 'Incorrecta123' });
    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nadie@groomingspa.com', password: 'Incorrecta123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe('Credenciales inválidas.');
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  // CA-002.3 / RN-023 — credenciales correctas pero correo sin verificar.
  it('retorna 403 con el mensaje de verificar el email', async () => {
    await createTestUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe(
      'Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.',
    );
  });

  // CA-002.4 — un cliente recibe role=client (el frontend lo envía a /app).
  it('devuelve role=client y no expone la contraseña para un cliente', async () => {
    await createVerifiedTestUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    expect(res.status).toBe(200);
    expect(res.body.data.tokenType).toBe('bearer');
    expect(res.body.data.user).toEqual({
      id: expect.any(String),
      firstName: TEST_USER.firstName,
      role: 'client',
      isEmailVerified: true,
    });
  });

  // CA-002.5 — un staff recibe role=staff (el frontend lo envía a /staff).
  it('devuelve role=staff para una cuenta de staff', async () => {
    const staff = await createVerifiedStaffUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: staff.email, password: staff.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('staff');
  });

  // RN-001 — el correo se normaliza: se puede iniciar sesión con mayúsculas y espacios.
  it('permite iniciar sesión con el correo en mayúsculas', async () => {
    await createVerifiedTestUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `  ${TEST_USER.email.toUpperCase()} `, password: TEST_USER.password });

    expect(res.status).toBe(200);
  });

  // RN-024 / RN-025 / RN-026 — duración y contenido de los tokens.
  it('emite access token de 15 min y refresh token de 7 días con userId y role', async () => {
    const user = await createVerifiedTestUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    const access = jwt.decode(res.body.data.accessToken) as TokenPayload;
    const refresh = jwt.decode(res.body.data.refreshToken) as TokenPayload;

    expect(access.sub).toBe(user.id);
    expect(access.role).toBe('client');
    expect(access.type).toBe('access');
    expect(access.exp - access.iat).toBe(15 * 60);

    expect(refresh.sub).toBe(user.id);
    expect(refresh.type).toBe('refresh');
    expect(refresh.exp - refresh.iat).toBe(7 * 24 * 60 * 60);
  });

  // RN-026 — los tokens se firman con secrets distintos: un access token no sirve para refrescar.
  it('rechaza un access token usado como refresh token', async () => {
    await createVerifiedTestUser();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.data.accessToken });

    expect(res.status).toBe(401);
  });

  // CA-002.6 — con el refresh token se obtiene un access token nuevo que da acceso.
  it('renueva la sesión con el refresh token y el nuevo access token funciona', async () => {
    await createVerifiedTestUser();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.data.refreshToken });
    expect(refreshed.status).toBe(200);

    const me = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${refreshed.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(TEST_USER.email);
  });
});
