/**
 * Archivo: modules/appointments/appointments.router.ts
 * Descripción: Router de Express para las citas de grooming (RF-009, RF-017).
 */

import { Router, type IRouter } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import { validate, validateIdParam } from '../../middlewares/validate.middleware.js';
import {
  createAppointmentSchema,
  quoteAppointmentSchema,
  updateAppointmentStatusSchema,
} from './appointments.schema.js';
import * as appointmentsController from './appointments.controller.js';

const router: IRouter = Router();

// ¿Qué? Un :id que no es UUID responde 404 en vez de 500 (HU-013).
router.param('id', validateIdParam);

// POST /api/v1/appointments/quote — estimador de precio, no crea la cita (RF-009, solo cliente)
router.post(
  '/quote',
  authenticate,
  requireRole('client'),
  validate(quoteAppointmentSchema),
  appointmentsController.quote,
);

// POST /api/v1/appointments — agenda una cita de grooming (RF-009, solo cliente)
router.post(
  '/',
  authenticate,
  requireRole('client'),
  validate(createAppointmentSchema),
  appointmentsController.create,
);

// GET /api/v1/appointments/me — citas del cliente autenticado
router.get('/me', authenticate, requireRole('client'), appointmentsController.listMine);

// PUT /api/v1/appointments/:id — cambia el estado de una cita (RF-017, solo staff)
router.put(
  '/:id',
  authenticate,
  requireRole('staff'),
  validate(updateAppointmentStatusSchema),
  appointmentsController.updateStatus,
);

export default router;

// ¿Qué? Router separado para /api/v1/staff/agenda (RF-017) — vive en un prefijo
//   distinto al resto de citas, tal como quedó documentado en el RF.
export const staffAgendaRouter: IRouter = Router();
staffAgendaRouter.get('/', authenticate, requireRole('staff'), appointmentsController.agenda);
