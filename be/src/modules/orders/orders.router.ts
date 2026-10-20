/**
 * Archivo: modules/orders/orders.router.ts
 * Descripción: Routers de Express para pedidos de productos (RF-016, RF-019).
 * ¿Para qué? Un router para el cliente (/api/v1/orders) y otro para el staff
 *   (/api/v1/staff/orders), tal como quedó documentado en los RFs.
 */

import { Router, type IRouter } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import { validate, validateIdParam } from '../../middlewares/validate.middleware.js';
import { createOrderSchema, updateOrderStatusSchema } from './orders.schema.js';
import * as ordersController from './orders.controller.js';

export const clientRouter: IRouter = Router();

clientRouter.post(
  '/',
  authenticate,
  requireRole('client'),
  validate(createOrderSchema),
  ordersController.create,
);
clientRouter.get('/me', authenticate, requireRole('client'), ordersController.listMine);

export const staffRouter: IRouter = Router();

// ¿Qué? Un :id que no es UUID responde 404 en vez de 500 (HU-013).
staffRouter.param('id', validateIdParam);

staffRouter.get('/', authenticate, requireRole('staff'), ordersController.listPending);
staffRouter.put(
  '/:id',
  authenticate,
  requireRole('staff'),
  validate(updateOrderStatusSchema),
  ordersController.updateStatus,
);
