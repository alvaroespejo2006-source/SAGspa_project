/**
 * Archivo: tests/hu-023-venta-manual.test.ts
 * Descripción: Tests de aceptación de la HU-023 (Registro de venta manual) — RF-023.
 * ¿Para qué? Verificar la venta sin cuenta (CA-023.1), la venta vinculada a un cliente
 *   (CA-023.2) y que nunca se venda más de lo que hay (CA-023.3), ni con ventas simultáneas.
 * ¿Impacto? Si fallan, el inventario y el reporte de ventas quedarían descuadrados.
 */

import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { db } from '../db/index.js';
import { createSale } from '../modules/sales/sales.service.js';
import { loginTestStaff, loginTestUser, TEST_USER } from './helpers.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function setup() {
  const { accessToken } = await loginTestStaff();
  const staff = await db.user.findFirstOrThrow({ where: { role: 'staff' } });
  const toy = await db.product.create({ data: { name: 'Pelota', price: 10000, stock: 5 } });
  const leash = await db.product.create({ data: { name: 'Correa', price: 30000, stock: 1 } });
  const sell = (body: object) =>
    request(app).post('/api/v1/sales').set(auth(accessToken)).send(body);
  return { staff, toy, leash, sell };
}

const stockOf = async (id: string) => (await db.product.findUniqueOrThrow({ where: { id } })).stock;

describe('HU-023 — Registro de venta manual', () => {
  // CA-023.1 — sin cuenta: queda pagada y el stock se descuenta de inmediato.
  it('registra la venta sin cuenta, pagada y con el stock descontado', async () => {
    const { sell, toy, leash } = await setup();
    const res = await sell({
      items: [
        { productId: toy.id, quantity: 2 },
        { productId: leash.id, quantity: 1 },
      ],
      clientName: 'Cliente de mostrador',
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        status: 'completed',
        paymentStatus: 'paid',
        total: 50000,
        clientId: null,
        clientName: 'Cliente de mostrador',
      }),
    );
    expect(await stockOf(toy.id)).toBe(3);
    expect(await stockOf(leash.id)).toBe(0);
  });

  it('un nombre de comprador vacío se guarda como sin nombre', async () => {
    const { sell, toy } = await setup();
    const res = await sell({ items: [{ productId: toy.id, quantity: 1 }], clientName: '   ' });

    expect(res.status).toBe(201);
    expect(res.body.data.clientName).toBeNull();
  });

  // CA-023.2 — vinculada al perfil del cliente.
  it('vincula la venta a un cliente con cuenta', async () => {
    const { sell, toy } = await setup();
    await loginTestUser();
    const client = await db.user.findUniqueOrThrow({ where: { email: TEST_USER.email } });
    const res = await sell({ items: [{ productId: toy.id, quantity: 1 }], clientId: client.id });

    expect(res.status).toBe(201);
    expect(res.body.data.clientId).toBe(client.id);
  });

  it('responde 404 si el cliente no existe', async () => {
    const { sell, toy } = await setup();
    const res = await sell({
      items: [{ productId: toy.id, quantity: 1 }],
      clientId: crypto.randomUUID(),
    });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Cliente no encontrado.');
  });

  // CA-023.3 — indica qué producto no alcanza y no vende nada.
  it('rechaza la venta si no alcanza el stock, nombra el producto y no descuenta nada', async () => {
    const { sell, toy, leash } = await setup();
    const res = await sell({
      items: [
        { productId: toy.id, quantity: 1 },
        { productId: leash.id, quantity: 2 },
      ],
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('OUT_OF_STOCK');
    expect(res.body.error.message).toBe('Solo quedan 1 unidades de "Correa".');
    expect(await stockOf(toy.id)).toBe(5);
    expect(await db.sale.count()).toBe(0);
  });

  it('suma las líneas repetidas antes de validar el stock', async () => {
    const { sell, leash } = await setup();
    const res = await sell({
      items: [
        { productId: leash.id, quantity: 1 },
        { productId: leash.id, quantity: 1 },
      ],
    });

    expect(res.status).toBe(409);
    expect(await stockOf(leash.id)).toBe(1);
  });

  // CA-023.3 — el bug: ventas simultáneas por la última unidad.
  it('con 20 ventas simultáneas de la última unidad, solo una se registra', async () => {
    const { staff, leash } = await setup();
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        createSale(staff.id, { items: [{ productId: leash.id, quantity: 1 }] }),
      ),
    );

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await stockOf(leash.id)).toBe(0);
    expect(await db.sale.count()).toBe(1);
  });

  it('responde 422 con una venta vacía y 403 a un cliente', async () => {
    const { sell, toy } = await setup();
    const empty = await sell({ items: [] });
    const { accessToken } = await loginTestUser();
    const client = await request(app)
      .post('/api/v1/sales')
      .set(auth(accessToken))
      .send({ items: [{ productId: toy.id, quantity: 1 }] });

    expect([empty.status, client.status]).toEqual([422, 403]);
  });
});
