/**
 * Archivo: modules/staff/staff.controller.ts
 * Descripción: Handler HTTP para la creación de cuentas de staff (RF-008).
 * ¿Para qué? Capa delgada que delega en authService — reutiliza toda la lógica
 *   de creación de usuario y verificación de email ya escrita para el registro de clientes.
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../auth/auth.service.js';
import * as usersService from '../users/users.service.js';
import type { CreateStaffInput } from '../auth/auth.schema.js';
import { ValidationError } from '../../middlewares/error.middleware.js';

// ¿Qué? Crea una nueva cuenta de staff.
// ¿Para qué? Solo alcanzable por un staff ya autenticado (ver staff.router.ts).
export async function createStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const staff = await authService.createStaffUser(req.body as CreateStaffInput);
    res.status(201).json({ success: true, data: staff });
  } catch (err) {
    next(err);
  }
}

// ¿Qué? Lista las cuentas de staff (HU-008, CA-008.4).
// ¿Para qué? La pantalla de creación muestra el equipo actual y la cuenta recién creada.
export async function listStaff(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const staff = await usersService.listStaff();
    res.status(200).json({ success: true, data: staff });
  } catch (err) {
    next(err);
  }
}

const searchQuerySchema = z.string().trim().min(2, 'Escribe al menos 2 caracteres para buscar.');

// ¿Qué? Busca clientes por nombre, apellido, email o documento (soporte técnico de RF-012).
// ¿Para qué? El staff necesita ubicar el clientId de un cliente ya registrado antes de
//   poder registrarle una mascota — no se espera que memorice UUIDs.
export async function searchClients(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = searchQuerySchema.safeParse(req.query.q);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0]!.message);
    }
    const clients = await usersService.searchClients(parsed.data);
    res.status(200).json({ success: true, data: clients });
  } catch (err) {
    next(err);
  }
}
