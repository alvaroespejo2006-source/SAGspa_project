/**
 * Archivo: utils/password.ts
 * Descripción: Reglas de fortaleza de contraseña compartidas por los formularios.
 * ¿Para qué? Indicar al usuario QUÉ requisito le falta (CA-001.3) en vez de un mensaje genérico.
 * ¿Impacto? Las reglas deben ser las mismas del backend (PASSWORD_REGEX en be/src/modules/auth/auth.schema.ts).
 */

// ¿Qué? Lista los requisitos de contraseña que aún no se cumplen (vacía si es válida).
export function getMissingPasswordRequirements(password: string): string[] {
  const missing: string[] = [];
  if (password.length < 8) missing.push('al menos 8 caracteres');
  if (!/[A-Z]/.test(password)) missing.push('una mayúscula');
  if (!/[a-z]/.test(password)) missing.push('una minúscula');
  if (!/\d/.test(password)) missing.push('un número');
  return missing;
}
