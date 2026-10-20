/**
 * Archivo: tests/hu-015-catalogo-productos.test.ts
 * Descripción: Tests de aceptación de la HU-015 (Catálogo de productos) — RF-015.
 * ¿Para qué? Verificar el catálogo público con nombre, precio y categoría (CA-015.1), que un
 *   producto sin stock no se pueda pedir (CA-015.2) y la gestión del staff (CA-015.3).
 * ¿Impacto? Si fallan, el cliente vería productos inactivos o podría pedir algo agotado.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { loginTestStaff, loginTestUser } from './helpers.js';

const TOY = { name: 'Pelota', price: 12000, stock: 5, category: 'Juguetes' };

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const publicCatalog = () => request(app).get('/api/v1/products');

function messagesOf(body: { error: { message: string } }): string[] {
  return (JSON.parse(body.error.message) as { message: string }[]).map((d) => d.message);
}

describe('HU-015 — Catálogo de productos', () => {
  // CA-015.1 — catálogo público solo con activos, con nombre, precio y categoría.
  it('el catálogo público muestra los productos activos con precio y categoría', async () => {
    await db.product.create({ data: TOY });
    await db.product.create({ data: { ...TOY, name: 'Correa vieja', active: false } });
    const res = await publicCatalog();

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({ name: 'Pelota', price: 12000, category: 'Juguetes', stock: 5 }),
    ]);
  });

  // CA-015.2 — un producto con stock 0 no se puede pedir.
  it('un producto agotado sigue en el catálogo pero no se puede pedir', async () => {
    const product = await db.product.create({ data: { ...TOY, stock: 0 } });
    const { accessToken } = await loginTestUser();

    const catalog = await publicCatalog();
    const order = await request(app)
      .post('/api/v1/orders')
      .set(auth(accessToken))
      .send({ items: [{ productId: product.id, quantity: 1 }] });

    expect(catalog.body.data[0].stock).toBe(0);
    expect(order.status).toBe(409);
  });

  // CA-015.3 — el staff crea y edita precio y stock.
  it('el staff crea un producto y edita su precio y stock', async () => {
    const { accessToken } = await loginTestStaff();
    const created = await request(app).post('/api/v1/products').set(auth(accessToken)).send(TOY);
    const edited = await request(app)
      .put(`/api/v1/products/${created.body.data.id}`)
      .set(auth(accessToken))
      .send({ price: 15000, stock: 0 });
    const catalog = await publicCatalog();

    expect(created.status).toBe(201);
    expect(edited.status).toBe(200);
    expect(catalog.body.data[0]).toEqual(expect.objectContaining({ price: 15000, stock: 0 }));
  });

  // CA-015.3 — desactivar en vez de borrar si tiene historial.
  it('eliminar un producto con pedidos lo desactiva y lo explica', async () => {
    const product = await db.product.create({ data: TOY });
    const { accessToken: clientToken } = await loginTestUser();
    await request(app)
      .post('/api/v1/orders')
      .set(auth(clientToken))
      .send({ items: [{ productId: product.id, quantity: 1 }] });
    const { accessToken } = await loginTestStaff();

    const res = await request(app).delete(`/api/v1/products/${product.id}`).set(auth(accessToken));

    expect(res.body.data.softDeleted).toBe(true);
    expect(res.body.message).toBe(
      'El producto tiene pedidos o ventas asociadas, así que se desactivó en lugar de eliminarse.',
    );
    expect((await publicCatalog()).body.data).toEqual([]);
  });

  it('eliminar un producto sin historial lo borra', async () => {
    const product = await db.product.create({ data: TOY });
    const { accessToken } = await loginTestStaff();
    const res = await request(app).delete(`/api/v1/products/${product.id}`).set(auth(accessToken));

    expect(res.body.message).toBe('Producto eliminado.');
    expect(await db.product.count()).toBe(0);
  });

  // ¿Qué? Los mismos bugs que tenía el catálogo de servicios.
  it('responde 422 con un nombre de solo espacios y con un precio fuera de rango', async () => {
    const { accessToken } = await loginTestStaff();
    const blank = await request(app)
      .post('/api/v1/products')
      .set(auth(accessToken))
      .send({ ...TOY, name: '   ' });
    const huge = await request(app)
      .post('/api/v1/products')
      .set(auth(accessToken))
      .send({ ...TOY, price: 1_000_000_000 });

    expect(blank.status).toBe(422);
    expect(messagesOf(blank.body)).toContain(
      'El nombre del producto debe tener al menos 2 caracteres.',
    );
    expect(huge.status).toBe(422);
  });

  it('al editar, los errores de stock están en español', async () => {
    const product = await db.product.create({ data: TOY });
    const { accessToken } = await loginTestStaff();
    const res = await request(app)
      .put(`/api/v1/products/${product.id}`)
      .set(auth(accessToken))
      .send({ stock: -1 });

    expect(res.status).toBe(422);
    expect(messagesOf(res.body)).toContain('El stock no puede ser negativo.');
  });

  it('una categoría vacía se guarda como sin categoría', async () => {
    const { accessToken } = await loginTestStaff();
    const res = await request(app)
      .post('/api/v1/products')
      .set(auth(accessToken))
      .send({ ...TOY, category: '   ' });

    expect(res.status).toBe(201);
    expect(res.body.data.category).toBeNull();
  });

  it('un cliente no puede gestionar productos', async () => {
    const { accessToken } = await loginTestUser();
    const res = await request(app).post('/api/v1/products').set(auth(accessToken)).send(TOY);

    expect(res.status).toBe(403);
  });
});
