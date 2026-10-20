/**
 * Archivo: tests/hu-018-revision-sintomas.test.ts
 * Descripción: Tests de aceptación de la HU-018 (Revisar reportes de síntomas) — RF-018.
 * ¿Para qué? Verificar la bandeja de pendientes (CA-018.1), que la recomendación llegue al
 *   cliente (CA-018.2) y que no se pueda revisar sin escribir nada (CA-018.3).
 * ¿Impacto? Si fallan, el cliente podría quedarse sin respuesta o con una recomendación vacía.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { reviewReport } from '../modules/symptom-reports/symptom-reports.service.js';
import { loginTestStaff, loginTestUser, TEST_USER } from './helpers.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

function messagesOf(body: { error: { message: string } }): string[] {
  return (JSON.parse(body.error.message) as { message: string }[]).map((d) => d.message);
}

// ¿Qué? Un cliente con mascota y un reporte pendiente, más la sesión del staff.
async function setup() {
  const client = await loginTestUser();
  const clientUser = await db.user.findUniqueOrThrow({ where: { email: TEST_USER.email } });
  const pet = await db.pet.create({
    data: { clientId: clientUser.id, name: 'Max', species: 'canina' },
  });
  const report = await db.symptomReport.create({
    data: { clientId: clientUser.id, petId: pet.id, symptom: 'Se rasca mucho', daysWithSymptom: 3 },
  });
  const staff = await loginTestStaff();
  return { clientToken: client.accessToken, staffToken: staff.accessToken, report };
}

const review = (token: string, id: string, body: object) =>
  request(app).put(`/api/v1/staff/symptom-reports/${id}`).set(auth(token)).send(body);

describe('HU-018 — Revisar reportes de síntomas', () => {
  // CA-018.1 — pendientes con mascota, cliente y descripción.
  it('lista solo los reportes pendientes con mascota, cliente y síntoma', async () => {
    const { staffToken, report } = await setup();
    await db.symptomReport.create({
      data: {
        clientId: report.clientId,
        petId: report.petId,
        symptom: 'Ya revisado',
        daysWithSymptom: 1,
        status: 'reviewed',
        recommendation: 'Ok',
      },
    });

    const res = await request(app).get('/api/v1/staff/symptom-reports').set(auth(staffToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        symptom: 'Se rasca mucho',
        pet: expect.objectContaining({ name: 'Max' }),
        client: expect.objectContaining({ firstName: TEST_USER.firstName }),
      }),
    );
  });

  // CA-018.2 — pasa a revisado y el cliente ve la recomendación.
  it('responder marca el reporte como revisado y el cliente ve la recomendación', async () => {
    const { staffToken, clientToken, report } = await setup();
    const res = await review(staffToken, report.id, { recommendation: '  Tráelo mañana  ' });
    const mine = await request(app).get('/api/v1/symptom-reports/me').set(auth(clientToken));
    const pending = await request(app).get('/api/v1/staff/symptom-reports').set(auth(staffToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({ status: 'reviewed', recommendation: 'Tráelo mañana' }),
    );
    expect(mine.body.data[0].recommendation).toBe('Tráelo mañana');
    expect(pending.body.data).toEqual([]);
  });

  // CA-018.3 — el bug: una recomendación de solo espacios pasaba.
  it.each([{}, { recommendation: '' }, { recommendation: '     ' }])(
    'responde 422 si la recomendación falta o está vacía (%o)',
    async (body) => {
      const { staffToken, report } = await setup();
      const res = await review(staffToken, report.id, body);

      expect(res.status).toBe(422);
      expect(messagesOf(res.body)).toContain('Escribe la recomendación para el cliente.');
      const stored = await db.symptomReport.findUniqueOrThrow({ where: { id: report.id } });
      expect(stored.status).toBe('pending');
    },
  );

  it('un reporte ya revisado no se puede volver a responder', async () => {
    const { staffToken, report } = await setup();
    await review(staffToken, report.id, { recommendation: 'Primera' });
    const res = await review(staffToken, report.id, { recommendation: 'Segunda' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('REPORT_ALREADY_REVIEWED');
    const stored = await db.symptomReport.findUniqueOrThrow({ where: { id: report.id } });
    expect(stored.recommendation).toBe('Primera');
  });

  // ¿Qué? El bug: dos revisiones a la vez — la segunda pisaba la primera.
  it('con 5 revisiones simultáneas solo una se guarda', async () => {
    const { report } = await setup();
    const results = await Promise.allSettled(
      [1, 2, 3, 4, 5].map((i) => reviewReport(report.id, { recommendation: `Recomendación ${i}` })),
    );

    const ok = results.filter((r) => r.status === 'fulfilled');
    expect(ok).toHaveLength(1);
    const stored = await db.symptomReport.findUniqueOrThrow({ where: { id: report.id } });
    expect(stored.recommendation).toBe(
      (ok[0] as PromiseFulfilledResult<{ recommendation: string }>).value.recommendation,
    );
  });

  it('un cliente no puede ver la bandeja ni responder reportes', async () => {
    const { clientToken, report } = await setup();
    const list = await request(app).get('/api/v1/staff/symptom-reports').set(auth(clientToken));
    const res = await review(clientToken, report.id, { recommendation: 'Hola' });

    expect([list.status, res.status]).toEqual([403, 403]);
  });
});
