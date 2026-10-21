/**
 * Archivo: modules/symptom-reports/symptom-reports.router.ts
 * Descripción: Routers de Express para los reportes de síntomas leves.
 * ¿Para qué? Expone dos routers: uno para el cliente (crear/consultar los propios,
 *   bajo /api/v1/symptom-reports) y otro para el staff (revisar pendientes, bajo
 *   /api/v1/staff/symptom-reports), tal como quedó documentado en RF-010 y RF-018.
 */

import { Router, type IRouter } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import { validate, validateIdParam } from '../../middlewares/validate.middleware.js';
import { createSymptomReportSchema, reviewSymptomReportSchema } from './symptom-reports.schema.js';
import * as reportsController from './symptom-reports.controller.js';

// --- Router del cliente: /api/v1/symptom-reports ---
export const clientRouter: IRouter = Router();

clientRouter.post(
  '/',
  authenticate,
  requireRole('client'),
  validate(createSymptomReportSchema),
  reportsController.create,
);

clientRouter.get('/me', authenticate, requireRole('client'), reportsController.listMine);

// --- Router del staff: /api/v1/staff/symptom-reports ---
export const staffRouter: IRouter = Router();

// ¿Qué? Un :id que no es UUID responde 404 en vez de 500 (HU-013).
staffRouter.param('id', validateIdParam);

staffRouter.get('/', authenticate, requireRole('staff'), reportsController.listPending);

staffRouter.put(
  '/:id',
  authenticate,
  requireRole('staff'),
  validate(reviewSymptomReportSchema),
  reportsController.review,
);
