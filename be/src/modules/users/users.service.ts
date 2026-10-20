/**
 * Archivo: modules/users/users.service.ts
 * Descripción: Lógica de negocio para operaciones sobre el perfil de usuario (RF-007).
 * ¿Para qué? Obtener los datos del usuario autenticado desde la BD de forma segura.
 * ¿Impacto? Solo expone datos propios — nunca datos de otros usuarios.
 */

import { db } from '../../db/index.js';
import { NotFoundError } from '../../middlewares/error.middleware.js';

// ¿Qué? DTO de perfil de usuario — omite hashedPassword.
export interface UserProfile {
  id: string;
  documentId: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  role: 'client' | 'staff';
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

// ¿Qué? Obtiene el perfil del usuario por su ID.
// ¿Para qué? Servir el endpoint GET /api/v1/users/me con datos propios del token.
// ¿Impacto? El ID siempre viene del token JWT — nunca de un parámetro de ruta controlable
//   por el cliente, lo que previene acceso horizontal no autorizado (IDOR, RN-073).
export async function getUserById(userId: string): Promise<UserProfile> {
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new NotFoundError('Usuario no encontrado.');

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
    updatedAt: user.updatedAt,
  };
}

// ¿Qué? Resumen mínimo de un cliente — usado por el staff para ubicarlo antes de
//   registrarle una mascota (RF-012), sin exponer su hash de contraseña ni otros datos.
export interface ClientSummary {
  id: string;
  documentId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

// ¿Qué? Busca clientes por nombre, apellido, email o documento (RF-012, soporte técnico).
// ¿Para qué? El staff registra mascotas en persona y necesita ubicar el `clientId` de un
//   cliente ya existente sin conocer su UUID de memoria.
// ¿Impacto? Limitado a role: 'client' y a 10 resultados — nunca devuelve cuentas de staff.
export async function searchClients(search: string): Promise<ClientSummary[]> {
  const users = await db.user.findMany({
    where: {
      role: 'client',
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { documentId: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ],
    },
    take: 10,
    orderBy: { firstName: 'asc' },
  });

  return users.map((u) => ({
    id: u.id,
    documentId: u.documentId,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone,
  }));
}

// ¿Qué? Resumen de una cuenta de staff para el listado del panel (HU-008, CA-008.4).
// ¿Para qué? Ver quién tiene acceso al panel y si ya activó su cuenta, sin exponer el hash.
export interface StaffSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: Date;
}

// ¿Qué? Lista todas las cuentas de staff, la más reciente primero.
// ¿Para qué? Que quien acaba de crear una cuenta la vea arriba del listado (CA-008.4).
// ¿Impacto? Solo role: 'staff' — nunca devuelve clientes.
export async function listStaff(): Promise<StaffSummary[]> {
  const staff = await db.user.findMany({
    where: { role: 'staff' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isEmailVerified: true,
      createdAt: true,
    },
  });

  return staff;
}
