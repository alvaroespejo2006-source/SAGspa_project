/**
 * Archivo: modules/suppliers/suppliers.schema.ts
 * Descripción: Schemas de validación zod para la gestión de proveedores (RF-020).
 */

import { z } from 'zod';

// ¿Qué? Convierte '' y espacios en `undefined`, para que un campo opcional vacío no falle.
const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

// ¿Qué? Reglas de cada campo, compartidas por crear y editar (HU-020).
// ¿Para qué? Mismos problemas que tenían servicios y productos: .min(2) antes de .trim()
//   ("   " pasaba como nombre), y al editar no había mensajes propios (zod en inglés).
const nameField = z
  .string({ required_error: 'El nombre del proveedor es requerido.' })
  .trim()
  .min(2, 'El nombre del proveedor debe tener al menos 2 caracteres.')
  .max(150, 'El nombre no puede superar los 150 caracteres.');
const contactNameField = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(150, 'El nombre del contacto no puede superar los 150 caracteres.').optional(),
);
// ¿Qué? Números, espacios, +, - y paréntesis — mismo formato que los teléfonos de emergencia.
const phoneField = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .regex(/^[0-9+()\s-]{7,20}$/, 'El teléfono solo puede tener números, espacios, +, - y paréntesis (7 a 20).')
    .optional(),
);
// ¿Qué? trim y minúsculas ANTES de .email(): con .email() primero, un correo con espacios fallaba.
const emailField = z.preprocess(
  emptyToUndefined,
  z.string().trim().toLowerCase().email('El correo no tiene un formato válido.').max(255).optional(),
);
const addressField = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(300, 'La dirección no puede superar los 300 caracteres.').optional(),
);

export const createSupplierSchema = z.object({
  name: nameField,
  contactName: contactNameField,
  phone: phoneField,
  email: emailField,
  address: addressField,
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

// ¿Qué? Al editar, un campo de contacto enviado vacío ('') se BORRA (queda en null).
// ¿Para qué? Si el proveedor cambió de correo y ya no tiene uno, el staff debe poder quitarlo;
//   un campo que no se envía, en cambio, no se toca.
const clearable = <T extends z.ZodTypeAny>(field: T) =>
  z.union([z.literal('').transform(() => null), field]);

export const updateSupplierSchema = z.object({
  name: nameField.optional(),
  contactName: clearable(contactNameField),
  phone: clearable(phoneField),
  email: clearable(emailField),
  address: clearable(addressField),
  active: z.boolean({ invalid_type_error: 'El estado activo debe ser verdadero o falso.' }).optional(),
});

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
