/**
 * Archivo: types/emergency.ts
 * Descripción: Tipos TypeScript para la información de emergencia (RF-011).
 */

// ¿Qué? Tipo de número (HU-011, CA-011.3) — mismo enum que el backend.
export type EmergencyPhoneCategory = 'clinica_24h' | 'linea_emergencia' | 'otro';

export const EMERGENCY_CATEGORY_LABELS: Record<EmergencyPhoneCategory, string> = {
  clinica_24h: 'Clínica veterinaria 24 horas',
  linea_emergencia: 'Línea de emergencias animales',
  otro: 'Otro',
};

export interface EmergencyPhone {
  label: string;
  phone: string;
  category: EmergencyPhoneCategory;
}

export interface EmergencyInfo {
  searchQuery: string;
  emergencyPhones: EmergencyPhone[];
  // ¿Qué? false mientras el staff no haya guardado nada (el backend usa valores por defecto).
  configured: boolean;
}

// ¿Qué? Lo que envía el staff al guardar (PUT /emergency-info).
export type UpdateEmergencyInfoRequest = Omit<EmergencyInfo, 'configured'>;
