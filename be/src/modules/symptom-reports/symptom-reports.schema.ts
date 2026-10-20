/**
 * Archivo: modules/symptom-reports/symptom-reports.schema.ts
 * Descripción: Schemas de validación zod para los reportes de síntomas leves (RF-010).
 */

import { z } from 'zod';

export const createSymptomReportSchema = z.object({
  petId: z
    .string({ required_error: 'Selecciona la mascota.' })
    .uuid('Selecciona una mascota válida.'),
  // ¿Qué? trim ANTES de min (HU-010, CA-010.2).
  // ¿Para qué? Con .min(3).trim() un texto de solo espacios ("   ") pasaba la validación
  //   y se guardaba un reporte con el síntoma vacío.
  symptom: z
    .string({ required_error: 'Describe el síntoma de tu mascota.' })
    .trim()
    .min(1, 'Describe el síntoma de tu mascota.')
    .min(3, 'Describe el síntoma con al menos 3 caracteres.')
    .max(500, 'La descripción no puede superar los 500 caracteres.'),
  // ¿Qué? Mensajes en español también cuando falta o no es un número (zod los daba en inglés).
  daysWithSymptom: z.coerce
    .number({
      required_error: 'Indica hace cuántos días tiene el síntoma.',
      invalid_type_error: 'Indica hace cuántos días tiene el síntoma.',
    })
    .int('Los días deben ser un número entero.')
    .min(1, 'Debe ser al menos 1 día.')
    .max(365, 'Si lleva más de un año, escribe 365 y cuéntalo en la descripción.'),
  notes: z.string().trim().max(500).optional(),
});

export type CreateSymptomReportInput = z.infer<typeof createSymptomReportSchema>;

// ¿Qué? trim ANTES de min (HU-018, CA-018.3).
// ¿Para qué? Con .min(1).trim() una recomendación de solo espacios pasaba y el reporte
//   quedaba "revisado" sin ninguna recomendación para el cliente.
export const reviewSymptomReportSchema = z.object({
  recommendation: z
    .string({ required_error: 'Escribe la recomendación para el cliente.' })
    .trim()
    .min(1, 'Escribe la recomendación para el cliente.')
    .max(1000, 'La recomendación no puede superar los 1000 caracteres.'),
});

export type ReviewSymptomReportInput = z.infer<typeof reviewSymptomReportSchema>;
