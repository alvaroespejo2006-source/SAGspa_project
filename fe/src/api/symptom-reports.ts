/**
 * Archivo: api/symptom-reports.ts
 * Descripción: Llamadas HTTP para reportes de síntomas leves (RF-010, RF-018).
 */

import { apiClient } from './axios';
import type { ApiResponse } from '@/types/auth';
import type {
  CreateSymptomReportRequest,
  MySymptomReport,
  PendingSymptomReport,
  SymptomReport,
} from '@/types/symptom-reports';

export async function createSymptomReport(data: CreateSymptomReportRequest): Promise<SymptomReport> {
  const res = await apiClient.post<ApiResponse<SymptomReport>>('/symptom-reports', data);
  return res.data.data;
}

export async function listMyReports(): Promise<MySymptomReport[]> {
  const res = await apiClient.get<ApiResponse<MySymptomReport[]>>('/symptom-reports/me');
  return res.data.data;
}

// ¿Qué? Bandeja de reportes pendientes para el staff (RF-018).
export async function listPendingReports(): Promise<PendingSymptomReport[]> {
  const res = await apiClient.get<ApiResponse<PendingSymptomReport[]>>('/staff/symptom-reports');
  return res.data.data;
}

export async function reviewReport(id: string, recommendation: string): Promise<SymptomReport> {
  const res = await apiClient.put<ApiResponse<SymptomReport>>(`/staff/symptom-reports/${id}`, {
    recommendation,
  });
  return res.data.data;
}
