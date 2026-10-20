/**
 * Archivo: api/staff.ts
 * Descripción: Llamadas HTTP exclusivas del staff que no pertenecen a un módulo de dominio
 *   propio: el listado de cuentas de staff (HU-008) y la búsqueda de clientes (RF-012).
 */

import { apiClient } from './axios';
import type { ApiResponse } from '@/types/auth';
import type { ClientSummary, StaffSummary } from '@/types/staff';

// ¿Qué? Lista las cuentas de staff, la más reciente primero (HU-008, CA-008.4).
export async function listStaff(): Promise<StaffSummary[]> {
  const res = await apiClient.get<ApiResponse<StaffSummary[]>>('/staff');
  return res.data.data;
}

// ¿Qué? Busca clientes por nombre, email o documento — soporte técnico de RF-012.
export async function searchClients(q: string): Promise<ClientSummary[]> {
  const res = await apiClient.get<ApiResponse<ClientSummary[]>>('/staff/clients', { params: { q } });
  return res.data.data;
}
