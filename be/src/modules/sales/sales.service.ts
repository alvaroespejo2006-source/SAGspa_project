/**
 * Archivo: modules/sales/sales.service.ts
 * Descripción: Lógica de negocio de las ventas de mostrador (RF-023) y el reporte de
 *   ventas combinado con los pedidos de la app (RF-022).
 * ¿Para qué? No toda venta pasa por el carrito de la app — un cliente puede comprar
 *   directamente en el local. A diferencia de un Order, una Sale nace ya completada y pagada.
 */

import { db } from '../../db/index.js';
import { NotFoundError, ConflictError } from '../../middlewares/error.middleware.js';
import type { CreateSaleInput, SalesReportQuery } from './sales.schema.js';
import { businessDayRange } from '../../utils/dates.js';

export interface SaleResponse {
  id: string;
  status: string;
  paymentStatus: string;
  total: number;
  clientId: string | null;
  clientName: string | null;
  items: { productId: string; name: string; quantity: number; unitPrice: number }[];
  createdAt: Date;
}

// ¿Qué? Registra una venta hecha en persona en el mostrador (RF-023).
// ¿Impacto? El stock se descuenta de inmediato — no hay estado "pendiente" como en Order.
export async function createSale(
  registeredById: string,
  data: CreateSaleInput,
): Promise<SaleResponse> {
  // ¿Qué? Junta las líneas repetidas del mismo producto (2 + 1 → 3), como en HU-016.
  const quantities = new Map<string, number>();
  for (const item of data.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  return db.$transaction(async (tx) => {
    if (data.clientId) {
      const client = await tx.user.findUnique({ where: { id: data.clientId } });
      if (!client || client.role !== 'client') {
        throw new NotFoundError('Cliente no encontrado.');
      }
    }

    let total = 0;
    const lineItems: { productId: string; name: string; quantity: number; unitPrice: number }[] = [];

    for (const [productId, quantity] of quantities) {
      const product = await tx.product.findUnique({ where: { id: productId } });
      // ¿Qué? El mensaje nombra el producto (antes mostraba su UUID).
      if (!product || !product.active) {
        throw new NotFoundError(
          product
            ? `"${product.name}" ya no está disponible para la venta.`
            : 'Uno de los productos de la venta ya no existe.',
          'PRODUCT_UNAVAILABLE',
        );
      }

      // ¿Qué? Descuento CONDICIONAL y atómico (CA-023.3), igual que los pedidos de la app (HU-016).
      // ¿Para qué? Antes se leía el stock y luego se descontaba: una venta de mostrador y un
      //   pedido de la app (o dos ventas) al mismo tiempo podían dejar el stock negativo.
      const reserved = await tx.product.updateMany({
        where: { id: productId, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (reserved.count === 0) {
        const left = (await tx.product.findUnique({ where: { id: productId } }))?.stock ?? 0;
        throw new ConflictError(
          left === 0
            ? `No hay existencias de "${product.name}".`
            : `Solo quedan ${left} unidades de "${product.name}".`,
          'OUT_OF_STOCK',
        );
      }

      const unitPrice = Number(product.price);
      total += unitPrice * quantity;
      lineItems.push({ productId: product.id, name: product.name, quantity, unitPrice });
    }

    const sale = await tx.sale.create({
      data: {
        clientId: data.clientId,
        clientName: data.clientName,
        registeredById,
        total,
        items: {
          create: lineItems.map((li) => ({
            productId: li.productId,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
          })),
        },
      },
    });

    return {
      id: sale.id,
      status: sale.status,
      paymentStatus: sale.paymentStatus,
      total,
      clientId: sale.clientId,
      clientName: sale.clientName,
      items: lineItems,
      createdAt: sale.createdAt,
    };
  });
}

export interface SalesReport {
  from: string;
  to: string;
  totalRevenue: number;
  totalOrders: number;
  // ¿Qué? Cuántas de esas transacciones vinieron de la app y cuántas del mostrador (CA-022.3).
  appOrders: number;
  counterSales: number;
  byProduct: { productId: string; name: string; unitsSold: number; revenue: number }[];
}

// ¿Qué? Combina pedidos completados (RF-016) y ventas de mostrador (RF-023) en un solo
//   reporte, para que el staff no tenga que sumarlos por separado (RF-022).
export async function getSalesReport(query: SalesReportQuery): Promise<SalesReport> {
  // ¿Qué? Días calendario de Colombia, no de UTC (HU-022).
  const { start: from, end: to } = businessDayRange(query.from, query.to);

  const [orders, sales] = await Promise.all([
    // ¿Qué? Un pedido de la app cuenta el día en que se PAGÓ (al completarse), no el día en que
    //   se hizo: `updatedAt` se fija al cerrar el pedido (orders.service, updateOrderStatus).
    // ¿Para qué? Un pedido hecho el 30 y pagado el 2 es venta del día 2, no del mes anterior.
    db.order.findMany({
      where: { status: 'completed', updatedAt: { gte: from, lte: to } },
      include: { items: { include: { product: true } } },
    }),
    db.sale.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { items: { include: { product: true } } },
    }),
  ]);

  let totalRevenue = 0;
  let totalOrders = 0;
  const byProductMap = new Map<string, { name: string; unitsSold: number; revenue: number }>();

  for (const tx of [...orders, ...sales]) {
    totalRevenue += Number(tx.total);
    totalOrders += 1;
    for (const item of tx.items) {
      const existing = byProductMap.get(item.productId) ?? { name: item.product.name, unitsSold: 0, revenue: 0 };
      existing.unitsSold += item.quantity;
      existing.revenue += Number(item.unitPrice) * item.quantity;
      byProductMap.set(item.productId, existing);
    }
  }

  return {
    from: query.from,
    to: query.to,
    totalRevenue,
    totalOrders,
    appOrders: orders.length,
    counterSales: sales.length,
    // ¿Qué? Del producto que más dinero dejó al que menos.
    byProduct: Array.from(byProductMap.entries())
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}
