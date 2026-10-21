/**
 * Archivo: modules/supplier-orders/supplier-orders.service.ts
 * Descripción: Lógica de negocio de los pedidos de reabastecimiento a proveedores (RF-021).
 * ¿Para qué? Reponer el stock de productos cuando se agotan — pero solo al confirmarse
 *   la recepción de la mercancía, nunca al crear el pedido (RN-212).
 */

import { db } from '../../db/index.js';
import { NotFoundError, BadRequestError } from '../../middlewares/error.middleware.js';
import { todayInBusinessTimezone } from '../../utils/dates.js';
import type { CreateSupplierOrderInput } from './supplier-orders.schema.js';

export interface SupplierOrderResponse {
  id: string;
  supplierId: string;
  supplierName: string;
  status: string;
  expectedDate: string | null;
  receivedDate: string | null;
  items: { productId: string; productName: string; quantity: number; unitCost: number }[];
  createdAt: Date;
}

function toDateOnly(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

// ¿Qué? Crea un pedido de reabastecimiento con `status = 'ordered'` (RN-211).
export async function createSupplierOrder(
  data: CreateSupplierOrderInput,
): Promise<SupplierOrderResponse> {
  const supplier = await db.supplier.findUnique({ where: { id: data.supplierId } });
  if (!supplier) throw new NotFoundError('Proveedor no encontrado.');
  // ¿Qué? Un proveedor desactivado (HU-020) ya no recibe pedidos nuevos (HU-021).
  if (!supplier.active) {
    throw new BadRequestError(
      `"${supplier.name}" está desactivado. Actívalo antes de hacerle un pedido.`,
      'SUPPLIER_INACTIVE',
    );
  }

  // ¿Qué? Junta las líneas repetidas del mismo producto (2 + 3 → 5), como en HU-016.
  const lines = new Map<string, { quantity: number; unitCost: number }>();
  for (const item of data.items) {
    const prev = lines.get(item.productId);
    lines.set(item.productId, {
      quantity: (prev?.quantity ?? 0) + item.quantity,
      unitCost: item.unitCost,
    });
  }

  for (const productId of lines.keys()) {
    const product = await db.product.findUnique({ where: { id: productId } });
    // ¿Qué? Antes el mensaje mostraba el UUID del producto.
    if (!product) throw new NotFoundError('Uno de los productos del pedido ya no existe.');
  }

  const order = await db.supplierOrder.create({
    data: {
      supplierId: data.supplierId,
      expectedDate: data.expectedDate ? new Date(`${data.expectedDate}T00:00:00.000Z`) : undefined,
      items: {
        create: [...lines].map(([productId, line]) => ({
          productId,
          quantity: line.quantity,
          unitCost: line.unitCost,
        })),
      },
    },
    include: { items: { include: { product: true } }, supplier: true },
  });

  return {
    id: order.id,
    supplierId: order.supplierId,
    supplierName: order.supplier.name,
    status: order.status,
    expectedDate: toDateOnly(order.expectedDate),
    receivedDate: toDateOnly(order.receivedDate),
    items: order.items.map((i) => ({ productId: i.productId, productName: i.product.name, quantity: i.quantity, unitCost: Number(i.unitCost) })),
    createdAt: order.createdAt,
  };
}

export async function listSupplierOrders(): Promise<SupplierOrderResponse[]> {
  const orders = await db.supplierOrder.findMany({
    include: { items: { include: { product: true } }, supplier: true },
    orderBy: { createdAt: 'desc' },
  });

  return orders.map((order) => ({
    id: order.id,
    supplierId: order.supplierId,
    supplierName: order.supplier.name,
    status: order.status,
    expectedDate: toDateOnly(order.expectedDate),
    receivedDate: toDateOnly(order.receivedDate),
    items: order.items.map((i) => ({ productId: i.productId, productName: i.product.name, quantity: i.quantity, unitCost: Number(i.unitCost) })),
    createdAt: order.createdAt,
  }));
}

// ¿Qué? Marca un pedido como recibido e incrementa el stock de cada producto (RF-021).
// ¿Impacto? RN-213: un pedido ya recibido no puede volver a recibirse — evita duplicar el stock.
export async function receiveSupplierOrder(
  id: string,
  receivedDate?: string,
): Promise<SupplierOrderResponse> {
  return db.$transaction(async (tx) => {
    // ¿Qué? Marca el pedido como recibido con un UPDATE CONDICIONAL (solo si sigue `ordered`)
    //   ANTES de sumar el stock (CA-021.3).
    // ¿Para qué? Antes se leía el estado y luego se sumaba: si dos personas lo marcaban como
    //   recibido a la vez, las dos pasaban la revisión y el stock se sumaba dos veces o más.
    // ¿Impacto? La fecha por defecto es HOY en Colombia (con new Date() era el día UTC).
    const received = await tx.supplierOrder.updateMany({
      where: { id, status: 'ordered' },
      data: {
        status: 'received',
        receivedDate: new Date(`${receivedDate ?? todayInBusinessTimezone()}T00:00:00.000Z`),
      },
    });

    const order = await tx.supplierOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundError('Pedido a proveedor no encontrado.');
    if (received.count === 0) {
      throw new BadRequestError(
        'Este pedido ya fue marcado como recibido: el stock ya se sumó.',
        'SUPPLIER_ORDER_ALREADY_RECEIVED',
      );
    }

    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    const updated = await tx.supplierOrder.findUniqueOrThrow({
      where: { id },
      include: { items: { include: { product: true } }, supplier: true },
    });

    return {
      id: updated.id,
      supplierId: updated.supplierId,
      supplierName: updated.supplier.name,
      status: updated.status,
      expectedDate: toDateOnly(updated.expectedDate),
      receivedDate: toDateOnly(updated.receivedDate),
      items: updated.items.map((i) => ({ productId: i.productId, productName: i.product.name, quantity: i.quantity, unitCost: Number(i.unitCost) })),
      createdAt: updated.createdAt,
    };
  });
}
