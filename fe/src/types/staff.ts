/**
 * Archivo: types/staff.ts
 * Descripción: Tipos TypeScript exclusivos del panel de staff.
 */

// ¿Qué? Cuenta de staff tal como la devuelve GET /api/v1/staff (HU-008).
export interface StaffSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface ClientSummary {
  id: string;
  documentId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}
