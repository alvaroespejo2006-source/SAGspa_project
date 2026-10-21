/**
 * Archivo: tests/hu-004-cambio-password.test.ts
 * Descripción: Tests de aceptación de la HU-004 (Cambio de contraseña) — RF-004.
 * ¿Para qué? Verificar mensajes y códigos de CA-004.1 a CA-004.4, que la contraseña nueva
 *   realmente reemplace a la anterior y que las demás sesiones se cierren.
 * ¿Impacto? Si fallan, un usuario podría quedar con la contraseña vieja activa o con una
 *   sesión robada abierta después de cambiarla.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { db } from '../db/index.js';
import { loginTestUser, TEST_USER } from './helpers.js';

const NEW_PASSWORD = 'NuevaClave456';

// ¿Qué? Extrae los mensajes de validación que el middleware `validate` serializa como JSON.
function validationMessages(body: { error: { message: string } }): string[] {
  const details = JSON.parse(body.error.message) as { field: string; message: string }[];
  return details.map((d) => d.message);
}

// ¿Qué? Espera a que cambie el segundo del reloj.
// ¿Para qué? `iat` de los JWT tiene precisión de segundos: sin esto, el token de login y el
//   cambio de contraseña podrían caer en el mismo segundo y el test no probaría nada.
async function waitNextSecond(): Promise<void> {
  const ms = 1000 - (Date.now() % 1000) + 50;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe('HU-004 — Cambio de contraseña', () => {
  // CA-004.1 — contraseña actual incorrecta (400, no 401: no es un problema de sesión).
  it('responde 400 INVALID_CURRENT_PASSWORD si la contraseña actual es incorrecta', async () => {
    const { accessToken } = await loginTestUser();
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'Incorrecta123', newPassword: NEW_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({
      code: 'INVALID_CURRENT_PASSWORD',
      message: 'La contraseña actual es incorrecta.',
    });
  });

  // CA-004.2 / RN-033 — nueva igual a la actual.
  it('responde 422 con el mensaje de la HU si la nueva es igual a la actual', async () => {
    const { accessToken } = await loginTestUser();
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: TEST_USER.password, newPassword: TEST_USER.password });

    expect(res.status).toBe(422);
    expect(validationMessages(res.body)).toContain(
      'La nueva contraseña debe ser diferente a la actual.',
    );
  });

  // CA-004.4 / RN-032 — nueva contraseña débil.
  it('responde 422 si la nueva contraseña no cumple los requisitos', async () => {
    const { accessToken } = await loginTestUser();
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: TEST_USER.password, newPassword: 'debil' });

    expect(res.status).toBe(422);
  });

  // CA-004.3 / RN-034 — la nueva funciona, la anterior ya no.
  it('reemplaza la contraseña: el login funciona con la nueva y falla con la anterior', async () => {
    const { accessToken } = await loginTestUser();
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: TEST_USER.password, newPassword: NEW_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Contraseña actualizada correctamente.');

    const withOld = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });
    const withNew = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_USER.email, password: NEW_PASSWORD });

    expect(withOld.status).toBe(401);
    expect(withNew.status).toBe(200);
  });

  // RN-030 — el userId sale solo del token: un userId en el body se ignora.
  it('cambia la contraseña del dueño del token aunque el body traiga otro userId', async () => {
    const { accessToken } = await loginTestUser();
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: TEST_USER.password,
        newPassword: NEW_PASSWORD,
        userId: '00000000-0000-0000-0000-000000000000',
      });

    expect(res.status).toBe(200);
    const payload = jwt.decode(accessToken) as { sub: string };
    const user = await db.user.findUniqueOrThrow({ where: { id: payload.sub } });
    expect(user.passwordChangedAt).not.toBeNull();
  });

  // RN-035 — cambiar la contraseña cierra las demás sesiones, pero no la actual.
  it('invalida los refresh tokens anteriores y entrega tokens nuevos que sí funcionan', async () => {
    const oldSession = await loginTestUser();
    await waitNextSecond();

    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${oldSession.accessToken}`)
      .send({ currentPassword: TEST_USER.password, newPassword: NEW_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');

    const oldRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldSession.refreshToken });
    expect(oldRefresh.status).toBe(401);
    expect(oldRefresh.body.error.message).toBe('Tu contraseña cambió. Inicia sesión de nuevo.');

    const newRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: res.body.data.refreshToken });
    expect(newRefresh.status).toBe(200);
  });
});
