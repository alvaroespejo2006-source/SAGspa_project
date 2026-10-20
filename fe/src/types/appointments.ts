/**
 * Archivo: types/appointments.ts
 * Descripción: Tipos TypeScript para las citas de grooming (RF-009, RF-017).
 */

import type { PriceBreakdown } from './pricing';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  clientId: string;
  petId: string;
  serviceId: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  notes: string | null;
  // ¿Qué? Precio congelado al agendar (RF-009). Null en citas previas al motor de precios.
  totalPrice: number | null;
  priceBreakdown: PriceBreakdown | null;
  createdAt: string;
}

// ¿Qué? Cita de GET /appointments/me — trae los nombres de mascota y servicio (HU-009).
export interface MyAppointment extends Appointment {
  pet: { id: string; name: string };
  service: { id: string; name: string };
}

export interface CreateAppointmentRequest {
  petId: string;
  serviceId: string;
  date: string;
  time: string;
  notes?: string;
}

// ¿Qué? Forma enriquecida usada en la agenda del staff (RF-017).
export interface AgendaAppointment {
  id: string;
  time: string;
  status: AppointmentStatus;
  pet: { id: string; name: string };
  client: { id: string; firstName: string; lastName: string; phone: string | null };
  service: { id: string; name: string; durationMinutes: number };
}
