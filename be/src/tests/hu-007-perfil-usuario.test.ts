/**
 * Archivo: tests/hu-007-perfil-usuario.test.ts
 * Descripción: Tests de aceptación de la HU-007 (Perfil de usuario) — RF-007.
 * ¿Para qué? Verificar que GET /users/me entrega nombre, correo y rol del dueño del token
 *   (CA-007.1) y que un token ausente, manipulado o de una cuenta eliminada da 401 (CA-007.2).
 * ¿Impacto? Si fallan, la cabecera mostraría datos equivocados o una sesión rota no
 *   devolvería al usuario al login.
 */

import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../app.js';
import { config } from '../config.js';
import { db } from '../db/index.js';
import { createVerifiedTestUser, loginTestStaff, loginTestUser, TEST_USER } from './helpers.js';

const getMe = (token?: string) => {
  const req = request(app).get('/api/v1/users/me');
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

describe('HU-007 — Perfil de usuario', () => {
  // CA-007.1 — datos para la cabecera.
  it('devuelve nombre, correo y rol del cliente sin exponer la contraseña', async () => {
    const { accessToken } = await loginTestUser();
    const res = await getMe(accessToken);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        firstName: TEST_USER.firstName,
        lastName: TEST_USER.lastName,
        email: TEST_USER.email,
        role: 'client',
      }),
    );
    expect(res.body.data).not.toHaveProperty('hashedPassword');
  });

  it('devuelve role "staff" para una cuenta de staff', async () => {
    const { accessToken } = await loginTestStaff();
    const res = await getMe(accessToken);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('staff');
  });

  // CA-007.2 — sin token.
  it('responde 401 con mensaje en español si no hay token', async () => {
    const res = await getMe();

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Debes iniciar sesión para continuar.');
  });

  // CA-007.2 — token manipulado: se cambia el rol en el payload sin poder volver a firmarlo.
  it('responde 401 si el token fue manipulado', async () => {
    const { accessToken } = await loginTestUser();
    const [header, payload, signature] = accessToken.split('.');
    const altered = JSON.parse(Buffer.from(payload!, 'base64url').toString());
    altered.role = 'staff';
    const tampered = `${header}.${Buffer.from(JSON.stringify(altered)).toString('base64url')}.${signature}`;

    const res = await getMe(tampered);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Tu sesión no es válida o expiró. Inicia sesión de nuevo.');
  });

  // CA-007.2 — token corrupto.
  it('responde 401 si el token está corrupto', async () => {
    const res = await getMe('esto-no-es-un-jwt');

    expect(res.status).toBe(401);
  });

  // CA-007.2 — un token sin firma ("alg": "none") no se acepta.
  it('responde 401 a un token sin firma', async () => {
    const user = await createVerifiedTestUser();
    const unsigned = jwt.sign(
      { sub: user.id, email: user.email, role: 'staff', type: 'access' },
      '',
      { algorithm: 'none' },
    );
    const res = await getMe(unsigned);

    expect(res.status).toBe(401);
  });

  // CA-007.2 — un refresh token no sirve como access token.
  it('responde 401 si se envía el refresh token en lugar del access token', async () => {
    const { refreshToken } = await loginTestUser();
    const res = await getMe(refreshToken);

    expect(res.status).toBe(401);
  });

  // CA-007.2 — la cuenta del token ya no existe.
  it('responde 401 (no 404) si la cuenta del token fue eliminada', async () => {
    const { accessToken } = await loginTestUser();
    await db.user.deleteMany({ where: { email: TEST_USER.email } });
    const res = await getMe(accessToken);

    expect(res.status).toBe(401);
  });

  // RN-073 — el perfil sale del token, no de lo que mande el cliente.
  it('el token de un usuario nunca devuelve el perfil de otro', async () => {
    const other = await createVerifiedTestUser({
      email: 'otro@groomingspa.com',
      documentId: '1000000002',
    });
    const { accessToken } = await loginTestUser();
    const res = await request(app)
      .get(`/api/v1/users/me?id=${other.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(TEST_USER.email);
  });

  // ¿Qué? El token expirado se firma a mano para no esperar 15 minutos.
  it('responde 401 si el access token expiró', async () => {
    const user = await createVerifiedTestUser();
    const expired = jwt.sign(
      { sub: user.id, email: user.email, role: 'client', type: 'access' },
      config.JWT_ACCESS_SECRET,
      { expiresIn: -10 },
    );
    const res = await getMe(expired);

    expect(res.status).toBe(401);
  });
});
