/**
 * Archivo: components/auth/RegisterForm.tsx
 * Descripción: Formulario de registro de cliente reutilizable (RF-001, HU-001).
 * ¿Para qué? El mismo formulario se usa en la página /register y en el pop-up de la
 *   navbar. Toda la validación y el llamado a `register()` viven aquí.
 * ¿Impacto? No cambia la lógica de negocio: sigue enviando exactamente los mismos
 *   campos a `register()`. Se añade una casilla obligatoria de aceptación de los
 *   documentos legales y un sello visible de consentimiento (solo frontend), para
 *   dejar trazabilidad de qué versión aceptó el usuario y cuándo.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { Alert } from '@/components/ui/Alert';
import { LEGAL_VERSION } from '@/config/legal';

// ¿Qué? Caracteres NO permitidos en nombre/apellido: todo lo que no sea letra
//   (de cualquier idioma), espacio, apóstrofo o guion. Se usa para filtrar al teclear.
const NAME_DISALLOWED_CHARS = /[^\p{L} '-]/gu;

// ¿Qué? Formato válido de nombre: una o más palabras de solo letras, separadas
//   por un espacio, apóstrofo o guion (ej: "Ana María", "O'Brien", "Pérez-Gómez").
const NAME_REGEX = /^\p{L}+(?:[ '-]\p{L}+)*$/u;

// ¿Qué? Teléfono: entre 7 y 15 dígitos, nada más.
const PHONE_REGEX = /^\d{7,15}$/;

// ¿Qué? Documento: entre 4 y 20 dígitos, sin letras ni símbolos.
const DOCUMENT_REGEX = /^\d{4,20}$/;

// ¿Qué? Correo con formato real: algo@algo.algo, sin espacios.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormData {
  documentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type FormErrors = Partial<Record<keyof FormData | 'acceptedLegal', string>>;

const EMPTY_FORM: FormData = {
  documentId: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
};

// ¿Qué? Fecha y hora legible para el sello de consentimiento.
function formatNow(): string {
  return new Date().toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

interface RegisterFormProps {
  // ¿Qué? Se llama al hacer clic en un enlace interno (documentos legales). Sirve para
  //   que el pop-up se cierre antes de navegar.
  onNavigate?: () => void;
  // ¿Qué? Si se pasa, la pantalla de éxito muestra un botón "Ir a iniciar sesión" que
  //   llama a esta función (en el pop-up, cambia al formulario de login sin navegar).
  onGoToLogin?: () => void;
}

export function RegisterForm({ onNavigate, onGoToLogin }: RegisterFormProps) {
  const { register } = useAuth();

  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  // ¿Qué? Aceptación de los documentos legales y el momento exacto en que se marcó.
  // ¿Para qué? Trazabilidad del consentimiento: se muestra un sello con la versión y
  //   la fecha/hora aceptadas. (No se envía al backend — la lógica de negocio no cambia.)
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);

  const sanitizeField = (name: string, value: string): string => {
    if (name === 'firstName' || name === 'lastName') {
      return value.replace(NAME_DISALLOWED_CHARS, '');
    }
    if (name === 'documentId') {
      return value.replace(/\D/g, '').slice(0, 20);
    }
    if (name === 'phone') {
      return value.replace(/\D/g, '').slice(0, 15);
    }
    return value;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: sanitizeField(name, value) }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setServerError(null);
  };

  const handleAcceptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAcceptedLegal(checked);
    setAcceptedAt(checked ? formatNow() : null);
    setErrors((prev) => ({ ...prev, acceptedLegal: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!DOCUMENT_REGEX.test(formData.documentId.trim())) {
      newErrors.documentId = 'El documento debe tener entre 4 y 20 dígitos.';
    }
    if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'El nombre debe tener al menos 2 caracteres.';
    } else if (!NAME_REGEX.test(formData.firstName.trim())) {
      newErrors.firstName = 'El nombre solo puede contener letras.';
    }
    if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'El apellido debe tener al menos 2 caracteres.';
    } else if (!NAME_REGEX.test(formData.lastName.trim())) {
      newErrors.lastName = 'El apellido solo puede contener letras.';
    }
    // ¿Qué? Vacío → "obligatorio" (CA-001.2); con datos pero mal formado → regla de dígitos.
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es obligatorio.';
    } else if (!PHONE_REGEX.test(formData.phone.trim())) {
      newErrors.phone = 'El teléfono debe tener entre 7 y 15 dígitos.';
    }
    if (!EMAIL_REGEX.test(formData.email.trim())) {
      newErrors.email = 'Ingresa un correo válido, por ejemplo: nombre@dominio.com';
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(formData.password)) {
      newErrors.password = 'La contraseña debe tener 8+ caracteres, mayúscula, minúscula y número.';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }
    if (!acceptedLegal) {
      newErrors.acceptedLegal =
        'Debes leer y aceptar los Términos y Condiciones y la Política de Privacidad.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError(null);

    try {
      await register({
        documentId: formData.documentId.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      setRegistered(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo completar el registro.');
    } finally {
      setIsLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="text-center space-y-4 py-2">
        <h3 className="text-lg font-comic tracking-wide text-gray-900 dark:text-slate-100">
          ¡Ya casi! Revisa tu correo
        </h3>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Te enviamos un enlace de verificación. Haz clic en él para activar tu cuenta antes de
          iniciar sesión.
        </p>
        {onGoToLogin ? (
          <button
            type="button"
            onClick={onGoToLogin}
            className="inline-block text-sm text-brand-600 dark:text-brand-400 hover:underline"
          >
            Ir a iniciar sesión →
          </button>
        ) : (
          <Link
            to="/login"
            className="inline-block text-sm text-brand-600 dark:text-brand-400 hover:underline"
          >
            Ir a iniciar sesión →
          </Link>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {serverError && <Alert type="error" message={serverError} />}

      <InputField
        id="documentId"
        name="documentId"
        label="Número de documento"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required
        value={formData.documentId}
        onChange={handleChange}
        placeholder="Ej: 1234567890"
        error={errors.documentId}
      />

      <InputField
        id="firstName"
        name="firstName"
        label="Nombre"
        type="text"
        autoComplete="given-name"
        required
        value={formData.firstName}
        onChange={handleChange}
        placeholder="Ej: Juan"
        error={errors.firstName}
      />

      <InputField
        id="lastName"
        name="lastName"
        label="Apellido"
        type="text"
        autoComplete="family-name"
        required
        value={formData.lastName}
        onChange={handleChange}
        placeholder="Ej: Pérez"
        error={errors.lastName}
      />

      <InputField
        id="phone"
        name="phone"
        label="Teléfono"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        required
        value={formData.phone}
        onChange={handleChange}
        placeholder="Ej: 3001234567"
        error={errors.phone}
      />

      <InputField
        id="email"
        name="email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        required
        value={formData.email}
        onChange={handleChange}
        placeholder="tucorreo@ejemplo.com"
        error={errors.email}
      />

      <InputField
        id="password"
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        required
        value={formData.password}
        onChange={handleChange}
        placeholder="••••••••"
        error={errors.password}
      />

      <InputField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirmar contraseña"
        type="password"
        autoComplete="new-password"
        required
        value={formData.confirmPassword}
        onChange={handleChange}
        placeholder="••••••••"
        error={errors.confirmPassword}
      />

      {/* ─── Casilla de aceptación de documentos legales + sello de consentimiento ─── */}
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-3">
        <label htmlFor="acceptedLegal" className="flex items-start gap-2.5 text-sm cursor-pointer">
          <input
            id="acceptedLegal"
            name="acceptedLegal"
            type="checkbox"
            checked={acceptedLegal}
            onChange={handleAcceptChange}
            aria-invalid={!!errors.acceptedLegal}
            aria-describedby={errors.acceptedLegal ? 'acceptedLegal-error' : undefined}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-gray-700 dark:text-slate-300">
            He leído y acepto los{' '}
            <Link
              to="/terminos"
              onClick={onNavigate}
              className="text-brand-600 dark:text-brand-400 hover:underline"
            >
              Términos y Condiciones
            </Link>{' '}
            y la{' '}
            <Link
              to="/privacidad"
              onClick={onNavigate}
              className="text-brand-600 dark:text-brand-400 hover:underline"
            >
              Política de Privacidad y Tratamiento de Datos Personales
            </Link>
            .
          </span>
        </label>

        {acceptedLegal && acceptedAt && (
          <p className="mt-2 pl-6 text-xs text-gray-500 dark:text-slate-400">
            Consentimiento registrado en este equipo: {acceptedAt} · versión {LEGAL_VERSION}
          </p>
        )}

        {errors.acceptedLegal && (
          <p id="acceptedLegal-error" role="alert" className="mt-2 pl-6 text-xs text-red-600 dark:text-red-400">
            {errors.acceptedLegal}
          </p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" isLoading={isLoading} disabled={!acceptedLegal}>
          Crear cuenta
        </Button>
      </div>
    </form>
  );
}
