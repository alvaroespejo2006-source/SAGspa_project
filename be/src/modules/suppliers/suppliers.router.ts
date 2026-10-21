/**
 * Archivo: modules/suppliers/suppliers.router.ts
 * Descripción: Router de Express para la gestión de proveedores (RF-020) — todo solo-staff.
 */

import { Router, type IRouter } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import { validate, validateIdParam } from '../../middlewares/validate.middleware.js';
import { createSupplierSchema, updateSupplierSchema } from './suppliers.schema.js';
import * as suppliersController from './suppliers.controller.js';

const router: IRouter = Router();

// ¿Qué? Un :id que no es UUID responde 404 en vez de 500 (HU-013).
router.param('id', validateIdParam);

router.use(authenticate, requireRole('staff'));

router.get('/', suppliersController.list);
router.post('/', validate(createSupplierSchema), suppliersController.create);
router.put('/:id', validate(updateSupplierSchema), suppliersController.update);
router.delete('/:id', suppliersController.remove);

export default router;
