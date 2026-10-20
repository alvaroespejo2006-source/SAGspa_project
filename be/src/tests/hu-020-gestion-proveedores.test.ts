/**
 * Archivo: tests/hu-020-gestion-proveedores.test.ts
 * Descripción: Tests de aceptación de la HU-020 (Gestión de proveedores) — RF-020.
 * ¿Para qué? Verificar crear (CA-020.1), editar los datos de contacto (CA-020.2) y desactivar
 *   en vez de borrar cuando tiene pedidos (CA-020.3).
 * ¿Impacto? Si fallan, el staff no sabría a quién pedirle reabastecimiento.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { loginTestStaff, loginTestUser } from './helpers.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const SUPPLIER = {
  name: 'Distribuidora PetCol',
  contactName: 'Laura Gómez',
  phone: '601 555 1234',
  email: 'ventas@petcol.com',
};

function messagesOf(body: { error: { message: string } }): string[] {
  return (JSON.parse(body.error.message) as { message: string }[]).map((d) => d.message);
}

describe('HU-020 — Gestión de proveedores', () => {
  // CA-020.1 — crear y aparece en el listado.
  it('crea un proveedor y aparece en el listado', async () => {
    const { accessToken } = await loginTestStaff();
    const created = await request(app)
      .post('/api/v1/suppliers')
      .set(auth(accessToken))
      .send(SUPPLIER);
    const list = await request(app).get('/api/v1/suppliers').set(auth(accessToken));

    expect(created.status).toBe(201);
    expect(list.body.data).toEqual([expect.objectContaining({ ...SUPPLIER, active: true })]);
  });

  it('normaliza el correo con espacios y mayúsculas y acepta campos opcionales vacíos', async () => {
    const { accessToken } = await loginTestStaff();
    const res = await request(app)
      .post('/api/v1/suppliers')
      .set(auth(accessToken))
      .send({ name: 'PetCol', email: '  VENTAS@PetCol.com ', phone: '', address: '   ' });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(
      expect.objectContaining({ email: 'ventas@petcol.com', phone: null, address: null }),
    );
  });

  // CA-020.2 — editar datos de contacto, y poder borrar uno.
  it('edita los datos de contacto y un campo vacío lo borra', async () => {
    const { accessToken } = await loginTestStaff();
    const supplier = await db.supplier.create({ data: SUPPLIER });
    const res = await request(app)
      .put(`/api/v1/suppliers/${supplier.id}`)
      .set(auth(accessToken))
      .send({ phone: '+57 300 123 4567', email: '' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        phone: '+57 300 123 4567',
        email: null,
        contactName: 'Laura Gómez',
      }),
    );
  });

  // CA-020.3 — con pedidos se desactiva; sin pedidos se borra.
  it('eliminar un proveedor con pedidos lo desactiva y lo explica', async () => {
    const { accessToken } = await loginTestStaff();
    const supplier = await db.supplier.create({ data: SUPPLIER });
    await db.supplierOrder.create({ data: { supplierId: supplier.id } });

    const res = await request(app)
      .delete(`/api/v1/suppliers/${supplier.id}`)
      .set(auth(accessToken));
    const stored = await db.supplier.findUniqueOrThrow({ where: { id: supplier.id } });

    expect(res.body.data.softDeleted).toBe(true);
    expect(res.body.message).toBe(
      'El proveedor tiene pedidos asociados, así que se desactivó en lugar de eliminarse.',
    );
    expect(stored.active).toBe(false);
  });

  it('eliminar un proveedor sin pedidos lo borra', async () => {
    const { accessToken } = await loginTestStaff();
    const supplier = await db.supplier.create({ data: SUPPLIER });
    const res = await request(app)
      .delete(`/api/v1/suppliers/${supplier.id}`)
      .set(auth(accessToken));

    expect(res.body.message).toBe('Proveedor eliminado.');
    expect(await db.supplier.count()).toBe(0);
  });

  it('responde 422 con nombre de espacios, teléfono con letras y correo inválido', async () => {
    const { accessToken } = await loginTestStaff();
    const res = await request(app)
      .post('/api/v1/suppliers')
      .set(auth(accessToken))
      .send({ name: '   ', phone: 'llamar', email: 'ventas@' });

    expect(res.status).toBe(422);
    expect(messagesOf(res.body)).toEqual(
      expect.arrayContaining([
        'El nombre del proveedor debe tener al menos 2 caracteres.',
        'El teléfono solo puede tener números, espacios, +, - y paréntesis (7 a 20).',
        'El correo no tiene un formato válido.',
      ]),
    );
  });

  it('un cliente no puede ver ni gestionar proveedores', async () => {
    const { accessToken } = await loginTestUser();
    const list = await request(app).get('/api/v1/suppliers').set(auth(accessToken));
    const create = await request(app)
      .post('/api/v1/suppliers')
      .set(auth(accessToken))
      .send(SUPPLIER);

    expect([list.status, create.status]).toEqual([403, 403]);
  });
});
