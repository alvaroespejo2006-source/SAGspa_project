/**
 * Archivo: modules/products/products.schema.ts
 * Descripción: Schemas de validación zod para el catálogo de productos (RF-015).
 */

import { z } from 'zod';

// ¿Qué? Reglas de cada campo, compartidas por crear y editar (HU-015).
// ¿Para qué? Igual que en servicios (HU-014): editar no tenía mensajes propios y `name`
//   aplicaba .min(2) antes de .trim(), así que "   " pasaba como nombre válido.
const nameField = z
  .string({ required_error: 'El nombre del producto es requerido.' })
  .trim()
  .min(2, 'El nombre del producto debe tener al menos 2 caracteres.')
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
const stockField = z.coerce
  .number({ invalid_type_error: 'El stock debe ser un número.' })
  .int('El stock debe ser un número entero.')
  .min(0, 'El stock no puede ser negativo.')
  .max(100_000, 'Revisa el stock: no puede superar las 100.000 unidades.');
// ¿Qué? Categoría opcional; un texto vacío o de espacios se guarda como "sin categoría".
const categoryField = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().trim().max(50, 'La categoría no puede superar los 50 caracteres.').optional(),
);

export const createProductSchema = z.object({
  name: nameField,
  description: descriptionField.optional(),
  price: priceField,
  stock: stockField.default(0),
  category: categoryField,
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: nameField.optional(),
  description: descriptionField.optional(),
  price: priceField.optional(),
  stock: stockField.optional(),
  category: categoryField,
  active: z.boolean({ invalid_type_error: 'El estado activo debe ser verdadero o falso.' }).optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
