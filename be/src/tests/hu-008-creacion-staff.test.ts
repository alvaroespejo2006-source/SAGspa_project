/**
 * Archivo: tests/hu-008-creacion-staff.test.ts
 * Descripción: Tests de aceptación de la HU-008 (Creación de cuenta de staff) — RF-008.
 * ¿Para qué? Verificar que solo el staff crea y lista cuentas de staff (CA-008.1), que el
 *   correo duplicado se rechaza (CA-008.3) y que la cuenta nueva aparece en el listado (CA-008.4).
 * ¿Impacto? Si fallan, un cliente podría darse acceso al panel administrativo.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { loginTestStaff, loginTestUser, TEST_USER } from './helpers.js';

const NEW_STAFF = {
  firstName: 'Laura',
  lastName: 'Gómez',
  email: 'laura@groomingspa.com',
  password: 'StaffNueva123',
};

const createStaff = (token: string, body: object = NEW_STAFF) =>
  request(app).post('/api/v1/staff').set('Authorization', `Bearer ${token}`).send(body);

describe('HU-008 — Creación de cuenta de staff', () => {
  // CA-008.1 — un cliente no puede crear staff.
  it('responde 403 con mensaje en español si un cliente intenta crear staff', async () => {
    const { accessToken } = await loginTestUser();
    const res = await createStaff(accessToken);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('No tienes permiso para realizar esta acción.');
    expect(await db.user.count({ where: { email: NEW_STAFF.email } })).toBe(0);
  });

  // CA-008.1 — un cliente tampoco puede ver el listado.
  it('responde 403 si un cliente pide el listado de staff', async () => {
    const { accessToken } = await loginTestUser();
    const res = await request(app).get('/api/v1/staff').set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });

  it('responde 401 al listado sin iniciar sesión', async () => {
    const res = await request(app).get('/api/v1/staff');

    expect(res.status).toBe(401);
  });

  // CA-008.3 / RN-003 — correo de otro staff.
  it('responde 409 si el correo ya pertenece a otra cuenta de staff', async () => {
    const { accessToken } = await loginTestStaff();
    await createStaff(accessToken);
    const res = await createStaff(accessToken, { ...NEW_STAFF, firstName: 'Otra' });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('El email ya está registrado.');
  });

  // CA-008.3 / RN-003 — el correo es único entre clientes y staff.
  it('responde 409 si el correo ya pertenece a un cliente, aun con otras mayúsculas', async () => {
    await loginTestUser();
    const { accessToken } = await loginTestStaff();
    const res = await createStaff(accessToken, {
      ...NEW_STAFF,
      email: `  ${TEST_USER.email.toUpperCase()} `,
    });

    expect(res.status).toBe(409);
  });

  // CA-008.4 — se crea con role staff y aparece en el listado.
  it('crea la cuenta con role "staff" y aparece primera en el listado', async () => {
    const { accessToken } = await loginTestStaff();
    const created = await createStaff(accessToken);

    expect(created.status).toBe(201);
    expect(created.body.data.role).toBe('staff');
    expect(created.body.data).not.toHaveProperty('hashedPassword');

    const list = await request(app).get('/api/v1/staff').set('Authorization', `Bearer ${accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.data[0]).toEqual(
      expect.objectContaining({
        email: NEW_STAFF.email,
        firstName: NEW_STAFF.firstName,
        isEmailVerified: false,
      }),
    );
    expect(list.body.data[0]).not.toHaveProperty('hashedPassword');
  });

  it('el listado no incluye clientes', async () => {
    await loginTestUser();
    const { accessToken } = await loginTestStaff();
    const list = await request(app).get('/api/v1/staff').set('Authorization', `Bearer ${accessToken}`);

    expect(list.body.data.map((s: { email: string }) => s.email)).not.toContain(TEST_USER.email);
  });

  // RN-023 — la cuenta nueva verifica su correo antes de poder entrar.
  it('la cuenta nueva no puede iniciar sesión hasta verificar su correo', async () => {
    const { accessToken } = await loginTestStaff();
    await createStaff(accessToken);
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: NEW_STAFF.email, password: NEW_STAFF.password });

    expect(login.status).toBe(403);
    expect(await db.emailVerificationToken.count()).toBe(1);
  });

  // RN-004 — misma fortaleza de contraseña que el registro.
  it('responde 422 si la contraseña es débil', async () => {
    const { accessToken } = await loginTestStaff();
    const res = await createStaff(accessToken, { ...NEW_STAFF, password: 'debil' });

    expect(res.status).toBe(422);
  });
});
