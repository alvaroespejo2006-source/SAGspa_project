/**
 * Archivo: tests/hu-010-reporte-sintoma.test.ts
 * Descripción: Tests de aceptación de la HU-010 (Reportar síntoma leve) — RF-010.
 * ¿Para qué? Verificar los campos obligatorios (CA-010.2), el envío (CA-010.3) y que la
 *   recomendación del staff llegue a "Mis reportes" (CA-010.4).
 * ¿Impacto? Si fallan, se guardarían reportes vacíos o el cliente nunca vería la recomendación.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { loginTestStaff, loginTestUser, TEST_USER } from './helpers.js';

async function setup() {
  const { accessToken } = await loginTestUser();
  const client = await db.user.findUniqueOrThrow({
    where: { email: TEST_USER.email },
  });
  const pet = await db.pet.create({
    data: { clientId: client.id, name: 'Max', species: 'canina' },
  });
  return { accessToken, pet };
}

const report = (token: string, body: object) =>
  request(app).post('/api/v1/symptom-reports').set('Authorization', `Bearer ${token}`).send(body);

// ¿Qué? Mensajes del 422 (el middleware `validate` los manda como JSON en texto).
function messagesOf(body: { error: { message: string } }): string[] {
  return (JSON.parse(body.error.message) as { message: string }[]).map((d) => d.message);
}

describe('HU-010 — Reportar síntoma leve', () => {
  // CA-010.2 — síntoma vacío.
  it('responde 422 si el síntoma no se envía', async () => {
    const { accessToken, pet } = await setup();
    const res = await report(accessToken, {
      petId: pet.id,
      daysWithSymptom: 2,
    });

    expect(res.status).toBe(422);
    expect(messagesOf(res.body)).toContain('Describe el síntoma de tu mascota.');
  });

  // CA-010.2 — el bug: un síntoma de solo espacios se guardaba vacío.
  it('responde 422 si el síntoma son solo espacios', async () => {
    const { accessToken, pet } = await setup();
    const res = await report(accessToken, {
      petId: pet.id,
      symptom: '     ',
      daysWithSymptom: 2,
    });

    expect(res.status).toBe(422);
    expect(messagesOf(res.body)).toContain('Describe el síntoma de tu mascota.');
    expect(await db.symptomReport.count()).toBe(0);
  });

  it('responde 422 en español si faltan los días', async () => {
    const { accessToken, pet } = await setup();
    const res = await report(accessToken, {
      petId: pet.id,
      symptom: 'No quiere comer',
    });

    expect(res.status).toBe(422);
    expect(messagesOf(res.body)).toContain('Indica hace cuántos días tiene el síntoma.');
  });

  it.each([0, 400])('responde 422 si los días son %s', async (days) => {
    const { accessToken, pet } = await setup();
    const res = await report(accessToken, {
      petId: pet.id,
      symptom: 'No quiere comer',
      daysWithSymptom: days,
    });

    expect(res.status).toBe(422);
  });

  // CA-010.3 — envío exitoso, queda pendiente y sin espacios sobrantes.
  it('registra el reporte como pendiente', async () => {
    const { accessToken, pet } = await setup();
    const res = await report(accessToken, {
      petId: pet.id,
      symptom: '  Está decaído  ',
      daysWithSymptom: 2,
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        status: 'pending',
        symptom: 'Está decaído',
        recommendation: null,
      }),
    );
  });

  // RN-101 — no se puede reportar por la mascota de otro cliente.
  it('responde 403 si la mascota es de otro cliente', async () => {
    const { accessToken } = await setup();
    const other = await db.user.create({
      data: {
        firstName: 'Otra',
        lastName: 'Persona',
        email: 'otra@spa.com',
        hashedPassword: 'x',
        role: 'client',
      },
    });
    const otherPet = await db.pet.create({
      data: { clientId: other.id, name: 'Luna', species: 'felina' },
    });
    const res = await report(accessToken, {
      petId: otherPet.id,
      symptom: 'No quiere comer',
      daysWithSymptom: 1,
    });

    expect(res.status).toBe(403);
  });

  // CA-010.4 — la recomendación del staff aparece en "Mis reportes" con el nombre de la mascota.
  it('"Mis reportes" muestra la recomendación del staff y el nombre de la mascota', async () => {
    const { accessToken, pet } = await setup();
    const created = await report(accessToken, {
      petId: pet.id,
      symptom: 'Se rasca mucho',
      daysWithSymptom: 3,
    });
    const staff = await loginTestStaff();
    await request(app)
      .put(`/api/v1/staff/symptom-reports/${created.body.data.id}`)
      .set('Authorization', `Bearer ${staff.accessToken}`)
      .send({ recommendation: 'Tráelo para revisión' });

    const mine = await request(app)
      .get('/api/v1/symptom-reports/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(mine.status).toBe(200);
    expect(mine.body.data[0]).toEqual(
      expect.objectContaining({
        status: 'reviewed',
        recommendation: 'Tráelo para revisión',
        pet: { id: pet.id, name: 'Max' },
      }),
    );
  });

  it('el staff no puede crear reportes de síntoma', async () => {
    const { pet } = await setup();
    const staff = await loginTestStaff();
    const res = await report(staff.accessToken, {
      petId: pet.id,
      symptom: 'No quiere comer',
      daysWithSymptom: 1,
    });

    expect(res.status).toBe(403);
  });
});
