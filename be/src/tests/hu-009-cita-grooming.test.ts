/**
 * Archivo: tests/hu-009-cita-grooming.test.ts
 * Descripción: Tests de aceptación de la HU-009 (Agendar cita de grooming) — RF-009.
 * ¿Para qué? Verificar fecha mínima (CA-009.3), horario de atención (CA-009.4), estado
 *   inicial pendiente (CA-009.5) y "Mis citas" con nombres y estados (CA-009.6).
 * ¿Impacto? Si fallan, un cliente podría agendar fuera de horario o no poder agendar mañana.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { addDays, todayInBusinessTimezone } from '../utils/dates.js';
import { loginTestUser, TEST_USER } from './helpers.js';

// ¿Qué? Cliente con sesión iniciada, una mascota suya y un servicio activo.
async function setup() {
  const { accessToken } = await loginTestUser();
  const client = await db.user.findUniqueOrThrow({ where: { email: TEST_USER.email } });
  const pet = await db.pet.create({
    data: { clientId: client.id, name: 'Max', species: 'canina' },
  });
  const service = await db.service.create({
    data: { name: 'Baño completo', price: 40000, durationMinutes: 60 },
  });
  return { accessToken, client, pet, service };
}

const book = (token: string, body: object) =>
  request(app).post('/api/v1/appointments').set('Authorization', `Bearer ${token}`).send(body);

const tomorrow = () => addDays(todayInBusinessTimezone(), 1);

afterEach(() => {
  vi.useRealTimers();
});

describe('HU-009 — Agendar cita de grooming', () => {
  // CA-009.5 / RN-095 — toda cita nace pendiente.
  it('agenda una cita para mañana y queda en estado pendiente', async () => {
    const { accessToken, pet, service } = await setup();
    const res = await book(accessToken, {
      petId: pet.id,
      serviceId: service.id,
      date: tomorrow(),
      time: '10:30',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.totalPrice).toBe(40000);
  });

  // CA-009.3 — hoy no se permite.
  it('rechaza una cita para hoy con el mensaje de la HU', async () => {
    const { accessToken, pet, service } = await setup();
    const res = await book(accessToken, {
      petId: pet.id,
      serviceId: service.id,
      date: todayInBusinessTimezone(),
      time: '10:30',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('DATE_TOO_SOON');
    expect(res.body.error.message).toBe('La cita debe ser a partir de mañana.');
  });

  // CA-009.3 — el bug de UTC: a las 7:30 p.m. de Colombia ya es el día siguiente en UTC.
  it('a las 7:30 p.m. hora Colombia permite agendar para el día siguiente', async () => {
    const { accessToken, pet, service } = await setup();
    // ¿Qué? Solo se congela Date; los timers reales siguen para la BD y bcrypt.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-20T00:30:00.000Z')); // 19-oct 19:30 en Bogotá

    const res = await book(accessToken, {
      petId: pet.id,
      serviceId: service.id,
      date: '2026-10-20',
      time: '09:00',
    });

    expect(res.status).toBe(201);
  });

  // CA-009.4 — fuera del horario de atención.
  it.each(['08:59', '18:01', '20:00'])('rechaza la hora %s fuera del horario', async (time) => {
    const { accessToken, pet, service } = await setup();
    const res = await book(accessToken, {
      petId: pet.id,
      serviceId: service.id,
      date: tomorrow(),
      time,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('La hora debe estar entre las 9:00am y las 6:00pm.');
  });

  it.each(['09:00', '18:00'])('acepta la hora límite %s', async (time) => {
    const { accessToken, pet, service } = await setup();
    const res = await book(accessToken, {
      petId: pet.id,
      serviceId: service.id,
      date: tomorrow(),
      time,
    });

    expect(res.status).toBe(201);
  });

  // RN-091 — no se puede usar la mascota de otro cliente.
  it('responde 403 si la mascota es de otro cliente', async () => {
    const { accessToken, service } = await setup();
    const other = await db.user.create({
      data: {
        firstName: 'Otra',
        lastName: 'Persona',
        email: 'otra@groomingspa.com',
        hashedPassword: 'x',
        role: 'client',
      },
    });
    const otherPet = await db.pet.create({
      data: { clientId: other.id, name: 'Luna', species: 'felina' },
    });
    const res = await book(accessToken, {
      petId: otherPet.id,
      serviceId: service.id,
      date: tomorrow(),
      time: '10:00',
    });

    expect(res.status).toBe(403);
  });

  // RN-094 — servicio inactivo.
  it('responde 404 si el servicio está inactivo', async () => {
    const { accessToken, pet, service } = await setup();
    await db.service.update({ where: { id: service.id }, data: { active: false } });
    const res = await book(accessToken, {
      petId: pet.id,
      serviceId: service.id,
      date: tomorrow(),
      time: '10:00',
    });

    expect(res.status).toBe(404);
  });

  // CA-009.6 — "Mis citas" trae nombres y estado, aunque el servicio se haya desactivado.
  it('"Mis citas" incluye mascota, servicio y estado aunque el servicio ya no esté activo', async () => {
    const { accessToken, pet, service } = await setup();
    await book(accessToken, { petId: pet.id, serviceId: service.id, date: tomorrow(), time: '11:00' });
    await db.service.update({ where: { id: service.id }, data: { active: false } });

    const res = await request(app)
      .get('/api/v1/appointments/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        status: 'pending',
        pet: { id: pet.id, name: 'Max' },
        service: { id: service.id, name: 'Baño completo' },
      }),
    );
  });
});
