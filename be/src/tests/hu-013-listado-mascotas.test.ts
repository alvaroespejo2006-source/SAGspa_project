/**
 * Archivo: tests/hu-013-listado-mascotas.test.ts
 * Descripción: Tests de aceptación de la HU-013 (Listado de mascotas del cliente) — RF-013.
 * ¿Para qué? Verificar que el cliente recibe solo SUS mascotas (CA-013.1), un arreglo vacío si
 *   no tiene (CA-013.2), y que un id mal formado en la URL responde 404 y no 500.
 * ¿Impacto? Si fallan, un cliente podría ver mascotas ajenas o la API caerse con un id inválido.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { loginTestStaff, loginTestUser, TEST_USER } from './helpers.js';

const myPets = (token: string) =>
  request(app).get('/api/v1/pets/me').set('Authorization', `Bearer ${token}`);

describe('HU-013 — Listado de mascotas', () => {
  // CA-013.2 — sin mascotas: arreglo vacío, no error.
  it('devuelve un arreglo vacío si el cliente no tiene mascotas', async () => {
    const { accessToken } = await loginTestUser();
    const res = await myPets(accessToken);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  // CA-013.1 — solo las mascotas del cliente autenticado.
  it('devuelve solo las mascotas del cliente, nunca las de otro', async () => {
    const { accessToken } = await loginTestUser();
    const me = await db.user.findUniqueOrThrow({
      where: { email: TEST_USER.email },
    });
    const other = await db.user.create({
      data: {
        firstName: 'Otra',
        lastName: 'Persona',
        email: 'otra@spa.com',
        hashedPassword: 'x',
        role: 'client',
      },
    });
    await db.pet.createMany({
      data: [
        { clientId: me.id, name: 'Max', species: 'canina' },
        { clientId: me.id, name: 'Mia', species: 'felina' },
        { clientId: other.id, name: 'Ajena', species: 'canina' },
      ],
    });

    const res = await myPets(accessToken);

    expect(res.status).toBe(200);
    expect(res.body.data.map((p: { name: string }) => p.name).sort()).toEqual(['Max', 'Mia']);
  });

  it('el staff no usa /pets/me (403)', async () => {
    const { accessToken } = await loginTestStaff();
    const res = await myPets(accessToken);

    expect(res.status).toBe(403);
  });

  // ¿Qué? El bug: un id que no es UUID llegaba a Prisma y la API respondía 500.
  it.each([
    ['put', '/api/v1/pets/abc'],
    ['put', '/api/v1/services/abc'],
    ['delete', '/api/v1/services/abc'],
    ['put', '/api/v1/products/abc'],
    ['put', '/api/v1/appointments/abc'],
    ['put', '/api/v1/staff/orders/abc'],
    ['put', '/api/v1/staff/symptom-reports/abc'],
  ] as const)('%s %s con un id mal formado responde 404', async (method, path) => {
    const { accessToken } = await loginTestStaff();
    const api = request(app);
    const res = await api[method](path).set('Authorization', `Bearer ${accessToken}`).send({});

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('No se encontró el recurso solicitado.');
  });
});
