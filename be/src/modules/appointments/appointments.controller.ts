/**
 * Archivo: modules/appointments/appointments.controller.ts
 * Descripción: Handlers HTTP para las citas de grooming (RF-009, RF-017).
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as appointmentsService from './appointments.service.js';
import type {
  CreateAppointmentInput,
  QuoteAppointmentInput,
  UpdateAppointmentStatusInput,
} from './appointments.schema.js';
import { ValidationError } from '../../middlewares/error.middleware.js';
import { todayInBusinessTimezone } from '../../utils/dates.js';

const dateQuerySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD.');

// ¿Qué? Calendario del día para el staff (RF-017). `?date=` es opcional — por defecto, hoy.
// ¿Impacto? "Hoy" es la fecha de Colombia (HU-017): con toISOString() se usaba UTC y, desde
//   las 7:00 p.m., la agenda "de hoy" mostraba las citas de mañana.
export async function agenda(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const raw = (req.query.date as string) ?? todayInBusinessTimezone();
    const parsed = dateQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0]!.message);
    }
    const appointments = await appointmentsService.listAgendaByDate(parsed.data);
    res.status(200).json({ success: true, data: appointments });
  } catch (err) {
    next(err);
  }
}

// ¿Qué? Agenda una cita de grooming (RF-009). clientId siempre viene del token.
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointment = await appointmentsService.createAppointment(
      req.user!.id,
      req.body as CreateAppointmentInput,
    );
    res.status(201).json({ success: true, data: appointment });
  } catch (err) {
    next(err);
  }
}

// ¿Qué? Estimador de precio (RF-009) — devuelve el desglose sin crear la cita.
export async function quote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { petId, serviceId } = req.body as QuoteAppointmentInput;
    const breakdown = await appointmentsService.quoteAppointment(req.user!.id, petId, serviceId);
    res.status(200).json({ success: true, data: breakdown });
  } catch (err) {
    next(err);
  }
}

// ¿Qué? Lista las citas del cliente autenticado.
export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointments = await appointmentsService.listMyAppointments(req.user!.id);
    res.status(200).json({ success: true, data: appointments });
  } catch (err) {
    next(err);
  }
}

// ¿Qué? Cambia el estado de una cita (RF-017) — solo staff (verificado en el router).
export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointment = await appointmentsService.updateAppointmentStatus(
      req.params.id as string,
      req.body as UpdateAppointmentStatusInput,
    );
    res.status(200).json({ success: true, data: appointment });
  } catch (err) {
    next(err);
  }
}
