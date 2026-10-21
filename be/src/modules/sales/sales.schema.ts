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
          productId: z.string().uuid('El productId debe ser un UUID válido.'),
          quantity: z.coerce.number().int().positive('La cantidad debe ser mayor a 0.'),
        }),
      )
      .min(1, 'La venta debe tener al menos un producto.'),
    clientId: z.string().uuid().optional(),
    clientName: z.string().max(150).trim().optional(),
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
