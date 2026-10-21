/**
 * Archivo: modules/services/services.controller.ts
 * Descripción: Handlers HTTP para el catálogo de servicios (RF-014).
 */

import type { Request, Response, NextFunction } from 'express';
import * as servicesService from './services.service.js';
import type { CreateServiceInput, UpdateServiceInput } from './services.schema.js';

// ¿Qué? Catálogo público — SIEMPRE solo servicios activos (RN-144), sin importar query params.
// ¿Para qué? Es el catálogo que ve el cliente al agendar una cita (RF-009) — no requiere auth.
export async function listPublic(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const services = await servicesService.listServices(true);
    res.status(200).json({ success: true, data: services });
  } catch (err) {
    next(err);
  }
}

// ¿Qué? Catálogo completo para el staff (RN-145) — incluye inactivos si se pide `?active=false`.
export async function listForStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const activeOnly = req.query.active !== 'false';
    const services = await servicesService.listServices(activeOnly);
    res.status(200).json({ success: true, data: services });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const service = await servicesService.createService(req.body as CreateServiceInput);
    res.status(201).json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const service = await servicesService.updateService(
      req.params.id as string,
      req.body as UpdateServiceInput,
    );
    res.status(200).json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await servicesService.deleteService(req.params.id as string);
    // ¿Qué? Mensaje que explica qué pasó (CA-014.3).
    // ¿Para qué? El staff pulsaba "Eliminar" y, si el servicio tenía citas, solo veía que
    //   seguía en la lista (ahora inactivo), sin saber por qué no se había borrado.
    res.status(200).json({
      success: true,
      message: result.softDeleted
        ? 'El servicio tiene citas asociadas, así que se desactivó en lugar de eliminarse.'
        : 'Servicio eliminado.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
