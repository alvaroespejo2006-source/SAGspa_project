/**
 * Archivo: modules/services/services.schema.ts
 * Descripción: Schemas de validación zod para el catálogo de servicios (RF-014).
 * ¿Para qué? Los precios se revisan cada año — validar bien evita datos corruptos en el catálogo.
 */

import { z } from 'zod';

// ¿Qué? Reglas de cada campo, compartidas por crear y editar (HU-014).
// ¿Para qué? Antes editar no tenía mensajes (zod respondía en inglés) y `name` aplicaba
//   .min(2) antes de .trim(), así que "   " pasaba como nombre válido.
const nameField = z
  .string({ required_error: 'El nombre del servicio es requerido.' })
  .trim()
  .min(2, 'El nombre del servicio debe tener al menos 2 caracteres.')
  .max(150, 'El nombre no puede superar los 150 caracteres.');
const descriptionField = z
  .string()
  .trim()
  .max(1000, 'La descripción no puede superar los 1000 caracteres.');
// ¿Qué? Tope del precio: la columna es Decimal(10, 2). Un valor mayor hacía fallar la BD (500).
const priceField = z.coerce
  .number({ invalid_type_error: 'El precio debe ser un número.' })
  .positive('El precio debe ser mayor a 0.')
  .max(99_999_999, 'Revisa el precio: es demasiado alto.');
const durationField = z.coerce
  .number({ invalid_type_error: 'La duración debe ser un número.' })
  .int('La duración debe ser un número entero de minutos.')
  .positive('La duración debe ser mayor a 0.')
  .max(480, 'La duración no puede superar las 8 horas (480 minutos).');

export const createServiceSchema = z.object({
  name: nameField,
  description: descriptionField.optional(),
  price: priceField,
  durationMinutes: durationField,
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

// ¿Qué? Todos los campos son opcionales al editar — se actualiza solo lo que se envía.
export const updateServiceSchema = z.object({
  name: nameField.optional(),
  description: descriptionField.optional(),
  price: priceField.optional(),
  durationMinutes: durationField.optional(),
  active: z.boolean({ invalid_type_error: 'El estado activo debe ser verdadero o falso.' }).optional(),
});

export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
