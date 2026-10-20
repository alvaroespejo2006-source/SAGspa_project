/**
 * Archivo: middlewares/validate.middleware.ts
 * Descripción: Middleware genérico de validación de input con zod.
 * ¿Para qué? Centralizar la validación de req.body en un middleware reutilizable,
 *   evitando duplicar lógica de validación en cada controller.
 * ¿Impacto? Sin validación, datos malformados o peligrosos llegan al service layer.
 */

import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { NotFoundError, ValidationError } from './error.middleware.js';

// ¿Qué? Factory que retorna un middleware de validación para un schema zod dado.
// ¿Para qué? Usar en rutas: router.post('/register', validate(registerSchema), controller)
// ¿Impacto? Si el body no cumple el schema, retorna 400 antes de llegar al controller.
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      next(new ValidationError(JSON.stringify(details)));
      return;
    }

    // Reemplazar req.body con los datos validados y transformados por zod
    req.body = result.data;
    next();
  };
}

// ¿Qué? UUID con el formato que usa Postgres (8-4-4-4-12 caracteres hexadecimales).
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ¿Qué? Handler para `router.param('id', validateIdParam)`: un `:id` que no es UUID → 404.
// ¿Para qué? Antes, una URL como PUT /services/abc llegaba a Prisma, que fallaba con
//   "invalid input syntax for type uuid" y la API respondía 500 (HU-013).
// ¿Impacto? Un id mal formado se trata igual que uno que no existe: 404, sin tocar la BD.
export function validateIdParam(
  _req: Request,
  _res: Response,
  next: NextFunction,
  value: string,
): void {
  if (!UUID_REGEX.test(value)) {
    next(new NotFoundError('No se encontró el recurso solicitado.'));
    return;
  }
  next();
}
