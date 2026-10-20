/**
 * Archivo: tests/hu-011-emergencia.test.ts
 * Descripción: Tests de aceptación de la HU-011 (Emergencia — veterinarias cercanas) — RF-011.
 * ¿Para qué? Verificar que la información es pública (CA-011.1), que siempre hay una clínica
 *   24 h y la línea de emergencias (CA-011.3) y que solo el staff la edita (CA-011.4).
 * ¿Impacto? Si fallan, un cliente en una emergencia podría no encontrar a quién llamar.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { loginTestStaff, loginTestUser } from './helpers.js';

const VALID = {
  searchQuery: 'veterinarias 24 horas cerca de Calle 10, Bogotá',
  emergencyPhones: [
    {
      label: 'Clínica Veterinaria Central',
      phone: '601 555 1234',
      category: 'clinica_24h',
    },
    {
      label: 'Línea de emergencias 123',
      phone: '123',
      category: 'linea_emergencia',
    },
  ],
};

const save = (token: string, body: object) =>
  request(app).put('/api/v1/emergency-info').set('Authorization', `Bearer ${token}`).send(body);

function messagesOf(body: { error: { message: string } }): string[] {
  return (JSON.parse(body.error.message) as { message: string }[]).map((d) => d.message);
}

describe('HU-011 — Emergencia', () => {
  // CA-011.1 / RN-110 — se consulta sin iniciar sesión ni llenar nada.
  it('la información es pública y trae valores por defecto si nadie la configuró', async () => {
    const res = await request(app).get('/api/v1/emergency-info');

    expect(res.status).toBe(200);
    expect(res.body.data.configured).toBe(false);
    expect(res.body.data.emergencyPhones).toContainEqual(
      expect.objectContaining({ phone: '123', category: 'linea_emergencia' }),
    );
  });

  // CA-011.4 — el staff edita y el cliente ve los cambios.
  it('el staff guarda los números y el GET público los devuelve', async () => {
    const { accessToken } = await loginTestStaff();
    const saved = await save(accessToken, VALID);
    const res = await request(app).get('/api/v1/emergency-info');

    expect(saved.status).toBe(200);
    expect(res.body.data).toEqual({ ...VALID, configured: true });
  });

  // CA-011.4 — un cliente no puede editar.
  it('responde 403 si un cliente intenta editar', async () => {
    const { accessToken } = await loginTestUser();
    const res = await save(accessToken, VALID);

    expect(res.status).toBe(403);
  });

  it('responde 401 si se intenta editar sin sesión', async () => {
    const res = await request(app).put('/api/v1/emergency-info').send(VALID);

    expect(res.status).toBe(401);
  });

  // CA-011.3 — siempre una clínica 24 h.
  it('rechaza guardar sin una clínica veterinaria 24 horas', async () => {
    const { accessToken } = await loginTestStaff();
    const res = await save(accessToken, {
      ...VALID,
      emergencyPhones: [VALID.emergencyPhones[1]],
    });

    expect(res.status).toBe(422);
    expect(messagesOf(res.body)).toContain('Agrega al menos una clínica veterinaria 24 horas.');
  });

  // CA-011.3 — siempre la línea de emergencias animales.
  it('rechaza guardar sin la línea de emergencias animales', async () => {
    const { accessToken } = await loginTestStaff();
    const res = await save(accessToken, {
      ...VALID,
      emergencyPhones: [VALID.emergencyPhones[0]],
    });

    expect(res.status).toBe(422);
    expect(messagesOf(res.body)).toContain('Agrega la línea de emergencias animales.');
  });

  it('rechaza un teléfono con letras', async () => {
    const { accessToken } = await loginTestStaff();
    const res = await save(accessToken, {
      ...VALID,
      emergencyPhones: [
        { ...VALID.emergencyPhones[0], phone: 'llamar ya' },
        VALID.emergencyPhones[1],
      ],
    });

    expect(res.status).toBe(422);
    expect(messagesOf(res.body)).toContain(
      'El teléfono solo puede tener números, espacios, +, - y paréntesis.',
    );
  });

  // ¿Qué? Datos guardados antes de HU-011 (sin `category`) siguen funcionando.
  it('los números guardados sin categoría se devuelven como "otro"', async () => {
    await db.setting.create({
      data: {
        key: 'emergency_info',
        value: {
          searchQuery: 'veterinarias',
          emergencyPhones: [{ label: 'Vieja', phone: '555' }],
        },
      },
    });
    const res = await request(app).get('/api/v1/emergency-info');

    expect(res.body.data.emergencyPhones).toEqual([
      { label: 'Vieja', phone: '555', category: 'otro' },
    ]);
  });
});
