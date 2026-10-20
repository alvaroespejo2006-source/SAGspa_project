/**
 * Archivo: middlewares/auth.middleware.ts
 * Descripción: Middlewares de verificación de JWT y de rol para rutas protegidas.
 * ¿Para qué? Proteger endpoints que requieren autenticación (authenticate) y, además,
 *   restringir algunos endpoints a un rol específico (requireRole), como piden los RFs
 *   de staff (RF-008, RF-012, RF-014, RF-017, etc.).
 * ¿Impacto? Sin authenticate, cualquiera accedería a rutas privadas. Sin requireRole,
 *   un cliente autenticado podría llamar endpoints reservados para el staff.
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { ForbiddenError, UnauthorizedError } from './error.middleware.js';
import type { UserRole } from '../utils/security.js';

// ¿Qué? Payload esperado en el JWT.
interface TokenPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

// ¿Qué? Middleware que verifica el Bearer token del header Authorization.
// ¿Para qué? Autenticar requests y adjuntar el usuario (con su rol) al objeto req.
// ¿Impacto? Si el token es inválido o expirado, retorna 401 antes de llegar al controller.
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    // ¿Qué? Mensajes en español: el frontend muestra error.message tal cual (HU-007).
    next(new UnauthorizedError('Debes iniciar sesión para continuar.'));
    return;
  }

  const token = authHeader.slice(7); // Remover "Bearer "

  try {
    // ¿Qué? Solo se acepta HS256, el algoritmo con el que se firman los tokens.
    // ¿Para qué? Que un token manipulado no pueda pedir otro algoritmo en su cabecera (CA-007.2).
    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    }) as TokenPayload;

    if (payload.type !== 'access') {
      next(new UnauthorizedError('Tu sesión no es válida. Inicia sesión de nuevo.'));
      return;
    }

    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(new UnauthorizedError('Tu sesión no es válida o expiró. Inicia sesión de nuevo.'));
  }
}

// ¿Qué? Factory de middleware que exige que req.user tenga uno de los roles indicados.
// ¿Para qué? Reutilizar la misma verificación en todos los endpoints solo-staff o solo-cliente,
//   en vez de repetir el `if (req.user.role !== 'staff')` en cada controller.
// ¿Impacto? Debe usarse SIEMPRE después de `authenticate` — depende de que req.user ya exista.
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new ForbiddenError(`Forbidden — required role: ${roles.join(' or ')}`));
      return;
    }
    next();
  };
}
