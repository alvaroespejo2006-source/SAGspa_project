/**
 * Archivo: modules/emergency-info/emergency-info.schema.ts
 * Descripción: Schema de validación zod para la configuración de emergencia (RF-011).
 */

import { z } from 'zod';

// ¿Qué? Tipo de cada número (HU-011, CA-011.3).
// ¿Para qué? La HU exige que el cliente vea AL MENOS una clínica veterinaria 24 horas y la
//   línea de emergencias animales. Sin una categoría no había forma de comprobarlo.
export const EMERGENCY_PHONE_CATEGORIES = ['clinica_24h', 'linea_emergencia', 'otro'] as const;
export type EmergencyPhoneCategory = (typeof EMERGENCY_PHONE_CATEGORIES)[number];

// ¿Qué? Números, espacios, +, - y paréntesis (ej: "+57 (601) 555-1234", "123").
const PHONE_REGEX = /^[0-9+()\s-]{3,20}$/;

export const updateEmergencyInfoSchema = z.object({
  // ¿Qué? trim antes de min: un texto de solo espacios ya no pasa como búsqueda válida.
  searchQuery: z
    .string({ required_error: 'El texto de búsqueda del mapa es requerido.' })
    .trim()
    .min(3, 'El texto de búsqueda del mapa debe tener al menos 3 caracteres.')
    .max(200),
  emergencyPhones: z
    .array(
      z.object({
        label: z.string().trim().min(1, 'El nombre del número es requerido.').max(100),
        phone: z
          .string()
          .trim()
          .regex(PHONE_REGEX, 'El teléfono solo puede tener números, espacios, +, - y paréntesis.'),
        category: z.enum(EMERGENCY_PHONE_CATEGORIES, {
          errorMap: () => ({ message: 'Elige el tipo de número.' }),
        }),
      }),
    )
    .min(1, 'Debe haber al menos un número de emergencia.')
    .max(20, 'Máximo 20 números de emergencia.')
    // CA-011.3 — siempre una clínica 24 h y la línea de emergencias animales.
    .refine((phones) => phones.some((p) => p.category === 'clinica_24h'), {
      message: 'Agrega al menos una clínica veterinaria 24 horas.',
    })
    .refine((phones) => phones.some((p) => p.category === 'linea_emergencia'), {
      message: 'Agrega la línea de emergencias animales.',
    }),
});

export type UpdateEmergencyInfoInput = z.infer<typeof updateEmergencyInfoSchema>;
