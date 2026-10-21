/**
 * Archivo: modules/sales/sales.schema.ts
 * Descripción: Schemas de validación zod para las ventas de mostrador (RF-023) y
 *   el reporte de ventas (RF-022).
 */

import { z } from 'zod';

export const createSaleSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Selecciona un producto válido.'),
          quantity: z.coerce
            .number({ invalid_type_error: 'La cantidad debe ser un número.' })
            .int('La cantidad debe ser un número entero.')
            .positive('La cantidad debe ser mayor a 0.')
            .max(99, 'Máximo 99 unidades por producto.'),
        }),
        { required_error: 'La venta debe tener al menos un producto.' },
      )
      .min(1, 'La venta debe tener al menos un producto.')
      .max(50, 'La venta no puede tener más de 50 productos distintos.'),
    clientId: z.string().uuid('Selecciona un cliente válido.').optional(),
    // ¿Qué? Un nombre vacío o de espacios se toma como "sin nombre" (CA-023.1).
    clientName: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().trim().max(150, 'El nombre no puede superar los 150 caracteres.').optional(),
    ),
  })
  .refine((data) => !(data.clientId && data.clientName), {
    message: 'Indica clientId o clientName, no ambos.',
    path: ['clientName'],
  });

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const salesReportQuerySchema = z
  .object({
    from: z
      .string({ required_error: 'Indica la fecha inicial.' })
      .regex(DATE_REGEX, 'La fecha inicial debe tener el formato AAAA-MM-DD.'),
    to: z
      .string({ required_error: 'Indica la fecha final.' })
      .regex(DATE_REGEX, 'La fecha final debe tener el formato AAAA-MM-DD.'),
  })
  // ¿Qué? Un rango al revés daba un reporte vacío sin explicación (HU-022).
  .refine((q) => q.from <= q.to, {
    message: 'La fecha inicial no puede ser posterior a la fecha final.',
    path: ['from'],
  });

export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;
