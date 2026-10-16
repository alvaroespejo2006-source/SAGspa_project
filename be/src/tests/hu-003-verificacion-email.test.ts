/**
 * Archivo: tests/hu-003-verificacion-email.test.ts
 * Descripción: Tests de aceptación de la HU-003 (Verificación de email) — RF-003.
 * ¿Para qué? Verificar que cada fallo del enlace tenga su propio mensaje y código
 *   (CA-003.2 / CA-003.3) y que el reenvío del enlace funcione sin revelar cuentas.
 * ¿Impacto? Si fallan, el usuario no sabría si debe iniciar sesión o pedir un enlace nuevo.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import {
  createTestUser,
  createVerificationToken,
  createVerifiedTestUser,
  TEST_USER,
} from './helpers.js';

describe('HU-003 — Verificación de email', () => {
  // CA-003.1 / RN-043 / RN-044 — activa la cuenta y consume el token.
  it('activa la cuenta y marca el token como usado', async () => {
    const { userId, token } = await createVerificationToken();
    const res = await request(app).post('/api/v1/auth/verify-email').send({ token });

    expect(res.status).toBe(200);
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    const stored = await db.emailVerificationToken.findFirstOrThrow({ where: { token } });
    expect(user.isEmailVerified).toBe(true);
    expect(stored.used).toBe(true);
  });

  // CA-003.2 / RN-041 — enlace con más de 24 h.
  it('responde TOKEN_EXPIRED con su propio mensaje si el enlace expiró', async () => {
    const { token } = await createVerificationToken(undefined, { expiresIn: -1000 });
    const res = await request(app).post('/api/v1/auth/verify-email').send({ token });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    expect(res.body.error.message).toBe(
      'El enlace de verificación ha expirado. Solicita uno nuevo.',
    );
  });

  // CA-003.3 / RN-042 — el mismo enlace usado dos veces.
  it('responde TOKEN_ALREADY_USED al usar el mismo enlace por segunda vez', async () => {
    const { token } = await createVerificationToken();
    await request(app).post('/api/v1/auth/verify-email').send({ token });
    const res = await request(app).post('/api/v1/auth/verify-email').send({ token });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TOKEN_ALREADY_USED');
    expect(res.body.error.message).toMatch(/^Este enlace ya fue utilizado/);
  });

  // ¿Qué? Usado Y expirado a la vez: prima "ya fue utilizado" porque la cuenta ya está activa.
  it('prioriza TOKEN_ALREADY_USED sobre TOKEN_EXPIRED', async () => {
    const { token } = await createVerificationToken(undefined, { expiresIn: -1000, used: true });
    const res = await request(app).post('/api/v1/auth/verify-email').send({ token });

    expect(res.body.error.code).toBe('TOKEN_ALREADY_USED');
  });

  // CA-003.4 / RN-040 — token que no existe.
  it('responde TOKEN_INVALID si el token no existe', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'f'.repeat(64) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TOKEN_INVALID');
    expect(res.body.error.message).toBe('Token de verificación inválido.');
  });

  // RN-043 — un token expirado no activa la cuenta.
  it('no activa la cuenta con un token expirado', async () => {
    const { userId, token } = await createVerificationToken(undefined, { expiresIn: -1000 });
    await request(app).post('/api/v1/auth/verify-email').send({ token });

    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.isEmailVerified).toBe(false);
  });
});

describe('HU-003 — Reenvío del enlace de verificación', () => {
  const GENERIC_MESSAGE =
    'Si tu cuenta está pendiente de verificación, te enviamos un nuevo enlace a tu correo.';

  it('invalida el enlace anterior y crea uno nuevo que sí activa la cuenta', async () => {
    const user = await createTestUser();
    const oldToken = await db.emailVerificationToken.findFirstOrThrow({
      where: { userId: user.id },
    });

    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: TEST_USER.email });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(GENERIC_MESSAGE);

    const tokens = await db.emailVerificationToken.findMany({ where: { userId: user.id } });
    const pending = tokens.filter((t) => !t.used);
    expect(tokens).toHaveLength(2);
    expect(pending).toHaveLength(1);
    expect(pending[0].token).not.toBe(oldToken.token);

    const verify = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: pending[0].token });
    expect(verify.status).toBe(200);
  });

  // ¿Qué? Misma respuesta para un correo inexistente — no revela qué cuentas existen.
  it('responde igual si el correo no está registrado', async () => {
    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'nadie@groomingspa.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(GENERIC_MESSAGE);
  });

  it('no genera enlaces nuevos para una cuenta ya verificada', async () => {
    const user = await createVerifiedTestUser();
    const before = await db.emailVerificationToken.count({ where: { userId: user.id } });

    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: TEST_USER.email });

    expect(res.status).toBe(200);
    expect(await db.emailVerificationToken.count({ where: { userId: user.id } })).toBe(before);
  });

  it('retorna 422 con un correo mal formado', async () => {
    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'no-es-correo' });

    expect(res.status).toBe(422);
  });
});
