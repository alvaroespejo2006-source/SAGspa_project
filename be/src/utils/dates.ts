/**
 * Archivo: utils/dates.ts
 * Descripción: Fechas calendario (AAAA-MM-DD) según la zona horaria del negocio.
 * ¿Para qué? Las reglas de citas hablan de "hoy" y "mañana" en Colombia, no en UTC.
 * ¿Impacto? Con UTC, desde las 7:00 p.m. hora Colombia (UTC-5) el servidor ya creía que
 *   era el día siguiente y rechazaba citas para mañana (HU-009, CA-009.3).
 */

import { config } from '../config.js';

// ¿Qué? Fecha de hoy (AAAA-MM-DD) en la zona horaria del negocio.
// ¿Para qué? 'en-CA' formatea como AAAA-MM-DD, el mismo formato que usan las citas.
export function todayInBusinessTimezone(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: config.BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// ¿Qué? Suma días a una fecha AAAA-MM-DD sin depender de la hora ni de la zona horaria.
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
