/**
 * Archivo: modules/emergency-info/emergency-info.service.ts
 * Descripción: Lógica de negocio de la información de emergencia — opción roja del
 *   semáforo (RF-011). Se guarda en la tabla genérica `settings` bajo la key
 *   'emergency_info', para no crear tablas relacionales para un dato que casi no cambia.
 * ¿Impacto? GroomingSpa no atiende emergencias — esta pantalla solo informa, nunca
 *   crea citas ni reportes.
 */

import { db } from '../../db/index.js';
import type { EmergencyPhoneCategory, UpdateEmergencyInfoInput } from './emergency-info.schema.js';

const SETTING_KEY = 'emergency_info';

export interface EmergencyInfoResponse {
  searchQuery: string;
  emergencyPhones: { label: string; phone: string; category: EmergencyPhoneCategory }[];
  // ¿Qué? false mientras el staff no haya guardado la configuración (se usan los valores por defecto).
  // ¿Para qué? Que la pantalla del staff avise que falta cargar la clínica 24 horas.
  configured: boolean;
}

// ¿Qué? Valor por defecto si el staff todavía no ha configurado nada.
// ¿Impacto? Solo trae la línea 123: el número de una clínica 24 horas depende de la ciudad
//   del negocio y lo debe cargar el staff en "Configurar emergencia" (CA-011.4).
const DEFAULT_VALUE: EmergencyInfoResponse = {
  searchQuery: 'veterinarias 24 horas cercanas',
  emergencyPhones: [
    { label: 'Línea de emergencias 123', phone: '123', category: 'linea_emergencia' },
  ],
  configured: false,
};

type StoredPhone = { label: string; phone: string; category?: EmergencyPhoneCategory };

// ¿Qué? Retorna la información de emergencia vigente (RN-110: endpoint público).
// ¿Impacto? Los números guardados antes de HU-011 no tienen categoría: se devuelven como 'otro'.
export async function getEmergencyInfo(): Promise<EmergencyInfoResponse> {
  const setting = await db.setting.findUnique({ where: { key: SETTING_KEY } });
  if (!setting) return DEFAULT_VALUE;
  const stored = setting.value as { searchQuery: string; emergencyPhones: StoredPhone[] };
  return {
    searchQuery: stored.searchQuery,
    emergencyPhones: stored.emergencyPhones.map((p) => ({
      label: p.label,
      phone: p.phone,
      category: p.category ?? 'otro',
    })),
    configured: true,
  };
}

// ¿Qué? Actualiza la información de emergencia — solo el staff (RN-111, verificado en el router).
export async function updateEmergencyInfo(
  data: UpdateEmergencyInfoInput,
): Promise<EmergencyInfoResponse> {
  const setting = await db.setting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: data },
    update: { value: data, updatedAt: new Date() },
  });
  return { ...(setting.value as unknown as UpdateEmergencyInfoInput), configured: true };
}
