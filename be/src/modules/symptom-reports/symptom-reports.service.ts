/**
 * Archivo: modules/symptom-reports/symptom-reports.service.ts
 * Descripción: Lógica de negocio de los reportes de síntomas leves — opción amarilla
 *   del semáforo (RF-010, RF-018).
 * ¿Para qué? GroomingSpa no tiene veterinario profesional en planta — este flujo
 *   registra el síntoma y, más adelante, una recomendación de texto libre del staff.
 *   NO incluye diagnóstico, tratamiento ni medicamento (ver límite de alcance en RF-010).
 */

import type { SymptomReport } from '@prisma/client';
import { db } from '../../db/index.js';
import { NotFoundError, BadRequestError } from '../../middlewares/error.middleware.js';
import { assertPetBelongsToClient } from '../pets/pets.service.js';
import type { CreateSymptomReportInput, ReviewSymptomReportInput } from './symptom-reports.schema.js';

export interface SymptomReportResponse {
  id: string;
  clientId: string;
  petId: string;
  symptom: string;
  daysWithSymptom: number;
  notes: string | null;
  status: string;
  recommendation: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

function toResponse(r: SymptomReport): SymptomReportResponse {
  return {
    id: r.id,
    clientId: r.clientId,
    petId: r.petId,
    symptom: r.symptom,
    daysWithSymptom: r.daysWithSymptom,
    notes: r.notes,
    status: r.status,
    recommendation: r.recommendation,
    reviewedAt: r.reviewedAt,
    createdAt: r.createdAt,
  };
}

// ¿Qué? Registra un reporte de síntoma leve para una mascota del cliente autenticado (RF-010).
export async function createSymptomReport(
  clientId: string,
  data: CreateSymptomReportInput,
): Promise<SymptomReportResponse> {
  // RN-101: la mascota debe existir y pertenecer al cliente autenticado.
  await assertPetBelongsToClient(data.petId, clientId);

  const report = await db.symptomReport.create({
    data: {
      clientId,
      petId: data.petId,
      symptom: data.symptom,
      daysWithSymptom: data.daysWithSymptom,
      notes: data.notes,
    },
  });

  return toResponse(report);
}

// ¿Qué? Reporte de "Mis reportes" con el nombre de la mascota (HU-010, CA-010.4).
// ¿Para qué? Que el cliente sepa de qué mascota es cada recomendación sin que el frontend
//   tenga que cruzar la lista con sus mascotas.
export interface MySymptomReportResponse extends SymptomReportResponse {
  pet: { id: string; name: string };
}

// ¿Qué? Lista los reportes del cliente autenticado, más recientes primero.
export async function listMyReports(clientId: string): Promise<MySymptomReportResponse[]> {
  const reports = await db.symptomReport.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    include: { pet: true },
  });
  return reports.map((r) => ({ ...toResponse(r), pet: { id: r.pet.id, name: r.pet.name } }));
}

// ¿Qué? Forma enriquecida de un reporte para la bandeja del staff (RF-018) — incluye
//   los datos de mascota y cliente que el staff necesita para dar la recomendación.
export interface PendingSymptomReportResponse extends SymptomReportResponse {
  pet: { id: string; name: string; species: string };
  client: { id: string; firstName: string; lastName: string; phone: string | null };
}

// ¿Qué? Lista los reportes pendientes de revisión, para la bandeja del staff (RF-018).
export async function listPendingReports(): Promise<PendingSymptomReportResponse[]> {
  const reports = await db.symptomReport.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
    include: { pet: true, client: true },
  });

  return reports.map((r) => ({
    ...toResponse(r),
    pet: { id: r.pet.id, name: r.pet.name, species: r.pet.species },
    client: { id: r.client.id, firstName: r.client.firstName, lastName: r.client.lastName, phone: r.client.phone },
  }));
}

// ¿Qué? El staff revisa un reporte y deja una recomendación (RF-018).
// ¿Impacto? Nunca acepta diagnóstico ni medicamento — solo el campo `recommendation` de texto libre.
export async function reviewReport(
  id: string,
  data: ReviewSymptomReportInput,
): Promise<SymptomReportResponse> {
  const existing = await db.symptomReport.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Reporte no encontrado.');
  if (existing.status === 'reviewed') {
    throw new BadRequestError('Este reporte ya fue revisado.');
  }

  const updated = await db.symptomReport.update({
    where: { id },
    data: { status: 'reviewed', recommendation: data.recommendation, reviewedAt: new Date() },
  });

  return toResponse(updated);
}
