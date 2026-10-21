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

// ¿Qué? Desfase de la zona horaria del negocio en una fecha dada, como "-05:00".
function businessOffset(date: string): string {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: config.BUSINESS_TIMEZONE,
    timeZoneName: 'longOffset',
  })
    .formatToParts(new Date(`${date}T12:00:00.000Z`))
    .find((p) => p.type === 'timeZoneName')?.value;
  // ¿Qué? "GMT-05:00" → "-05:00"; "GMT" (UTC) → "+00:00".
  return !name || name === 'GMT' ? '+00:00' : name.slice(3);
}

// ¿Qué? Instantes de inicio y fin de un rango de días calendario EN COLOMBIA (HU-022).
// ¿Para qué? El reporte cortaba los días en UTC: una venta hecha a las 8:00 p.m. del 19 (hora
//   Colombia) quedaba guardada el 20 a la 1:00 a.m. UTC y salía en el reporte del 20.
// ¿Impacto? `end` es el último milisegundo del día `to` (00:00 del día siguiente − 1 ms).
export function businessDayRange(from: string, to: string): { start: Date; end: Date } {
  const next = addDays(to, 1);
  return {
    start: new Date(`${from}T00:00:00.000${businessOffset(from)}`),
    end: new Date(new Date(`${next}T00:00:00.000${businessOffset(next)}`).getTime() - 1),
  };
}

// ¿Qué? Suma días a una fecha AAAA-MM-DD sin depender de la hora ni de la zona horaria.
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
