/**
 * Archivo: modules/auth/auth.service.ts
 * Descripción: Lógica de negocio para todos los flujos de autenticación (RF-001 a RF-008).
 * ¿Para qué? Separar la lógica de negocio de los handlers HTTP — el controller
 *   solo delega, este módulo decide qué hacer.
 * ¿Impacto? Es el corazón del sistema auth; errores aquí afectan seguridad y datos.
 */

import crypto from 'node:crypto';
import type { User } from '@prisma/client';
import { db } from '../../db/index.js';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  DUMMY_PASSWORD_HASH,
} from '../../utils/security.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../../utils/email.js';
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '../../middlewares/error.middleware.js';
import {
  logLoginSuccess,
  logLoginFailed,
  logPasswordChanged,
  logPasswordResetRequested,
  logEmailVerified,
} from '../../utils/audit-log.js';
import type {
  RegisterInput,
  CreateStaffInput,
  LoginInput,
  RefreshTokenInput,
  ChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
  ResendVerificationInput,
} from './auth.schema.js';

// ¿Qué? Tipo de respuesta de usuario — nunca expone hashedPassword.
// ¿Para qué? Garantizar que la contraseña nunca viaje en el response.
export interface UserResponse {
  id: string;
  documentId: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  role: 'client' | 'staff';
  isEmailVerified: boolean;
  createdAt: Date;
}

// ¿Qué? Tipo de respuesta de tokens — access + refresh.
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'bearer';
}

// ¿Qué? Respuesta del login (RF-002) — además de los tokens, incluye un resumen del
//   usuario con su `role`, que el frontend usa para decidir qué vista renderizar.
export interface LoginResponse extends TokenResponse {
  user: {
    id: string;
    firstName: string;
    role: 'client' | 'staff';
    isEmailVerified: boolean;
  };
}

// ¿Qué? Mapea un usuario de BD al DTO de respuesta, omitiendo la contraseña.
function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    documentId: user.documentId,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  };
}

// ¿Qué? Envía el token de verificación de email para un usuario recién creado.
// ¿Para qué? Reutilizar la misma lógica tanto para el registro de cliente como
//   (en el futuro) para cualquier otro flujo que necesite reverificar un email.
async function issueEmailVerification(user: User): Promise<void> {
  // ¿Qué? Token criptográficamente seguro de 32 bytes (64 chars hex) para verificación de email.
  // ¿Para qué? Garantizar que solo quien tiene acceso al email puede activar la cuenta.
  // ¿Impacto? Expira en 24 horas — si no se verifica, la cuenta queda inactiva (isEmailVerified=false).
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.emailVerificationToken.create({
    data: { userId: user.id, token: verificationToken, expiresAt },
  });

  await sendVerificationEmail(user.email, verificationToken);
}

// ¿Qué? Registra un nuevo cliente con contraseña hasheada y envía email de verificación (RF-001).
// ¿Para qué? Crear cuentas verificando unicidad de email y documento, almacenando hash seguro
//   e iniciando el flujo de verificación de email para activar la cuenta.
// ¿Impacto? Sin verificación de duplicados, múltiples cuentas con el mismo email o documento
//   generarían conflictos de datos. Sin verificación de email, cualquiera podría
//   registrarse con el email de otra persona.
export async function registerUser(data: RegisterInput): Promise<UserResponse> {
  const existing = await db.user.findFirst({
    where: { OR: [{ email: data.email }, { documentId: data.documentId }] },
  });

  if (existing) {
    // ¿Qué? Mensaje genérico — no confirmar si el email o documento existen (OWASP A07).
    throw new ConflictError('El email o el documento ya están registrados.');
  }

  const hashed = await hashPassword(data.password);

  const user = await db.user.create({
    data: {
      documentId: data.documentId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      hashedPassword: hashed,
      role: 'client',
    },
  });

  await issueEmailVerification(user);

  return toUserResponse(user);
}

// ¿Qué? Crea una cuenta de staff (RF-008) — solo puede invocarla otro staff ya autenticado.
// ¿Para qué? No existe registro público para staff; la primera cuenta se crea por seed.
// ¿Impacto? El nuevo staff también pasa por verificación de email antes de poder loguearse,
//   igual que un cliente — mantiene consistente la regla RN-023 del login.
export async function createStaffUser(data: CreateStaffInput): Promise<UserResponse> {
  const existing = await db.user.findUnique({ where: { email: data.email } });

  if (existing) {
    throw new ConflictError('El email ya está registrado.');
  }

  const hashed = await hashPassword(data.password);

  const user = await db.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      hashedPassword: hashed,
      role: 'staff',
    },
  });

  await issueEmailVerification(user);

  return toUserResponse(user);
}

// ¿Qué? Autentica un usuario (cliente o staff) con email + contraseña y genera ambos tokens.
// ¿Para qué? Punto de entrada al sistema — retorna tokens con el rol embebido, que el
//   frontend usa para decidir si muestra el semáforo del cliente o el panel de staff.
// ¿Impacto? Un error en la comparación de hash permitiría logins incorrectos.
export async function loginUser(data: LoginInput, ip?: string): Promise<LoginResponse> {
  const user = await db.user.findUnique({
    where: { email: data.email },
  });

  // ¿Qué? Mensaje de error idéntico tanto para email inexistente como contraseña incorrecta.
  // ¿Para qué? Prevenir user enumeration attacks (OWASP A07). Si el usuario no existe,
  //   igual se corre bcrypt contra DUMMY_PASSWORD_HASH — si no, el tiempo de respuesta
  //   sigue delatando qué emails existen aunque el mensaje sea genérico (timing attack).
  const isPasswordValid = await verifyPassword(data.password, user?.hashedPassword ?? DUMMY_PASSWORD_HASH);
  if (!user || !isPasswordValid) {
    logLoginFailed('Credenciales inválidas', ip);
    throw new UnauthorizedError('Credenciales inválidas.');
  }

  // ¿Qué? Bloquea el login si el email no ha sido verificado (403 Forbidden).
  // ¿Para qué? Garantizar que el usuario es el propietario del email antes de darle acceso.
  // ¿Impacto? Sin esta verificación, un atacante podría registrarse con el email de otra persona
  //   y obtener acceso al sistema antes de que el dueño real reaccione.
  if (!user.isEmailVerified) {
    throw new ForbiddenError('Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.');
  }

  logLoginSuccess(user.id, ip ?? 'unknown');

  return {
    accessToken: generateAccessToken(user.id, user.email, user.role),
    refreshToken: generateRefreshToken(user.id, user.email, user.role),
    tokenType: 'bearer',
    user: {
      id: user.id,
      firstName: user.firstName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    },
  };
}

// ¿Qué? Renueva el access token usando un refresh token válido.
// ¿Para qué? Permitir sesiones largas sin requerir re-login cada 15 minutos.
// ¿Impacto? Un refresh token inválido o expirado debe retornar 401 claramente.
export async function refreshTokens(data: RefreshTokenInput): Promise<TokenResponse> {
  let payload: { sub: string; email: string; iat: number };
  try {
    payload = verifyRefreshToken(data.refreshToken);
  } catch {
    throw new UnauthorizedError('Refresh token inválido o expirado.');
  }

  const user = await db.user.findUnique({
    where: { id: payload.sub },
  });

  if (!user) {
    throw new UnauthorizedError('Usuario no encontrado.');
  }

  // ¿Qué? Rechaza refresh tokens emitidos antes del último cambio de contraseña (HU-004).
  // ¿Para qué? Si alguien robó una sesión, cambiar la contraseña la corta en cuanto su
  //   access token (15 min) expire, en vez de dejarla viva hasta 7 días.
  // ¿Impacto? `iat` está en segundos: se compara contra el segundo del cambio, así los tokens
  //   que se emiten justo después del cambio (mismo segundo) siguen siendo válidos.
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw new UnauthorizedError('Tu contraseña cambió. Inicia sesión de nuevo.');
  }

  return {
    accessToken: generateAccessToken(user.id, user.email, user.role),
    refreshToken: generateRefreshToken(user.id, user.email, user.role),
    tokenType: 'bearer',
  };
}

// ¿Qué? Cambia la contraseña de un usuario autenticado.
// ¿Para qué? Permitir al usuario actualizar su contraseña conociendo la actual.
// ¿Impacto? Se debe verificar la contraseña actual para prevenir cambios no autorizados.
export async function changeUserPassword(
  userId: string,
  data: ChangePasswordInput,
): Promise<TokenResponse> {
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new NotFoundError('Usuario no encontrado.');

  // ¿Qué? 400 (no 401) con un código propio.
  // ¿Para qué? El interceptor de Axios interpreta todo 401 como "sesión expirada": renovaba
  //   los tokens, reintentaba el cambio y, si el refresh fallaba, sacaba al usuario al login
  //   solo por equivocarse de contraseña. 401 queda reservado para problemas del token.
  const valid = await verifyPassword(data.currentPassword, user.hashedPassword);
  if (!valid) {
    throw new BadRequestError('La contraseña actual es incorrecta.', 'INVALID_CURRENT_PASSWORD');
  }

  const hashed = await hashPassword(data.newPassword);
  const now = new Date();

  // ¿Qué? passwordChangedAt invalida los refresh tokens anteriores (ver refreshTokens).
  await db.user.update({
    where: { id: userId },
    data: { hashedPassword: hashed, updatedAt: now, passwordChangedAt: now },
  });

  logPasswordChanged(userId);

  // ¿Qué? Tokens nuevos para la sesión actual.
  // ¿Para qué? Quien cambió la contraseña sigue conectado; las demás sesiones se cierran.
  return {
    accessToken: generateAccessToken(user.id, user.email, user.role),
    refreshToken: generateRefreshToken(user.id, user.email, user.role),
    tokenType: 'bearer',
  };
}

// ¿Qué? Genera un token de recuperación y envía el email al usuario.
// ¿Para qué? Iniciar el flujo de reset de contraseña de forma segura.
// ¿Impacto? El response siempre es genérico — no revelar si el email existe (OWASP A07).
export async function requestPasswordReset(data: ForgotPasswordInput): Promise<void> {
  const user = await db.user.findUnique({
    where: { email: data.email },
  });

  // ¿Qué? Respuesta silenciosa si el email no existe.
  // ¿Para qué? Prevenir user enumeration — el cliente siempre ve el mismo mensaje.
  if (!user) return;

  // ¿Qué? Token criptográficamente seguro de 32 bytes (64 chars hex).
  const resetToken = crypto.randomBytes(32).toString('hex');

  // ¿Qué? Expira en 1 hora.
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      token: resetToken,
      expiresAt,
    },
  });

  await sendPasswordResetEmail(user.email, resetToken);
  logPasswordResetRequested();
}

// ¿Qué? Valida el token de reset y actualiza la contraseña del usuario.
// ¿Para qué? Completar el flujo de recuperación con verificación segura del token.
// ¿Impacto? El token debe ser único, no expirado y no usado — cualquier fallo es 400.
export async function resetUserPassword(data: ResetPasswordInput): Promise<void> {
  const tokenRecord = await db.passwordResetToken.findFirst({
    where: {
      token: data.token,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!tokenRecord) {
    throw new BadRequestError('El token es inválido o ha expirado.');
  }

  const hashed = await hashPassword(data.newPassword);

  // ¿Qué? Actualizar contraseña y marcar token como usado en una sola transacción real.
  // ¿Para qué? Garantizar atomicidad — si una de las dos escrituras falla, ninguna se aplica.
  await db.$transaction([
    db.user.update({
      where: { id: tokenRecord.userId },
      // ¿Qué? passwordChangedAt también aquí: restablecer la contraseña cierra las sesiones abiertas.
      data: { hashedPassword: hashed, updatedAt: new Date(), passwordChangedAt: new Date() },
    }),
    db.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { used: true },
    }),
  ]);
}

// ¿Qué? Verifica el email del usuario usando el token enviado al momento del registro.
// ¿Para qué? Confirmar que el usuario es el propietario del email y activar su cuenta
//   para que pueda iniciar sesión (RF-003).
// ¿Impacto? Sin esta verificación, el login queda bloqueado con 403 indefinidamente.
//   El token es de un solo uso — una vez consumido, no puede reutilizarse.
export async function verifyEmail(data: VerifyEmailInput): Promise<void> {
  // ¿Qué? Se busca el token solo por su valor y luego se evalúa cada caso por separado.
  // ¿Para qué? CA-003.2 y CA-003.3 piden mensajes distintos para "expirado" y "ya usado"
  //   (RN-040 a RN-042); con un solo findFirst filtrado ambos casos se veían iguales.
  // ¿Impacto? Se revisa `used` antes que `expiresAt`: si el enlace ya activó la cuenta,
  //   decir "ya fue utilizado" es más útil que "expiró", aunque ambas cosas sean ciertas.
  const tokenRecord = await db.emailVerificationToken.findFirst({
    where: { token: data.token },
  });

  if (!tokenRecord) {
    throw new BadRequestError('Token de verificación inválido.', 'TOKEN_INVALID');
  }
  if (tokenRecord.used) {
    throw new BadRequestError(
      'Este enlace ya fue utilizado. Tu cuenta ya está verificada, inicia sesión.',
      'TOKEN_ALREADY_USED',
    );
  }
  if (tokenRecord.expiresAt <= new Date()) {
    throw new BadRequestError(
      'El enlace de verificación ha expirado. Solicita uno nuevo.',
      'TOKEN_EXPIRED',
    );
  }

  // ¿Qué? Actualiza isEmailVerified=true y marca el token como usado, en una transacción real.
  // ¿Para qué? Activar la cuenta y asegurar que el token no pueda usarse de nuevo de forma atómica.
  await db.$transaction([
    db.user.update({
      where: { id: tokenRecord.userId },
      data: { isEmailVerified: true, updatedAt: new Date() },
    }),
    db.emailVerificationToken.update({
      where: { id: tokenRecord.id },
      data: { used: true },
    }),
  ]);

  logEmailVerified(tokenRecord.userId);
}

// ¿Qué? Genera y envía un enlace de verificación nuevo para una cuenta aún sin verificar.
// ¿Para qué? Sin esto, si el enlace de 24 h expiraba (CA-003.2) el usuario no tenía
//   forma de activar su cuenta: no podía iniciar sesión ni volver a registrarse.
// ¿Impacto? Siempre termina sin error aunque el correo no exista o ya esté verificado —
//   el controller responde lo mismo en todos los casos para no revelar qué cuentas
//   existen (mismo criterio que forgot-password, OWASP A07).
export async function resendVerificationEmail(data: ResendVerificationInput): Promise<void> {
  const user = await db.user.findUnique({ where: { email: data.email } });
  if (!user || user.isEmailVerified) return;

  // ¿Qué? Invalida los enlaces anteriores que sigan pendientes.
  // ¿Para qué? Que solo el último correo recibido sirva para activar la cuenta.
  await db.emailVerificationToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  await issueEmailVerification(user);
}
