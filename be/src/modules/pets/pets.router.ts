/**
 * Archivo: modules/pets/pets.router.ts
 * Descripción: Router de Express para el registro y consulta de mascotas (RF-012, RF-013).
 * ¿Para qué? POST /api/v1/pets (solo staff), GET /api/v1/pets/me (solo cliente) y
 *   GET /api/v1/pets (solo staff, con ?clientId=).
 */

import { Router, type IRouter } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import { validate, validateIdParam } from '../../middlewares/validate.middleware.js';
import { createPetSchema, updatePetSchema } from './pets.schema.js';
import * as petsController from './pets.controller.js';

const router: IRouter = Router();

// ¿Qué? Un :id que no es UUID responde 404 en vez de 500 (HU-013).
router.param('id', validateIdParam);

// GET /api/v1/pets/me — Mascotas del cliente autenticado (RF-013)
router.get('/me', authenticate, requireRole('client'), petsController.listMyPets);

// GET /api/v1/pets?clientId=... — Mascotas de un cliente específico (RF-013, solo staff)
router.get('/', authenticate, requireRole('staff'), petsController.listPetsForClient);

// POST /api/v1/pets — Registra una mascota a nombre de un cliente (RF-012, solo staff)
router.post('/', authenticate, requireRole('staff'), validate(createPetSchema), petsController.createPet);

// PUT /api/v1/pets/:id — Edita una mascota: talla, pelo, condiciones de piel (RF-012, solo staff)
router.put('/:id', authenticate, requireRole('staff'), validate(updatePetSchema), petsController.updatePet);

export default router;
