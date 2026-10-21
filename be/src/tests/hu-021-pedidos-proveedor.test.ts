/**
 * Archivo: tests/hu-021-pedidos-proveedor.test.ts
 * Descripción: Tests de aceptación de la HU-021 (Pedidos a proveedor) — RF-021.
 * ¿Para qué? Verificar crear el pedido en estado "pedido" (CA-021.1), que recibirlo sume el
 *   stock (CA-021.2) y que NUNCA se sume dos veces (CA-021.3).
 * ¿Impacto? Si fallan, el inventario mostraría unidades que nunca llegaron.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { receiveSupplierOrder } from '../modules/supplier-orders/supplier-orders.service.js';
import { loginTestStaff, loginTestUser } from './helpers.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function setup() {
  const { accessToken } = await loginTestStaff();
  const supplier = await db.supplier.create({ data: { name: 'PetCol' } });
  const toy = await db.product.create({ data: { name: 'Pelota', price: 12000, stock: 1 } });
  const leash = await db.product.create({ data: { name: 'Correa', price: 30000, stock: 0 } });
  const create = (items: object[], supplierId = supplier.id) =>
    request(app).post('/api/v1/supplier-orders').set(auth(accessToken)).send({ supplierId, items });
  return { accessToken, supplier, toy, leash, create };
}

const stockOf = async (id: string) => (await db.product.findUniqueOrThrow({ where: { id } })).stock;

afterEach(() => {
  vi.useRealTimers();
});

describe('HU-021 — Pedidos a proveedor', () => {
  // CA-021.1 — queda "ordered" y NO toca el stock todavía.
  it('crea el pedido en estado "ordered" sin cambiar el stock', async () => {
    const { create, toy, leash } = await setup();
    const res = await create([
      { productId: toy.id, quantity: 10, unitCost: 6000 },
      { productId: leash.id, quantity: 5, unitCost: 15000 },
    ]);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ordered');
    expect(res.body.data.items).toHaveLength(2);
    expect(await stockOf(toy.id)).toBe(1);
  });

  it('suma las líneas repetidas del mismo producto', async () => {
    const { create, toy } = await setup();
    const res = await create([
      { productId: toy.id, quantity: 2, unitCost: 6000 },
      { productId: toy.id, quantity: 3, unitCost: 6000 },
    ]);

    expect(res.body.data.items).toEqual([expect.objectContaining({ quantity: 5 })]);
  });

  it('no deja pedir a un proveedor desactivado', async () => {
    const { create, toy, supplier } = await setup();
    await db.supplier.update({ where: { id: supplier.id }, data: { active: false } });
    const res = await create([{ productId: toy.id, quantity: 1, unitCost: 6000 }]);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SUPPLIER_INACTIVE');
  });

  // CA-021.2 — recibir suma el stock de cada producto.
  it('recibir suma la cantidad al stock de cada producto', async () => {
    const { accessToken, create, toy, leash } = await setup();
    const created = await create([
      { productId: toy.id, quantity: 10, unitCost: 6000 },
      { productId: leash.id, quantity: 5, unitCost: 15000 },
    ]);
    const res = await request(app)
      .put(`/api/v1/supplier-orders/${created.body.data.id}`)
      .set(auth(accessToken))
      .send({ status: 'received' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('received');
    expect(await stockOf(toy.id)).toBe(11);
    expect(await stockOf(leash.id)).toBe(5);
  });

  // ¿Qué? Sin fecha, la recepción se fecha con HOY en Colombia, no con el día UTC.
  it('a las 7:30 p.m. hora Colombia la fecha de recepción es ese mismo día', async () => {
    const { accessToken, create, toy } = await setup();
    const created = await create([{ productId: toy.id, quantity: 1, unitCost: 6000 }]);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-20T00:30:00.000Z')); // 19-oct 19:30 en Bogotá

    const res = await request(app)
      .put(`/api/v1/supplier-orders/${created.body.data.id}`)
      .set(auth(accessToken))
      .send({ status: 'received' });

    expect(res.body.data.receivedDate).toBe('2026-10-19');
  });

  // CA-021.3 — no se puede recibir dos veces.
  it('recibir dos veces responde 400 y no vuelve a sumar', async () => {
    const { accessToken, create, toy } = await setup();
    const created = await create([{ productId: toy.id, quantity: 10, unitCost: 6000 }]);
    const url = `/api/v1/supplier-orders/${created.body.data.id}`;
    await request(app).put(url).set(auth(accessToken)).send({ status: 'received' });
    const again = await request(app).put(url).set(auth(accessToken)).send({ status: 'received' });

    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('SUPPLIER_ORDER_ALREADY_RECEIVED');
    expect(await stockOf(toy.id)).toBe(11);
  });

  // CA-021.3 — el bug: recepciones simultáneas sumaban el stock varias veces.
  it('con 20 recepciones simultáneas el stock se suma una sola vez', async () => {
    const { create, toy } = await setup();
    const created = await create([{ productId: toy.id, quantity: 10, unitCost: 6000 }]);
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => receiveSupplierOrder(created.body.data.id)),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await stockOf(toy.id)).toBe(11);
  });

  it('responde 422 con cantidad decimal o costo fuera de rango, y 403 a un cliente', async () => {
    const { create, toy } = await setup();
    const decimal = await create([{ productId: toy.id, quantity: 1.5, unitCost: 6000 }]);
    const huge = await create([{ productId: toy.id, quantity: 1, unitCost: 1_000_000_000 }]);
    const { accessToken: clientToken } = await loginTestUser();
    const client = await request(app).get('/api/v1/supplier-orders').set(auth(clientToken));

    expect([decimal.status, huge.status, client.status]).toEqual([422, 422, 403]);
  });
});
