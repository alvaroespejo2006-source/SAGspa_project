/**
 * Archivo: pages/staff/StaffCreateAccountPage.tsx
 * Descripción: Creación de una nueva cuenta de staff (RF-008, HU-008).
 * ¿Para qué? No existe registro público para staff — solo alguien que ya es staff
 *   puede dar de alta a otro miembro del equipo. Debajo del formulario se muestra el
 *   listado del equipo, donde aparece la cuenta recién creada (CA-008.4).
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as authApi from '@/api/auth';
import * as staffApi from '@/api/staff';
import type { StaffSummary } from '@/types/staff';
import { getMissingPasswordRequirements } from '@/utils/password';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { Alert } from '@/components/ui/Alert';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

const EMPTY_FORM: FormData = { firstName: '', lastName: '', email: '', password: '' };

// ¿Qué? Mismas reglas que createStaffSchema en el backend (be/src/modules/auth/auth.schema.ts).
const NAME_REGEX = /^\p{L}+(?:[ '-]\p{L}+)*$/u;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ¿Qué? Valida el formulario antes de enviarlo y devuelve un error por campo.
// ¿Para qué? Antes el formulario no validaba nada: los errores solo llegaban del servidor,
//   de uno en uno y sin decir qué campo estaba mal.
function validateForm(data: FormData): Partial<FormData> {
  const errors: Partial<FormData> = {};
  const checkName = (value: string, label: string) => {
    if (value.trim().length < 2) return `El ${label} debe tener al menos 2 caracteres.`;
    if (!NAME_REGEX.test(value.trim())) return `El ${label} solo puede contener letras.`;
    return undefined;
  };

  const firstName = checkName(data.firstName, 'nombre');
  const lastName = checkName(data.lastName, 'apellido');
  if (firstName) errors.firstName = firstName;
  if (lastName) errors.lastName = lastName;
  if (!EMAIL_REGEX.test(data.email.trim())) {
    errors.email = 'Ingresa un correo válido, por ejemplo: nombre@dominio.com';
  }
  const missing = getMissingPasswordRequirements(data.password);
  if (missing.length > 0) {
    errors.password = `A la contraseña le falta: ${missing.join(', ')}.`;
  }
  return errors;
}

// ¿Qué? Listado de las cuentas de staff (HU-008, CA-008.4).
function StaffList({ staff, error }: { staff: StaffSummary[] | null; error: string | null }) {
  if (error) return <Alert type="error" message={error} />;
  if (!staff) return <p className="text-sm text-gray-500 dark:text-slate-400">Cargando equipo...</p>;

  return (
    <ul aria-label="Cuentas de staff" className="divide-y divide-gray-200 dark:divide-slate-700">
      {staff.map((member) => (
        <li key={member.id} className="py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-slate-100 truncate">
              {member.firstName} {member.lastName}
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{member.email}</p>
          </div>
          <span
            className={[
              'shrink-0 rounded-full px-2 py-0.5 text-xs',
              member.isEmailVerified
                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
            ].join(' ')}
          >
            {member.isEmailVerified ? 'Activa' : 'Pendiente de verificar'}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StaffCreateAccountPage() {
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<FormData>>({});
  // ¿Qué? Correo de la cuenta recién creada, para el mensaje de éxito.
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staff, setStaff] = useState<StaffSummary[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  // ¿Qué? Carga (o recarga) el listado del equipo.
  const loadStaff = useCallback(() => {
    staffApi
      .listStaff()
      .then((list) => {
        setStaff(list);
        setListError(null);
      })
      .catch((err: unknown) => {
        setListError(err instanceof Error ? err.message : 'No se pudo cargar el equipo.');
      });
  }, []);

  useEffect(loadStaff, [loadStaff]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatedEmail(null);

    const errors = validateForm(formData);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const created = await authApi.createStaff({
        ...formData,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
      });
      setCreatedEmail(created.email);
      setFormData(EMPTY_FORM);
      // ¿Qué? CA-008.4 — la cuenta nueva aparece en el listado sin recargar la página.
      loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta de staff.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <Link to="/staff" className="text-sm text-gray-500 dark:text-slate-400 hover:underline">
        ← Volver
      </Link>

      <h1 className="text-2xl font-comic tracking-wide text-gray-900 dark:text-slate-100 mt-4 mb-1">
        👤 Nueva Cuenta de Staff
      </h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        Solo el staff puede crear otras cuentas de staff — no hay registro público para este rol.
      </p>

      {/* ¿Qué? La cuenta nueva no puede iniciar sesión hasta verificar su correo (RN-023). */}
      {createdEmail && (
        <div className="mb-4">
          <Alert
            type="success"
            message={`Cuenta de staff creada. Enviamos un correo a ${createdEmail} para que active la cuenta antes de iniciar sesión.`}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && <Alert type="error" message={error} />}

        <InputField
          id="firstName"
          name="firstName"
          label="Nombre"
          required
          value={formData.firstName}
          onChange={handleChange}
          error={fieldErrors.firstName}
        />
        <InputField
          id="lastName"
          name="lastName"
          label="Apellido"
          required
          value={formData.lastName}
          onChange={handleChange}
          error={fieldErrors.lastName}
        />
        <InputField
          id="email"
          name="email"
          label="Email"
          type="email"
          required
          value={formData.email}
          onChange={handleChange}
          error={fieldErrors.email}
        />
        <InputField
          id="password"
          name="password"
          label="Contraseña"
          type="password"
          required
          value={formData.password}
          onChange={handleChange}
          placeholder="Mín. 8 caracteres, 1 mayúscula, 1 minúscula, 1 número"
          error={fieldErrors.password}
        />

        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSubmitting}>Crear cuenta</Button>
        </div>
      </form>

      <h2 className="text-lg font-comic tracking-wide text-gray-900 dark:text-slate-100 mt-10 mb-2">
        Equipo de staff
      </h2>
      <StaffList staff={staff} error={listError} />
    </div>
  );
}
