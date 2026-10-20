/**
 * Archivo: types/symptom-reports.ts
 * Descripción: Tipos TypeScript para los reportes de síntomas leves (RF-010, RF-018).
 */

export type SymptomReportStatus = 'pending' | 'reviewed';

export interface SymptomReport {
  id: string;
  clientId: string;
  petId: string;
  symptom: string;
  daysWithSymptom: number;
  notes: string | null;
  status: SymptomReportStatus;
  recommendation: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

// ¿Qué? Reporte de GET /symptom-reports/me — trae el nombre de la mascota (HU-010).
export interface MySymptomReport extends SymptomReport {
  pet: { id: string; name: string };
}

export interface CreateSymptomReportRequest {
  petId: string;
  symptom: string;
  daysWithSymptom: number;
  notes?: string;
}

// ¿Qué? Forma enriquecida usada en la bandeja del staff (RF-018).
export interface PendingSymptomReport extends SymptomReport {
  pet: { id: string; name: string; species: string };
  client: { id: string; firstName: string; lastName: string; phone: string | null };
}
