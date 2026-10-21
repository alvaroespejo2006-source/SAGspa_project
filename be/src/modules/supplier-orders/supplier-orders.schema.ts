/**
 * Archivo: modules/supplier-orders/supplier-orders.schema.ts
 * Descripción: Schemas de validación zod para los pedidos de reabastecimiento (RF-021).
 */

import { z } from 'zod';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const createSupplierOrderSchema = z.object({
  supplierId: z
    .string({ required_error: 'Selecciona el proveedor.' })
    .uuid('Selecciona un proveedor válido.'),
  expectedDate: z.string().regex(DATE_REGEX, 'La fecha debe tener el formato AAAA-MM-DD.').optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Selecciona un producto válido.'),
        quantity: z.coerce
          .number({ invalid_type_error: 'La cantidad debe ser un número.' })
          .int('La cantidad debe ser un número entero.')
          .positive('La cantidad debe ser mayor a 0.')
          .max(10_000, 'Revisa la cantidad: máximo 10.000 unidades por producto.'),
        // ¿Qué? Tope de la columna Decimal(10, 2): un valor mayor hacía fallar la BD (500).
        unitCost: z.coerce
          .number({ invalid_type_error: 'El costo unitario debe ser un número.' })
          .positive('El costo unitario debe ser mayor a 0.')
          .max(99_999_999, 'Revisa el costo unitario: es demasiado alto.'),
      }),
      { required_error: 'El pedido debe tener al menos un producto.' },
    )
    .min(1, 'El pedido debe tener al menos un producto.')
    .max(50, 'El pedido no puede tener más de 50 productos distintos.'),
});

export type CreateSupplierOrderInput = z.infer<typeof createSupplierOrderSchema>;

export const receiveSupplierOrderSchema = z.object({
  status: z.literal('received'),
  receivedDate: z.string().regex(DATE_REGEX, 'La fecha debe tener el formato AAAA-MM-DD.').optional(),
});

export type ReceiveSupplierOrderInput = z.infer<typeof receiveSupplierOrderSchema>;
