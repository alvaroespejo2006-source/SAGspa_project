/**
 * Archivo: tests/hu-005-recuperacion-password.test.ts
 * Descripción: Tests de aceptación de la HU-005 (Recuperación de contraseña) — RF-005.
 * ¿Para qué? Verificar el mensaje genérico de la solicitud (CA-005.1), que cada fallo del
 *   enlace tenga su propio código (CA-005.2) y que el restablecimiento funcione (CA-005.3).
 * ¿Impacto? Si fallan, alguien que olvidó su contraseña podría quedarse sin forma de entrar.
 */

import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { createVerifiedTestUser, TEST_USER } from './helpers.js';

const GENERIC_MESSAGE = 'Si el correo está registrado, recibirás un enlace de recuperación.';
const NEW_PASSWORD = 'NuevaClave456';

// ¿Qué? Crea un token de recuperación directamente en la BD.
// ¿Para qué? Probar los casos expirado y usado sin esperar una hora ni leer el correo.
async function createResetToken(
  userId: string,
  options: { expiresIn?: number; used?: boolean } = {},
): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  await db.passwordResetToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + (options.expiresIn ?? 60 * 60 * 1000)),
      used: options.used ?? false,
    },
  });
  return token;
}

describe('HU-005 — Recuperación de contraseña', () => {
  // CA-005.1 / RN-050 — mismo mensaje exista o no el correo.
  it('responde el mismo mensaje de la HU para un correo registrado y uno que no existe', async () => {
    await createVerifiedTestUser();
    const registered = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: TEST_USER.email });
    const unknown = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nadie@groomingspa.com' });

    expect(registered.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(registered.body.message).toBe(GENERIC_MESSAGE);
    expect(unknown.body.message).toBe(GENERIC_MESSAGE);
  });

  // CA-005.1 — un correo pegado con espacios no debe dar 422.
  it('acepta el correo con espacios y mayúsculas y genera el token', async () => {
    const user = await createVerifiedTestUser();
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: `  ${TEST_USER.email.toUpperCase()}  ` });

    expect(res.status).toBe(200);
    expect(await db.passwordResetToken.count({ where: { userId: user.id } })).toBe(1);
  });

  // RN-052 — al pedir un enlace nuevo, el anterior deja de servir.
  it('invalida el enlace anterior cuando se solicita uno nuevo', async () => {
    const user = await createVerifiedTestUser();
    await request(app).post('/api/v1/auth/forgot-password').send({ email: TEST_USER.email });
    await request(app).post('/api/v1/auth/forgot-password').send({ email: TEST_USER.email });

    const tokens = await db.passwordResetToken.findMany({ where: { userId: user.id } });
    expect(tokens).toHaveLength(2);
    expect(tokens.filter((t) => !t.used)).toHaveLength(1);
  });

  // CA-005.2 / RN-051 — enlace con más de 1 hora.
  it('responde TOKEN_EXPIRED al validar y al usar un enlace expirado', async () => {
    const user = await createVerifiedTestUser();
    const token = await createResetToken(user.id, { expiresIn: -1000 });

    const check = await request(app).post('/api/v1/auth/reset-password/validate').send({ token });
    const reset = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: NEW_PASSWORD });

    for (const res of [check, reset]) {
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
      expect(res.body.error.message).toBe('El enlace de recuperación expiró. Solicita uno nuevo.');
    }
  });

  // RN-052 — el enlace es de un solo uso.
  it('responde TOKEN_ALREADY_USED si el enlace ya se usó', async () => {
    const user = await createVerifiedTestUser();
    const token = await createResetToken(user.id, { used: true });
    const res = await request(app).post('/api/v1/auth/reset-password/validate').send({ token });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TOKEN_ALREADY_USED');
  });

  it('responde TOKEN_INVALID si el enlace no existe', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password/validate')
      .send({ token: 'no-existe' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
  });

  it('valida un enlace vigente sin consumirlo', async () => {
    const user = await createVerifiedTestUser();
    const token = await createResetToken(user.id);
    const res = await request(app).post('/api/v1/auth/reset-password/validate').send({ token });

    expect(res.status).toBe(200);
    const stored = await db.passwordResetToken.findFirstOrThrow({ where: { token } });
    expect(stored.used).toBe(false);
  });

  // CA-005.3 — la nueva contraseña funciona, la anterior no y el enlace no se reutiliza.
  it('restablece la contraseña: la nueva funciona, la anterior no y el enlace queda usado', async () => {
    const user = await createVerifiedTestUser();
    const token = await createResetToken(user.id);

    const reset = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: NEW_PASSWORD });
    expect(reset.status).toBe(200);

    const withNew = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: NEW_PASSWORD });
    const withOld = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });
    const again = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: 'OtraClave789' });

    expect(withNew.status).toBe(200);
    expect(withOld.status).toBe(401);
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('TOKEN_ALREADY_USED');
  });
});
