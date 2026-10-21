/**
 * Archivo: tests/hu-001-registro.test.ts
 * Descripción: Tests de aceptación de la HU-001 (Registro de cliente) — RF-001.
 * ¿Para qué? Verificar los criterios de aceptación y reglas de negocio que no cubre
 *   auth.test.ts: documento duplicado, teléfono obligatorio, rol forzado y token de 24 h.
 * ¿Impacto? Si alguno falla, un cliente podría registrarse dos veces con la misma cédula,
 *   auto-asignarse el rol staff o quedar sin forma de verificar su correo.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { createTestUser, TEST_USER } from './helpers.js';

// ¿Qué? Extrae los mensajes de validación que el middleware `validate` serializa como JSON.
function validationMessages(body: { error: { message: string } }): string[] {
  const details = JSON.parse(body.error.message) as { field: string; message: string }[];
  return details.map((d) => d.message);
}

describe('HU-001 — Registro de cliente', () => {
  // CA-001.6 / RN-002 — el documento es único aunque el correo sea distinto.
  it('retorna 409 si el documento ya está registrado con otro correo', async () => {
    await createTestUser();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...TEST_USER, email: 'otro.correo@groomingspa.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('El email o el documento ya están registrados.');
  });

  // CA-001.6 / RN-001 — el correo se normaliza a minúsculas, así que no se puede duplicar
  //   cambiando mayúsculas.
  it('retorna 409 si el correo ya existe escrito con otras mayúsculas', async () => {
    await createTestUser();
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...TEST_USER, documentId: '2000000002', email: TEST_USER.email.toUpperCase() });

    expect(res.status).toBe(409);
  });

  // CA-001.2 / RN-003 — teléfono vacío.
  it('retorna 422 con "El teléfono es obligatorio." si el teléfono está vacío', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...TEST_USER, phone: '' });

    expect(res.status).toBe(422);
    expect(validationMessages(res.body)).toContain('El teléfono es obligatorio.');
  });

  // CA-001.2 / RN-003 — teléfono ausente en el body.
  it('retorna 422 con "El teléfono es obligatorio." si no se envía el teléfono', async () => {
    const withoutPhone: Partial<typeof TEST_USER> = { ...TEST_USER };
    delete withoutPhone.phone;
    const res = await request(app).post('/api/v1/auth/register').send(withoutPhone);

    expect(res.status).toBe(422);
    expect(validationMessages(res.body)).toContain('El teléfono es obligatorio.');
  });

  // CA-001.5 / RN-007 / RN-008 — el rol siempre es client y la cuenta nace sin verificar.
  it('crea al usuario como client sin verificar aunque el body intente enviar role=staff', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...TEST_USER, role: 'staff', isEmailVerified: true });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('client');
    expect(res.body.data.isEmailVerified).toBe(false);
  });

  // RN-006 — la contraseña nunca se guarda en texto plano.
  it('guarda la contraseña como hash bcrypt', async () => {
    const user = await createTestUser();
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });

    expect(stored.hashedPassword).not.toBe(TEST_USER.password);
    expect(stored.hashedPassword).toMatch(/^\$2[aby]\$12\$/);
  });

  // RN-009 / RN-010 — se crea un token de verificación sin usar que vence en 24 h.
  it('crea un token de verificación de un solo uso que expira en 24 horas', async () => {
    const before = Date.now();
    const user = await createTestUser();
    const token = await db.emailVerificationToken.findFirstOrThrow({ where: { userId: user.id } });

    const expiresInMs = token.expiresAt.getTime() - before;
    expect(token.used).toBe(false);
    expect(expiresInMs).toBeGreaterThan(23.9 * 60 * 60 * 1000);
    expect(expiresInMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 5000);
  });

  // CA-001.7 — no puede iniciar sesión hasta verificar el correo.
  it('bloquea el login con 403 mientras el correo no esté verificado', async () => {
    await createTestUser();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/Debes verificar tu email antes de iniciar sesión/);
  });
});
