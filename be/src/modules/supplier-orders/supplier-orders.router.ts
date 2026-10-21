/**
 * Archivo: modules/supplier-orders/supplier-orders.router.ts
 * Descripción: Router de Express para los pedidos de reabastecimiento (RF-021) — todo solo-staff.
 */

import { Router, type IRouter } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import { validate, validateIdParam } from '../../middlewares/validate.middleware.js';
import { createSupplierOrderSchema, receiveSupplierOrderSchema } from './supplier-orders.schema.js';
import * as controller from './supplier-orders.controller.js';

const router: IRouter = Router();

// ¿Qué? Un :id que no es UUID responde 404 en vez de 500 (HU-013).
router.param('id', validateIdParam);

router.use(authenticate, requireRole('staff'));

router.get('/', controller.list);
router.post('/', validate(createSupplierOrderSchema), controller.create);
router.put('/:id', validate(receiveSupplierOrderSchema), controller.receive);

export default router;
