/**
 * Archivo: tests/hu-019-gestion-pedidos.test.ts
 * Descripción: Tests de aceptación de la HU-019 (Gestión de pedidos del staff) — RF-019.
 * ¿Para qué? Verificar la lista por estado (CA-019.1), completar con el pago registrado
 *   (CA-019.2) y cancelar devolviendo el stock UNA sola vez (CA-019.3).
 * ¿Impacto? Si fallan, el inventario quedaría con unidades que no existen.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { updateOrderStatus } from '../modules/orders/orders.service.js';
import { loginTestStaff, loginTestUser } from './helpers.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// ¿Qué? Un cliente con un pedido pendiente de 2 pelotas (stock que queda: 3) y el staff.
async function setup() {
  const client = await loginTestUser();
  const toy = await db.product.create({ data: { name: 'Pelota', price: 12000, stock: 5 } });
  const created = await request(app)
    .post('/api/v1/orders')
    .set(auth(client.accessToken))
    .send({ items: [{ productId: toy.id, quantity: 2 }] });
  const staff = await loginTestStaff();
  return {
    staffToken: staff.accessToken,
    clientToken: client.accessToken,
    toy,
    orderId: created.body.data.id as string,
  };
}

const stockOf = async (id: string) => (await db.product.findUniqueOrThrow({ where: { id } })).stock;
const setStatus = (token: string, id: string, status: string) =>
  request(app).put(`/api/v1/staff/orders/${id}`).set(auth(token)).send({ status });

describe('HU-019 — Gestión de pedidos', () => {
  // CA-019.1 — pendientes con cliente, productos, cantidades y total.
  it('lista los pendientes con cliente, productos, cantidades y total', async () => {
    const { staffToken } = await setup();
    const res = await request(app).get('/api/v1/staff/orders').set(auth(staffToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        status: 'pending',
        total: 24000,
        client: expect.objectContaining({ firstName: 'Test' }),
        items: [expect.objectContaining({ name: 'Pelota', quantity: 2, unitPrice: 12000 })],
      }),
    );
  });

  // CA-019.2 — completado con el pago registrado; aparece en "completed".
  it('completar registra el pago y el pedido pasa a la lista de completados', async () => {
    const { staffToken, orderId } = await setup();
    const res = await setStatus(staffToken, orderId, 'completed');
    const pending = await request(app).get('/api/v1/staff/orders').set(auth(staffToken));
    const completed = await request(app)
      .get('/api/v1/staff/orders?status=completed')
      .set(auth(staffToken));

    expect(res.body.data).toEqual({ id: orderId, status: 'completed', paymentStatus: 'paid' });
    expect(pending.body.data).toEqual([]);
    expect(completed.body.data.map((o: { id: string }) => o.id)).toEqual([orderId]);
  });

  // CA-019.3 — cancelar devuelve el stock reservado.
  it('cancelar devuelve el stock y el pedido pasa a cancelados', async () => {
    const { staffToken, orderId, toy } = await setup();
    expect(await stockOf(toy.id)).toBe(3);

    const res = await setStatus(staffToken, orderId, 'cancelled');
    const cancelled = await request(app)
      .get('/api/v1/staff/orders?status=cancelled')
      .set(auth(staffToken));

    expect(res.body.data.status).toBe('cancelled');
    expect(await stockOf(toy.id)).toBe(5);
    expect(cancelled.body.data).toHaveLength(1);
  });

  // CA-019.3 — el bug: dos cancelaciones a la vez devolvían el stock dos veces.
  // ¿Qué? 20 a la vez: con 5 las transacciones a veces terminaban en orden y el bug no se veía;
  //   con 20, el código anterior devolvía el stock 2 a 10 veces (stock 7 o 23 en vez de 5).
  it('con 20 cancelaciones simultáneas el stock se devuelve una sola vez', async () => {
    const { orderId, toy } = await setup();
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => updateOrderStatus(orderId, { status: 'cancelled' })),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await stockOf(toy.id)).toBe(5);
  });

  it('un pedido cerrado no se puede volver a mover, con mensaje en español', async () => {
    const { staffToken, orderId, toy } = await setup();
    await setStatus(staffToken, orderId, 'completed');
    const res = await setStatus(staffToken, orderId, 'cancelled');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ORDER_FINAL_STATE');
    expect(res.body.error.message).toBe('Este pedido ya está completado y no se puede modificar.');
    expect(await stockOf(toy.id)).toBe(3);
  });

  it('responde 422 con un estado de filtro inválido y 403 a un cliente', async () => {
    const { staffToken, clientToken } = await setup();
    const bad = await request(app).get('/api/v1/staff/orders?status=todos').set(auth(staffToken));
    const client = await request(app).get('/api/v1/staff/orders').set(auth(clientToken));

    expect(bad.status).toBe(422);
    expect(client.status).toBe(403);
  });
});
