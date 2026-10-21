/**
 * Archivo: tests/hu-022-reporte-ventas.test.ts
 * Descripción: Tests de aceptación de la HU-022 (Reporte de ventas) — RF-022.
 * ¿Para qué? Verificar el total, la cantidad y el detalle por producto (CA-022.1), que los
 *   cancelados no cuenten (CA-022.2), que se sumen las ventas de mostrador (CA-022.3), y que los
 *   días sean los de Colombia.
 * ¿Impacto? Si fallan, el negocio vería ventas en el día o el mes equivocado.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { loginTestStaff, loginTestUser, TEST_USER } from './helpers.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// ¿Qué? Datos base: un cliente, un staff y dos productos.
async function setup() {
  const { accessToken } = await loginTestStaff();
  const { accessToken: clientToken } = await loginTestUser();
  const client = await db.user.findUniqueOrThrow({ where: { email: TEST_USER.email } });
  const staff = await db.user.findFirstOrThrow({ where: { role: 'staff' } });
  const toy = await db.product.create({ data: { name: 'Pelota', price: 10000, stock: 100 } });
  const leash = await db.product.create({ data: { name: 'Correa', price: 30000, stock: 100 } });

  // ¿Qué? Pedido de la app con su fecha de creación y de cierre (updatedAt) explícitas.
  const appOrder = (
    status: 'completed' | 'cancelled' | 'pending',
    createdAt: string,
    closedAt: string,
    qty = 1,
  ) =>
    db.order.create({
      data: {
        clientId: client.id,
        status,
        paymentStatus: status === 'completed' ? 'paid' : 'unpaid',
        total: 10000 * qty,
        createdAt: new Date(createdAt),
        updatedAt: new Date(closedAt),
        items: { create: [{ productId: toy.id, quantity: qty, unitPrice: 10000 }] },
      },
    });

  const counterSale = (createdAt: string) =>
    db.sale.create({
      data: {
        registeredById: staff.id,
        total: 30000,
        createdAt: new Date(createdAt),
        items: { create: [{ productId: leash.id, quantity: 1, unitPrice: 30000 }] },
      },
    });

  const report = (from: string, to: string) =>
    request(app).get(`/api/v1/staff/sales-report?from=${from}&to=${to}`).set(auth(accessToken));

  return { appOrder, counterSale, report, staffToken: accessToken, clientToken };
}

describe('HU-022 — Reporte de ventas', () => {
  // CA-022.1 / CA-022.2 / CA-022.3
  it('suma pedidos completados y ventas de mostrador, sin los cancelados ni pendientes', async () => {
    const { appOrder, counterSale, report } = await setup();
    await appOrder('completed', '2030-03-10T15:00:00Z', '2030-03-10T15:00:00Z', 2);
    await appOrder('cancelled', '2030-03-10T15:00:00Z', '2030-03-10T16:00:00Z');
    await appOrder('pending', '2030-03-10T15:00:00Z', '2030-03-10T15:00:00Z');
    await counterSale('2030-03-11T15:00:00Z');

    const res = await report('2030-03-01', '2030-03-31');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        totalRevenue: 50000,
        totalOrders: 2,
        appOrders: 1,
        counterSales: 1,
      }),
    );
    // ¿Qué? Ordenado por ingresos: Correa (30.000) antes que Pelota (20.000).
    expect(res.body.data.byProduct).toEqual([
      expect.objectContaining({ name: 'Correa', unitsSold: 1, revenue: 30000 }),
      expect.objectContaining({ name: 'Pelota', unitsSold: 2, revenue: 20000 }),
    ]);
  });

  // ¿Qué? El bug de UTC: lo vendido a las 8:00 p.m. del 10 (Colombia) es del día 10.
  it('una venta a las 8:00 p.m. hora Colombia cuenta en ese día, no en el siguiente', async () => {
    const { counterSale, report } = await setup();
    await counterSale('2030-03-11T01:00:00Z'); // 10-mar 20:00 en Bogotá

    const day10 = await report('2030-03-10', '2030-03-10');
    const day11 = await report('2030-03-11', '2030-03-11');

    expect(day10.body.data.totalRevenue).toBe(30000);
    expect(day11.body.data.totalRevenue).toBe(0);
  });

  it('una venta a las 11:30 p.m. hora Colombia del último día del rango sí cuenta', async () => {
    const { counterSale, report } = await setup();
    await counterSale('2030-04-01T04:30:00Z'); // 31-mar 23:30 en Bogotá

    const march = await report('2030-03-01', '2030-03-31');

    expect(march.body.data.totalRevenue).toBe(30000);
  });

  // ¿Qué? El pedido cuenta el día en que se pagó (completó), no el día en que se hizo.
  it('un pedido hecho en marzo y pagado en abril cuenta en abril', async () => {
    const { appOrder, report } = await setup();
    await appOrder('completed', '2030-03-30T15:00:00Z', '2030-04-02T15:00:00Z');

    const march = await report('2030-03-01', '2030-03-31');
    const april = await report('2030-04-01', '2030-04-30');

    expect(march.body.data.appOrders).toBe(0);
    expect(april.body.data.appOrders).toBe(1);
  });

  it('completar un pedido desde el staff fija la fecha de pago', async () => {
    const { appOrder, staffToken } = await setup();
    const order = await appOrder('pending', '2026-01-05T15:00:00Z', '2026-01-05T15:00:00Z');

    await request(app)
      .put(`/api/v1/staff/orders/${order.id}`)
      .set(auth(staffToken))
      .send({ status: 'completed' });
    const stored = await db.order.findUniqueOrThrow({ where: { id: order.id } });

    expect(stored.updatedAt.getTime()).toBeGreaterThan(order.createdAt.getTime());
  });

  it('responde 422 si el rango está al revés y 403 a un cliente', async () => {
    const { report, clientToken } = await setup();
    const reversed = await report('2030-03-31', '2030-03-01');
    const client = await request(app)
      .get('/api/v1/staff/sales-report?from=2030-03-01&to=2030-03-31')
      .set(auth(clientToken));

    expect(reversed.status).toBe(422);
    expect(reversed.body.error.message).toBe(
      'La fecha inicial no puede ser posterior a la fecha final.',
    );
    expect(client.status).toBe(403);
  });
});
