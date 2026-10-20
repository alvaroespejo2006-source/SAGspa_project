/**
 * Archivo: modules/appointments/appointments.service.ts
 * Descripción: Lógica de negocio de las citas de grooming — opción verde del semáforo (RF-009).
 * ¿Para qué? Validar las reglas de negocio (mascota propia, antelación mínima, horario de
 *   atención, servicio activo) antes de crear una cita.
 * ¿Impacto? Es el flujo de negocio principal de GroomingSpa.
 */

import type { Appointment, Prisma } from '@prisma/client';
import { db } from '../../db/index.js';
import {
  NotFoundError,
  BadRequestError,
  PetConditionBlockedError,
} from '../../middlewares/error.middleware.js';
import { assertPetBelongsToClient } from '../pets/pets.service.js';
import { calculatePrice, type PriceBreakdown } from '../pricing/pricing.service.js';
import { addDays, todayInBusinessTimezone } from '../../utils/dates.js';
import type { CreateAppointmentInput, UpdateAppointmentStatusInput } from './appointments.schema.js';

export interface AppointmentResponse {
  id: string;
  clientId: string;
  petId: string;
  serviceId: string;
  date: string;
  time: string;
  status: string;
  notes: string | null;
  totalPrice: number | null;
  priceBreakdown: PriceBreakdown | null;
  createdAt: Date;
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toAppointmentResponse(appt: Appointment): AppointmentResponse {
  return {
    id: appt.id,
    clientId: appt.clientId,
    petId: appt.petId,
    serviceId: appt.serviceId,
    date: toDateOnly(appt.date),
    time: appt.time,
    status: appt.status,
    notes: appt.notes,
    totalPrice: appt.totalPrice != null ? Number(appt.totalPrice) : null,
    priceBreakdown: (appt.priceBreakdown as PriceBreakdown | null) ?? null,
    createdAt: appt.createdAt,
  };
}

// ¿Qué? Calcula la fecha mínima permitida (mañana) en formato AAAA-MM-DD.
// ¿Para qué? Aplicar RN-092: "la cita debe ser a partir de mañana".
// ¿Impacto? "Mañana" se cuenta en la zona horaria del negocio (America/Bogota): antes se
//   usaba UTC y, desde las 7:00 p.m. en Colombia, se rechazaban las citas para mañana.
function minimumAllowedDate(): string {
  return addDays(todayInBusinessTimezone(), 1);
}

// ¿Qué? Convierte "HH:mm" a minutos desde medianoche, para comparar contra el horario de atención.
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h! * 60 + m!;
}

const OPENING_MINUTES = 9 * 60; // 9:00 a.m.
const CLOSING_MINUTES = 18 * 60; // 6:00 p.m.

// ¿Qué? Agenda una cita de grooming para el cliente autenticado (RF-009).
// ¿Para qué? Aplica, en orden, todas las reglas de negocio del RF antes de insertar.
export async function createAppointment(
  clientId: string,
  data: CreateAppointmentInput,
): Promise<AppointmentResponse> {
  // RN-091: la mascota debe existir y pertenecer al cliente autenticado.
  await assertPetBelongsToClient(data.petId, clientId);

  // RN-092: la cita debe ser, como mínimo, para el día siguiente a hoy.
  if (data.date < minimumAllowedDate()) {
    // ¿Qué? Mismo texto de CA-009.3.
    throw new BadRequestError('La cita debe ser a partir de mañana.', 'DATE_TOO_SOON');
  }

  // RN-093: la hora debe estar dentro del horario de atención (9:00 a.m. - 6:00 p.m.).
  const minutes = toMinutes(data.time);
  if (minutes < OPENING_MINUTES || minutes > CLOSING_MINUTES) {
    throw new BadRequestError('La hora debe estar entre las 9:00am y las 6:00pm.', 'OUTSIDE_BUSINESS_HOURS');
  }

  // RN-094: el servicio debe existir y estar activo.
  const service = await db.service.findUnique({ where: { id: data.serviceId } });
  if (!service || !service.active) {
    throw new NotFoundError('Servicio no encontrado o inactivo.');
  }

  // RN-098: el precio se calcula según la mascota (tamaño, pelo, condiciones de piel) y se
  //   CONGELA en la cita. RN-099: si la mascota tiene una condición que exige revisión
  //   veterinaria previa, la cita no se agenda — se deriva al reporte de síntoma (RF-010).
  const breakdown = await calculatePrice(data.serviceId, data.petId);
  if (breakdown.blocked) {
    throw new PetConditionBlockedError(
      `Antes de un baño, ${breakdown.petName} necesita una revisión por: ${breakdown.blockingConditions.join(', ')}. Reportá el síntoma para que el personal lo revise.`,
    );
  }

  const appointment = await db.appointment.create({
    data: {
      clientId,
      petId: data.petId,
      serviceId: data.serviceId,
      date: new Date(`${data.date}T00:00:00.000Z`),
      time: data.time,
      notes: data.notes,
      totalPrice: breakdown.total,
      priceBreakdown: breakdown as unknown as Prisma.InputJsonValue,
    },
  });

  return toAppointmentResponse(appointment);
}

// ¿Qué? Estimador de precio (RF-009): calcula el desglose sin crear la cita.
// ¿Para qué? El frontend lo llama al elegir mascota + servicio para mostrar el total estimado.
// ¿Impacto? A diferencia de crear la cita, acá `blocked = true` NO es un error — se devuelve
//   el desglose con la bandera para que la UI muestre el aviso y el enlace al RF-010.
export async function quoteAppointment(
  clientId: string,
  petId: string,
  serviceId: string,
): Promise<PriceBreakdown> {
  await assertPetBelongsToClient(petId, clientId);

  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) {
    throw new NotFoundError('Servicio no encontrado o inactivo.');
  }

  return calculatePrice(serviceId, petId);
}

// ¿Qué? Lista las citas del cliente autenticado, más recientes primero.
export async function listMyAppointments(clientId: string): Promise<AppointmentResponse[]> {
  const appointments = await db.appointment.findMany({
    where: { clientId },
    orderBy: [{ date: 'desc' }, { time: 'desc' }],
  });
  return appointments.map(toAppointmentResponse);
}

// ¿Qué? Forma enriquecida de una cita para la agenda del staff (RF-017) — incluye los
//   datos de mascota, cliente y servicio que el staff necesita ver de un vistazo.
export interface AgendaAppointmentResponse {
  id: string;
  time: string;
  status: string;
  pet: { id: string; name: string };
  client: { id: string; firstName: string; lastName: string; phone: string | null };
  service: { id: string; name: string; durationMinutes: number };
}

// ¿Qué? Lista las citas de un día específico, para el calendario del staff (RF-017).
// ¿Para qué? Ordenadas por hora, con los datos necesarios para atender sin consultas extra.
export async function listAgendaByDate(date: string): Promise<AgendaAppointmentResponse[]> {
  const appointments = await db.appointment.findMany({
    where: { date: new Date(`${date}T00:00:00.000Z`) },
    orderBy: { time: 'asc' },
    include: { pet: true, client: true, service: true },
  });

  return appointments.map((a) => ({
    id: a.id,
    time: a.time,
    status: a.status,
    pet: { id: a.pet.id, name: a.pet.name },
    client: { id: a.client.id, firstName: a.client.firstName, lastName: a.client.lastName, phone: a.client.phone },
    service: { id: a.service.id, name: a.service.name, durationMinutes: a.service.durationMinutes },
  }));
}

// ¿Qué? Cambia el estado de una cita — solo el staff puede hacerlo (RF-017, RN-096/097).
export async function updateAppointmentStatus(
  id: string,
  data: UpdateAppointmentStatusInput,
): Promise<AppointmentResponse> {
  const existing = await db.appointment.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Cita no encontrada.');

  // RN-097 (parcial): un estado final (completed/cancelled) no puede volver a moverse.
  if (existing.status === 'completed' || existing.status === 'cancelled') {
    throw new BadRequestError(`La cita ya está en estado final (${existing.status}) y no puede modificarse.`);
  }

  const updated = await db.appointment.update({ where: { id }, data: { status: data.status } });
  return toAppointmentResponse(updated);
}
