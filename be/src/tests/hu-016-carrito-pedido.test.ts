/**
 * Archivo: tests/hu-016-carrito-pedido.test.ts
 * Descripción: Tests de aceptación de la HU-016 (Carrito y pedido) — RF-016.
 * ¿Para qué? Verificar que confirmar un pedido reserva el stock y calcula el total (CA-016.3),
 *   que nunca se vende más de lo que hay — ni con pedidos simultáneos (CA-016.4) — y que el
 *   cliente ve el estado de sus pedidos (CA-016.5).
 * ¿Impacto? Si fallan, la tienda podría apartar productos que ya no existen.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { createOrder } from '../modules/orders/orders.service.js';
import { loginTestStaff, loginTestUser } from './helpers.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const order = (token: string, items: { productId: string; quantity: number }[]) =>
  request(app).post('/api/v1/orders').set(auth(token)).send({ items });

describe('HU-016 — Carrito y pedido', () => {
  // CA-016.3 — el pedido queda registrado, con el total del servidor y el stock reservado.
  it('confirma el pedido, calcula el total y descuenta el stock', async () => {
    const { accessToken } = await loginTestUser();
    const toy = await db.product.create({ data: { name: 'Pelota', price: 12000, stock: 5 } });
    const leash = await db.product.create({ data: { name: 'Correa', price: 30000, stock: 2 } });

    const res = await order(accessToken, [
      { productId: toy.id, quantity: 2 },
      { productId: leash.id, quantity: 1 },
    ]);

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(
      expect.objectContaining({ status: 'pending', paymentStatus: 'unpaid', total: 54000 }),
    );
    expect((await db.product.findUniqueOrThrow({ where: { id: toy.id } })).stock).toBe(3);
    expect((await db.product.findUniqueOrThrow({ where: { id: leash.id } })).stock).toBe(1);
  });

  // CA-016.4 — el mensaje nombra el producto y cuántas quedan; no se aparta nada.
  it('rechaza el pedido si no alcanza el stock, nombrando el producto', async () => {
    const { accessToken } = await loginTestUser();
    const toy = await db.product.create({ data: { name: 'Pelota', price: 12000, stock: 5 } });
    const leash = await db.product.create({ data: { name: 'Correa', price: 30000, stock: 1 } });

    const res = await order(accessToken, [
      { productId: toy.id, quantity: 1 },
      { productId: leash.id, quantity: 3 },
    ]);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('OUT_OF_STOCK');
    expect(res.body.error.message).toBe(
      'Solo quedan 1 unidades de "Correa". Ajusta la cantidad en tu carrito.',
    );
    // ¿Qué? La transacción se revierte: la pelota tampoco se descontó.
    expect((await db.product.findUniqueOrThrow({ where: { id: toy.id } })).stock).toBe(5);
    expect(await db.order.count()).toBe(0);
  });

  it('dice "se agotó" si ya no queda ninguna unidad', async () => {
    const { accessToken } = await loginTestUser();
    const toy = await db.product.create({ data: { name: 'Pelota', price: 12000, stock: 0 } });
    const res = await order(accessToken, [{ productId: toy.id, quantity: 1 }]);

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('"Pelota" se agotó. Quítalo del carrito para continuar.');
  });

  // CA-016.4 — el bug: varios pedidos a la vez por la última unidad.
  // ¿Qué? Se llama al service directamente (sin HTTP) para que las transacciones de verdad se
  //   solapen. Con el código anterior (leer stock y luego descontar) los 5 pedidos se
  //   confirmaban y el stock quedaba en -4.
  it('con 5 pedidos simultáneos por la última unidad, solo uno se confirma', async () => {
    const clients = await Promise.all(
      [1, 2, 3, 4, 5].map((i) =>
        db.user.create({
          data: {
            firstName: 'Cliente',
            lastName: `${i}`,
            email: `cliente${i}@spa.com`,
            hashedPassword: 'x',
            role: 'client',
          },
        }),
      ),
    );
    const toy = await db.product.create({ data: { name: 'Pelota', price: 12000, stock: 1 } });

    const results = await Promise.allSettled(
      clients.map((c) => createOrder(c.id, { items: [{ productId: toy.id, quantity: 1 }] })),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await db.product.findUniqueOrThrow({ where: { id: toy.id } })).stock).toBe(0);
    expect(await db.order.count()).toBe(1);
  });

  it('suma las líneas repetidas del mismo producto antes de validar el stock', async () => {
    const { accessToken } = await loginTestUser();
    const toy = await db.product.create({ data: { name: 'Pelota', price: 12000, stock: 2 } });
    const res = await order(accessToken, [
      { productId: toy.id, quantity: 2 },
      { productId: toy.id, quantity: 1 },
    ]);

    expect(res.status).toBe(409);
    expect((await db.product.findUniqueOrThrow({ where: { id: toy.id } })).stock).toBe(2);
  });

  it('un producto desactivado responde PRODUCT_UNAVAILABLE con su nombre', async () => {
    const { accessToken } = await loginTestUser();
    const toy = await db.product.create({
      data: { name: 'Pelota', price: 12000, stock: 5, active: false },
    });
    const res = await order(accessToken, [{ productId: toy.id, quantity: 1 }]);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_UNAVAILABLE');
    expect(res.body.error.message).toMatch(/^"Pelota" ya no está disponible/);
  });

  it('responde 422 con un carrito vacío o más de 99 unidades', async () => {
    const { accessToken } = await loginTestUser();
    const toy = await db.product.create({ data: { name: 'Pelota', price: 12000, stock: 500 } });

    expect((await order(accessToken, [])).status).toBe(422);
    expect((await order(accessToken, [{ productId: toy.id, quantity: 100 }])).status).toBe(422);
  });

  // CA-016.5 — "Mis pedidos" con el estado de cada uno.
  it('"Mis pedidos" muestra pendiente, completado y cancelado', async () => {
    const { accessToken } = await loginTestUser();
    const toy = await db.product.create({ data: { name: 'Pelota', price: 12000, stock: 10 } });
    const a = await order(accessToken, [{ productId: toy.id, quantity: 1 }]);
    const b = await order(accessToken, [{ productId: toy.id, quantity: 1 }]);
    await order(accessToken, [{ productId: toy.id, quantity: 1 }]);
    const { accessToken: staff } = await loginTestStaff();
    await request(app)
      .put(`/api/v1/staff/orders/${a.body.data.id}`)
      .set(auth(staff))
      .send({ status: 'completed' });
    await request(app)
      .put(`/api/v1/staff/orders/${b.body.data.id}`)
      .set(auth(staff))
      .send({ status: 'cancelled' });

    const mine = await request(app).get('/api/v1/orders/me').set(auth(accessToken));

    expect(mine.status).toBe(200);
    expect(mine.body.data.map((o: { status: string }) => o.status).sort()).toEqual([
      'cancelled',
      'completed',
      'pending',
    ]);
    expect(mine.body.data[0].items[0]).toEqual(
      expect.objectContaining({ name: 'Pelota', quantity: 1, unitPrice: 12000 }),
    );
  });
});
