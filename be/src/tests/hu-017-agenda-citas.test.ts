/**
 * Archivo: tests/hu-017-agenda-citas.test.ts
 * Descripción: Tests de aceptación de la HU-017 (Agenda del día) — RF-017.
 * ¿Para qué? Verificar la agenda del día ordenada por hora (CA-017.1), el cambio de fecha
 *   (CA-017.2), confirmar y atender (CA-017.3, CA-017.4) y el día sin citas (CA-017.5).
 * ¿Impacto? Si fallan, el staff no sabría a quién atender ni el cliente vería su cita confirmada.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { loginTestStaff, loginTestUser, TEST_USER } from './helpers.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// ¿Qué? Un cliente con mascota y un servicio, y una función para crearle citas por fecha y hora.
async function setup() {
  const client = await loginTestUser();
  const clientUser = await db.user.findUniqueOrThrow({ where: { email: TEST_USER.email } });
  const pet = await db.pet.create({
    data: { clientId: clientUser.id, name: 'Max', species: 'canina' },
  });
  const service = await db.service.create({
    data: { name: 'Baño completo', price: 40000, durationMinutes: 60 },
  });
  const staff = await loginTestStaff();
  const book = (date: string, time: string) =>
    db.appointment.create({
      data: {
        clientId: clientUser.id,
        petId: pet.id,
        serviceId: service.id,
        date: new Date(`${date}T00:00:00.000Z`),
        time,
      },
    });
  return { clientToken: client.accessToken, staffToken: staff.accessToken, book };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('HU-017 — Agenda del día', () => {
  // CA-017.1 — ordenadas por hora, con mascota, cliente, servicio y estado.
  it('lista las citas de la fecha ordenadas por hora con todos sus datos', async () => {
    const { staffToken, book } = await setup();
    await book('2030-05-10', '15:00');
    await book('2030-05-10', '09:30');
    await book('2030-05-11', '10:00');

    const res = await request(app)
      .get('/api/v1/staff/agenda?date=2030-05-10')
      .set(auth(staffToken));

    expect(res.status).toBe(200);
    expect(res.body.data.map((a: { time: string }) => a.time)).toEqual(['09:30', '15:00']);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        status: 'pending',
        pet: expect.objectContaining({ name: 'Max' }),
        client: expect.objectContaining({ firstName: TEST_USER.firstName }),
        service: expect.objectContaining({ name: 'Baño completo' }),
      }),
    );
  });

  // CA-017.1 — el bug de UTC: a las 7:30 p.m. de Colombia "hoy" sigue siendo hoy.
  it('sin fecha, a las 7:30 p.m. hora Colombia muestra las citas de ese mismo día', async () => {
    const { staffToken, book } = await setup();
    await book('2026-10-19', '10:00'); // hoy en Colombia
    await book('2026-10-20', '11:00'); // "hoy" en UTC
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-20T00:30:00.000Z')); // 19-oct 19:30 en Bogotá

    const res = await request(app).get('/api/v1/staff/agenda').set(auth(staffToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].time).toBe('10:00');
  });

  // CA-017.5 — día sin citas.
  it('devuelve una lista vacía si no hay citas ese día', async () => {
    const { staffToken } = await setup();
    const res = await request(app)
      .get('/api/v1/staff/agenda?date=2030-01-01')
      .set(auth(staffToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  // CA-017.3 / CA-017.4 — confirmar, el cliente lo ve, y luego atender.
  it('confirmar y luego atender cambia el estado y el cliente lo ve en "Mis citas"', async () => {
    const { staffToken, clientToken, book } = await setup();
    const appt = await book('2030-05-10', '10:00');

    const confirmed = await request(app)
      .put(`/api/v1/appointments/${appt.id}`)
      .set(auth(staffToken))
      .send({ status: 'confirmed' });
    const mine = await request(app).get('/api/v1/appointments/me').set(auth(clientToken));
    const completed = await request(app)
      .put(`/api/v1/appointments/${appt.id}`)
      .set(auth(staffToken))
      .send({ status: 'completed' });

    expect(confirmed.body.data.status).toBe('confirmed');
    expect(mine.body.data[0].status).toBe('confirmed');
    expect(completed.body.data.status).toBe('completed');
  });

  // RN-173 — un estado final no se mueve, con mensaje en español.
  it('una cita atendida no se puede modificar y el mensaje está en español', async () => {
    const { staffToken, book } = await setup();
    const appt = await book('2030-05-10', '10:00');
    await db.appointment.update({ where: { id: appt.id }, data: { status: 'completed' } });

    const res = await request(app)
      .put(`/api/v1/appointments/${appt.id}`)
      .set(auth(staffToken))
      .send({ status: 'cancelled' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('APPOINTMENT_FINAL_STATE');
    expect(res.body.error.message).toBe('Esta cita ya está atendida y no se puede modificar.');
  });

  it('responde 422 con una fecha mal escrita y 403 a un cliente', async () => {
    const { staffToken, clientToken } = await setup();
    const bad = await request(app)
      .get('/api/v1/staff/agenda?date=10-05-2030')
      .set(auth(staffToken));
    const client = await request(app).get('/api/v1/staff/agenda').set(auth(clientToken));

    expect(bad.status).toBe(422);
    expect(client.status).toBe(403);
  });
});
