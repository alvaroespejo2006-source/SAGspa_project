/**
 * Archivo: modules/staff/staff.router.ts
 * Descripción: Router de Express para la gestión de cuentas de staff (RF-008).
 * ¿Para qué? Exponer POST y GET /api/v1/staff, protegidos para que solo otro staff pueda usarlos.
 * ¿Impacto? Sin `requireRole('staff')`, un cliente autenticado podría crear cuentas de staff.
 */

import { Router, type IRouter } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createStaffSchema } from '../auth/auth.schema.js';
import * as staffController from './staff.controller.js';

const router: IRouter = Router();

// POST /api/v1/staff — Crea una cuenta de staff (RF-008)
// Requiere estar autenticado y ya tener role: 'staff' — no hay registro público de staff.
router.post(
  '/',
  authenticate,
  requireRole('staff'),
  validate(createStaffSchema),
  staffController.createStaff,
);

// GET /api/v1/staff — Lista las cuentas de staff (HU-008, CA-008.4)
router.get('/', authenticate, requireRole('staff'), staffController.listStaff);

// GET /api/v1/staff/clients?q=... — Busca clientes por nombre, email o documento (RF-012)
router.get('/clients', authenticate, requireRole('staff'), staffController.searchClients);

export default router;
