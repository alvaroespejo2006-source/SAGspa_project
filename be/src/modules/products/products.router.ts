/**
 * Archivo: modules/products/products.router.ts
 * Descripción: Router de Express para el catálogo de productos (RF-015).
 */

import { Router, type IRouter } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import { validate, validateIdParam } from '../../middlewares/validate.middleware.js';
import { createProductSchema, updateProductSchema } from './products.schema.js';
import * as productsController from './products.controller.js';

const router: IRouter = Router();

// ¿Qué? Un :id que no es UUID responde 404 en vez de 500 (HU-013).
router.param('id', validateIdParam);

router.get('/', productsController.listPublic);
router.get('/staff', authenticate, requireRole('staff'), productsController.listForStaff);
router.post(
  '/',
  authenticate,
  requireRole('staff'),
  validate(createProductSchema),
  productsController.create,
);
router.put(
  '/:id',
  authenticate,
  requireRole('staff'),
  validate(updateProductSchema),
  productsController.update,
);
router.delete('/:id', authenticate, requireRole('staff'), productsController.remove);

export default router;
