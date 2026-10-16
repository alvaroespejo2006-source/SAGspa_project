/**
 * Archivo: modules/auth/auth.schema.ts
 * Descripción: Schemas de validación zod para todos los endpoints de autenticación.
 * ¿Para qué? Centralizar las reglas de validación y los tipos inferidos de los requests.
 * ¿Impacto? Si la validación es laxa, datos malformados llegan al service y a la BD.
 */

import { z } from 'zod';

// ¿Qué? Regex que verifica la fortaleza mínima de una contraseña.
// ¿Para qué? Cumplir el RNF de contraseñas: ≥8 chars, 1 mayúscula, 1 minúscula, 1 número.
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.';

// ¿Qué? Nombre/apellido válido: palabras de solo letras (cualquier idioma) separadas
//   por un espacio, apóstrofo o guion. Rechaza dígitos y símbolos.
// ¿Para qué? El frontend ya filtra al teclear; esto lo vuelve a exigir en el servidor
//   por si el request llega por otra vía (curl, Postman, un cliente modificado).
const NAME_REGEX = /^\p{L}+(?:[ '-]\p{L}+)*$/u;

// ¿Qué? Teléfono: entre 7 y 15 dígitos, sin espacios ni símbolos.
const PHONE_REGEX = /^\d{7,15}$/;

// ¿Qué? Documento: entre 4 y 20 dígitos, sin letras ni símbolos.
const DOCUMENT_REGEX = /^\d{4,20}$/;

// --- Schema de registro de cliente (RF-001) ---
// ¿Qué? Valida los datos del formulario de registro de un cliente: documento, nombre,
//   apellido, teléfono, email y contraseña.
// ¿Para qué? Rechazar en el servidor cualquier dato malformado antes de consultar la BD.
// ¿Impacto? .toLowerCase().trim() normaliza el email para evitar duplicados por mayúsculas.
export const registerSchema = z.object({
  documentId: z
    .string()
    .trim()
    .regex(DOCUMENT_REGEX, 'El documento debe tener entre 4 y 20 dígitos.'),
  firstName: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(100)
    .regex(NAME_REGEX, 'El nombre solo puede contener letras.'),
  lastName: z
    .string()
    .trim()
    .min(2, 'El apellido debe tener al menos 2 caracteres.')
    .max(100)
    .regex(NAME_REGEX, 'El apellido solo puede contener letras.'),
  // ¿Qué? El teléfono es obligatorio (RN-003 de RF-001) — canal principal para confirmar citas.
  // ¿Para qué? Distinguir "no lo escribió" de "lo escribió mal" (CA-001.2): si llega vacío
  //   o no llega, el mensaje dice que es obligatorio en vez de hablar de dígitos.
  phone: z
    .string({ required_error: 'El teléfono es obligatorio.' })
    .trim()
    .min(1, 'El teléfono es obligatorio.')
    .regex(PHONE_REGEX, 'El teléfono debe tener entre 7 y 15 dígitos.'),
  email: z.string().email('El email no tiene un formato válido.').toLowerCase().trim(),
  password: z.string().regex(PASSWORD_REGEX, PASSWORD_MESSAGE),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// --- Schema de creación de staff (RF-008) ---
// ¿Qué? Valida los datos para que un staff cree la cuenta de otro miembro del staff.
// ¿Para qué? A diferencia del registro de cliente, no pide documento ni teléfono.
export const createStaffSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(100)
    .regex(NAME_REGEX, 'El nombre solo puede contener letras.'),
  lastName: z
    .string()
    .trim()
    .min(2, 'El apellido debe tener al menos 2 caracteres.')
    .max(100)
    .regex(NAME_REGEX, 'El apellido solo puede contener letras.'),
  email: z.string().email('El email no tiene un formato válido.').toLowerCase().trim(),
  password: z.string().regex(PASSWORD_REGEX, PASSWORD_MESSAGE),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

// --- Schema de login ---
// ¿Qué? Valida las credenciales de inicio de sesión: email y contraseña.
// ¿Para qué? Garantizar que ambos campos están presentes antes de consultar la BD.
// ¿Impacto? La contraseña solo valida que no esté vacía — la verificación del hash
//   la realiza el service, no el schema (evitar revelar reglas de contraseña en login).
export const loginSchema = z.object({
  email: z.string().email('El email no tiene un formato válido.').toLowerCase().trim(),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// --- Schema de refresh token ---
// ¿Qué? Valida que el body contenga el campo refreshToken con algún valor.
// ¿Para qué? Evitar que el endpoint POST /refresh reciba un body vacío y propague un error genérico.
// ¿Impacto? La validación criptográfica real la hace verifyRefreshToken en el service.
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es requerido.'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// --- Schema de cambio de contraseña ---
// ¿Qué? Valida que se provean contraseña actual y nueva, y que no sean iguales.
// ¿Para qué? Rechazar cambios inútiles (misma contraseña) y garantizar la fortaleza mínima.
// ¿Impacto? .refine() aplica una validación cruzada entre campos — no basta con validar
//   cada campo por separado, se necesita comparar ambos valores juntos.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida.'),
    newPassword: z.string().regex(PASSWORD_REGEX, PASSWORD_MESSAGE),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva contraseña no puede ser igual a la actual.',
    path: ['newPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// --- Schema de solicitud de recuperación de contraseña ---
// ¿Qué? Valida que el body contenga un email con formato válido.
// ¿Para qué? Rechazar emails malformados antes de consultar la BD para el usuario.
// ¿Impacto? El service siempre responde 200 independientemente de si el email existe —
//   este schema solo verifica el formato, no la existencia del usuario.
export const forgotPasswordSchema = z.object({
  email: z.string().email('El email no tiene un formato válido.').toLowerCase().trim(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// --- Schema de restablecimiento de contraseña ---
// ¿Qué? Valida el token de reset y la nueva contraseña que reemplazará la actual.
// ¿Para qué? Rechazar tokens vacíos y contraseñas débiles antes de consultar la BD.
// ¿Impacto? La verificación de que el token existe, no expiró y no fue usado
//   es responsabilidad del service — este schema solo valida el formato del body.
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'El token es requerido.'),
  newPassword: z.string().regex(PASSWORD_REGEX, PASSWORD_MESSAGE),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// --- Schema de verificación de email ---
// ¿Qué? Valida que el body contenga el token de activación enviado por email al registrarse.
// ¿Para qué? Asegurar que el campo token esté presente y no vacío antes de buscarlo en la BD.
// ¿Impacto? Sin validación previa, un body vacío causaría una búsqueda innecesaria en BD
//   que siempre retornaría null y respondería 400 — es más eficiente rechazarlo antes.
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'El token de verificación es requerido.'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
