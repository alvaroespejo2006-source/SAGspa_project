/**
 * Archivo: api/appointments.ts
 * Descripción: Llamadas HTTP para citas de grooming (RF-009, RF-017).
 */

import { apiClient } from './axios';
import type { ApiResponse } from '@/types/auth';
import type {
  AgendaAppointment,
  Appointment,
  AppointmentStatus,
  CreateAppointmentRequest,
  MyAppointment,
} from '@/types/appointments';
import type { PriceBreakdown } from '@/types/pricing';

export async function createAppointment(data: CreateAppointmentRequest): Promise<Appointment> {
  const res = await apiClient.post<ApiResponse<Appointment>>('/appointments', data);
  return res.data.data;
}

// ¿Qué? Estimador de precio (RF-009) — devuelve el desglose sin crear la cita.
// ¿Impacto? Si `blocked` es true, la cita NO se puede agendar: hay que ir al reporte de síntoma.
export async function quoteAppointment(petId: string, serviceId: string): Promise<PriceBreakdown> {
  const res = await apiClient.post<ApiResponse<PriceBreakdown>>('/appointments/quote', {
    petId,
    serviceId,
  });
  return res.data.data;
}

export async function listMyAppointments(): Promise<MyAppointment[]> {
  const res = await apiClient.get<ApiResponse<MyAppointment[]>>('/appointments/me');
  return res.data.data;
}

// ¿Qué? Calendario del día para el staff (RF-017). Por defecto, hoy.
export async function getAgenda(date?: string): Promise<AgendaAppointment[]> {
  const res = await apiClient.get<ApiResponse<AgendaAppointment[]>>('/staff/agenda', {
    params: date ? { date } : undefined,
  });
  return res.data.data;
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): Promise<Appointment> {
  const res = await apiClient.put<ApiResponse<Appointment>>(`/appointments/${id}`, { status });
  return res.data.data;
}
