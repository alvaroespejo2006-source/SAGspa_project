/**
 * Archivo: modules/orders/orders.service.ts
 * Descripción: Lógica de negocio del carrito y los pedidos de productos (RF-016, RF-019).
 * ¿Para qué? No hay pago en línea — el pedido se confirma, se reserva el stock, y el
 *   cliente paga presencialmente al recoger. El staff cierra el ciclo (RF-019).
 * ¿Impacto? El precio de cada línea SIEMPRE se toma del catálogo en el servidor —
 *   nunca del payload del cliente (RN-161), para que nadie pueda pagar menos manipulando el body.
 */

import { db } from '../../db/index.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../middlewares/error.middleware.js';
import type { CreateOrderInput, UpdateOrderStatusInput } from './orders.schema.js';

export interface OrderResponse {
  id: string;
  clientId: string;
  status: string;
  paymentStatus: string;
  total: number;
  items: { productId: string; name: string; quantity: number; unitPrice: number }[];
  createdAt: Date;
}

// ¿Qué? Forma enriquecida de un pedido para la bandeja del staff (RF-019) — incluye
//   los datos del cliente que debe recoger y pagar el pedido en el local.
export interface StaffOrderResponse extends OrderResponse {
  client: { id: string; firstName: string; lastName: string; phone: string | null };
}

// ¿Qué? Confirma un pedido a partir del carrito (RF-016).
// ¿Para qué? Valida stock, calcula el total en el servidor y reserva (descuenta) el
//   stock de cada producto dentro de una única transacción — o todo se aplica, o nada.
export async function createOrder(clientId: string, data: CreateOrderInput): Promise<OrderResponse> {
  // ¿Qué? Junta las líneas repetidas del mismo producto en una sola (2 + 1 → 3).
  // ¿Para qué? Validar el stock contra la cantidad TOTAL pedida de cada producto.
  const quantities = new Map<string, number>();
  for (const item of data.items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  return db.$transaction(async (tx) => {
    let total = 0;
    const lineItems: { productId: string; name: string; quantity: number; unitPrice: number }[] = [];

    for (const [productId, quantity] of quantities) {
      const product = await tx.product.findUnique({ where: { id: productId } });

      // ¿Qué? El mensaje nombra el producto (antes mostraba su UUID al cliente).
      if (!product || !product.active) {
        throw new NotFoundError(
          product
            ? `"${product.name}" ya no está disponible. Quítalo del carrito para continuar.`
            : 'Uno de los productos de tu carrito ya no está disponible.',
          'PRODUCT_UNAVAILABLE',
        );
      }

      // RN-163: se reserva (descuenta) el stock de inmediato, al crear el pedido.
      // ¿Qué? Descuento CONDICIONAL y atómico: solo descuenta si todavía hay `quantity` unidades.
      // ¿Para qué? Antes se leía el stock y luego se descontaba: dos pedidos simultáneos por la
      //   última unidad pasaban los dos la revisión y el stock quedaba en -1 (CA-016.4). Con el
      //   WHERE stock >= quantity, Postgres bloquea la fila y el segundo pedido no descuenta nada.
      const reserved = await tx.product.updateMany({
        where: { id: productId, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (reserved.count === 0) {
        const current = await tx.product.findUnique({ where: { id: productId } });
        const left = current?.stock ?? 0;
        throw new ConflictError(
          left === 0
            ? `"${product.name}" se agotó. Quítalo del carrito para continuar.`
            : `Solo quedan ${left} unidades de "${product.name}". Ajusta la cantidad en tu carrito.`,
          'OUT_OF_STOCK',
        );
      }

      const unitPrice = Number(product.price);
      total += unitPrice * quantity;
      lineItems.push({ productId: product.id, name: product.name, quantity, unitPrice });
    }

    const order = await tx.order.create({
      data: {
        clientId,
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

    return { id: order.id, clientId, status: order.status, paymentStatus: order.paymentStatus, total, items: lineItems, createdAt: order.createdAt };
  });
}

// ¿Qué? Lista los pedidos del cliente autenticado, con sus líneas, más recientes primero.
export async function listMyOrders(clientId: string): Promise<OrderResponse[]> {
  const orders = await db.order.findMany({
    where: { clientId },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return orders.map((o) => ({
    id: o.id,
    clientId: o.clientId,
    status: o.status,
    paymentStatus: o.paymentStatus,
    total: Number(o.total),
    items: o.items.map((i) => ({
      productId: i.productId,
      name: i.product.name,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
    })),
    createdAt: o.createdAt,
  }));
}

// ¿Qué? Lista los pedidos de un estado, para la bandeja del staff (RF-019, HU-019).
// ¿Para qué? La HU pide listar "por estado": además de los pendientes, el staff consulta los
//   completados y cancelados. Pendientes del más antiguo al más nuevo (se atiende primero el
//   que lleva más tiempo esperando); los cerrados del más reciente al más antiguo.
export async function listOrdersByStatus(
  status: 'pending' | 'completed' | 'cancelled' = 'pending',
): Promise<StaffOrderResponse[]> {
  const orders = await db.order.findMany({
    where: { status },
    include: { items: { include: { product: true } }, client: true },
    orderBy: { createdAt: status === 'pending' ? 'asc' : 'desc' },
  });

  return orders.map((o) => ({
    id: o.id,
    clientId: o.clientId,
    status: o.status,
    paymentStatus: o.paymentStatus,
    total: Number(o.total),
    items: o.items.map((i) => ({
      productId: i.productId,
      name: i.product.name,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
    })),
    createdAt: o.createdAt,
    client: { id: o.client.id, firstName: o.client.firstName, lastName: o.client.lastName, phone: o.client.phone },
  }));
}

// ¿Qué? El staff marca un pedido como completado (pagado y entregado) o cancelado (RF-019).
// ¿Impacto? Cancelar restaura el stock reservado (RN-192); completar exige marcar el pago (RN-191).
export async function updateOrderStatus(
  id: string,
  data: UpdateOrderStatusInput,
): Promise<{ id: string; status: string; paymentStatus: string }> {
  return db.$transaction(async (tx) => {
    // ¿Qué? Cierra el pedido con un UPDATE CONDICIONAL (solo si sigue pendiente) ANTES de tocar
    //   el stock (HU-019, CA-019.3).
    // ¿Para qué? Antes se leía el estado y luego se cerraba: si dos personas del staff cancelaban
    //   el mismo pedido a la vez, las dos pasaban la revisión y el stock se devolvía DOS veces.
    const closed = await tx.order.updateMany({
      where: { id, status: 'pending' },
      data: {
        status: data.status,
        ...(data.status === 'completed' ? { paymentStatus: 'paid' as const } : {}),
      },
    });

    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundError('Pedido no encontrado.');

    if (closed.count === 0) {
      const label = order.status === 'completed' ? 'completado' : 'cancelado';
      throw new BadRequestError(
        `Este pedido ya está ${label} y no se puede modificar.`,
        'ORDER_FINAL_STATE',
      );
    }

    if (data.status === 'cancelled') {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return { id: order.id, status: order.status, paymentStatus: order.paymentStatus };
  });
}
