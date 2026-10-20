/**
 * Archivo: tests/hu-014-catalogo-servicios.test.ts
 * Descripción: Tests de aceptación de la HU-014 (Gestión del catálogo de servicios) — RF-014.
 * ¿Para qué? Verificar crear (CA-014.1), editar precio (CA-014.2), desactivar en vez de borrar
 *   cuando hay citas (CA-014.3) y que el cliente solo vea los activos (CA-014.4).
 * ¿Impacto? Si fallan, los clientes verían precios viejos o servicios que ya no se ofrecen.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { loginTestStaff, loginTestUser, TEST_USER } from './helpers.js';

const BATH = { name: 'Baño completo', price: 40000, durationMinutes: 60 };

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const publicCatalog = () => request(app).get('/api/v1/services');

function messagesOf(body: { error: { message: string } }): string[] {
  return (JSON.parse(body.error.message) as { message: string }[]).map((d) => d.message);
}

describe('HU-014 — Catálogo de servicios', () => {
  // CA-014.1 — el servicio creado queda disponible para el cliente.
  it('el staff crea un servicio y aparece en el catálogo público', async () => {
    const { accessToken } = await loginTestStaff();
    const created = await request(app).post('/api/v1/services').set(auth(accessToken)).send(BATH);
    const catalog = await publicCatalog();

    expect(created.status).toBe(201);
    expect(catalog.body.data).toEqual([
      expect.objectContaining({ name: 'Baño completo', price: 40000, active: true }),
    ]);
  });

  // CA-014.2 — el precio editado se ve de inmediato.
  it('al editar el precio, el catálogo público muestra el nuevo', async () => {
    const { accessToken } = await loginTestStaff();
    const created = await request(app).post('/api/v1/services').set(auth(accessToken)).send(BATH);
    const edited = await request(app)
      .put(`/api/v1/services/${created.body.data.id}`)
      .set(auth(accessToken))
      .send({ price: 45000 });
    const catalog = await publicCatalog();

    expect(edited.status).toBe(200);
    expect(catalog.body.data[0].price).toBe(45000);
  });

  // CA-014.3 — con citas se desactiva; sin citas se borra.
  it('eliminar un servicio con citas lo desactiva y lo explica', async () => {
    const { accessToken: staffToken } = await loginTestStaff();
    await loginTestUser();
    const client = await db.user.findUniqueOrThrow({ where: { email: TEST_USER.email } });
    const pet = await db.pet.create({
      data: { clientId: client.id, name: 'Max', species: 'canina' },
    });
    const service = await db.service.create({ data: BATH });
    await db.appointment.create({
      data: {
        clientId: client.id,
        petId: pet.id,
        serviceId: service.id,
        date: new Date('2030-01-10T00:00:00.000Z'),
        time: '10:00',
      },
    });

    const res = await request(app).delete(`/api/v1/services/${service.id}`).set(auth(staffToken));
    const stored = await db.service.findUniqueOrThrow({ where: { id: service.id } });
    const catalog = await publicCatalog();

    expect(res.status).toBe(200);
    expect(res.body.data.softDeleted).toBe(true);
    expect(res.body.message).toBe(
      'El servicio tiene citas asociadas, así que se desactivó en lugar de eliminarse.',
    );
    expect(stored.active).toBe(false);
    expect(catalog.body.data).toEqual([]);
  });

  it('eliminar un servicio sin citas lo borra', async () => {
    const { accessToken } = await loginTestStaff();
    const service = await db.service.create({ data: BATH });
    const res = await request(app).delete(`/api/v1/services/${service.id}`).set(auth(accessToken));

    expect(res.body).toEqual(
      expect.objectContaining({ message: 'Servicio eliminado.', data: { softDeleted: false } }),
    );
    expect(await db.service.count()).toBe(0);
  });

  // CA-014.4 — el cliente solo ve los activos; el staff ve todos.
  it('el catálogo público solo muestra activos y el del staff incluye inactivos', async () => {
    const { accessToken } = await loginTestStaff();
    await db.service.create({ data: BATH });
    await db.service.create({ data: { ...BATH, name: 'Corte antiguo', active: false } });

    const catalog = await publicCatalog();
    const staffList = await request(app)
      .get('/api/v1/services/staff?active=false')
      .set(auth(accessToken));

    expect(catalog.body.data.map((s: { name: string }) => s.name)).toEqual(['Baño completo']);
    expect(staffList.body.data).toHaveLength(2);
  });

  // ¿Qué? El bug: un nombre de solo espacios pasaba como válido.
  it('responde 422 si el nombre son solo espacios', async () => {
    const { accessToken } = await loginTestStaff();
    const res = await request(app)
      .post('/api/v1/services')
      .set(auth(accessToken))
      .send({ ...BATH, name: '    ' });

    expect(res.status).toBe(422);
    expect(messagesOf(res.body)).toContain(
      'El nombre del servicio debe tener al menos 2 caracteres.',
    );
  });

  // ¿Qué? Antes un precio enorme hacía fallar la columna Decimal(10, 2) con 500.
  it('responde 422 (no 500) con un precio fuera de rango', async () => {
    const { accessToken } = await loginTestStaff();
    const res = await request(app)
      .post('/api/v1/services')
      .set(auth(accessToken))
      .send({ ...BATH, price: 1_000_000_000 });

    expect(res.status).toBe(422);
    expect(messagesOf(res.body)).toContain('Revisa el precio: es demasiado alto.');
  });

  it('al editar, los errores también están en español', async () => {
    const { accessToken } = await loginTestStaff();
    const service = await db.service.create({ data: BATH });
    const res = await request(app)
      .put(`/api/v1/services/${service.id}`)
      .set(auth(accessToken))
      .send({ price: -5, durationMinutes: 30.5 });

    expect(res.status).toBe(422);
    expect(messagesOf(res.body)).toEqual(
      expect.arrayContaining([
        'El precio debe ser mayor a 0.',
        'La duración debe ser un número entero de minutos.',
      ]),
    );
  });

  // Notas técnicas — solo el staff gestiona el catálogo.
  it('un cliente no puede crear, editar ni eliminar servicios', async () => {
    const { accessToken } = await loginTestUser();
    const service = await db.service.create({ data: BATH });
    const create = await request(app).post('/api/v1/services').set(auth(accessToken)).send(BATH);
    const edit = await request(app)
      .put(`/api/v1/services/${service.id}`)
      .set(auth(accessToken))
      .send({ price: 1 });
    const remove = await request(app)
      .delete(`/api/v1/services/${service.id}`)
      .set(auth(accessToken));

    expect([create.status, edit.status, remove.status]).toEqual([403, 403, 403]);
  });
});
