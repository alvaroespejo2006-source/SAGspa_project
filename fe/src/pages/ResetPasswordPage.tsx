/**
 * Archivo: pages/ResetPasswordPage.tsx
 * Descripción: Página para restablecer la contraseña usando el token del email (RF-005, HU-005).
 * ¿Para qué? Revisar el enlace apenas se abre (CA-005.2), pedir la nueva contraseña y, al
 *   terminar, llevar al login con un mensaje de éxito (CA-005.3).
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import * as authApi from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { Alert } from '@/components/ui/Alert';
import { getMissingPasswordRequirements } from '@/utils/password';

interface FormData {
  newPassword: string;
  confirmPassword: string;
}

// ¿Qué? 'checking' mientras se consulta si el enlace sigue vigente; 'invalid' si no sirve
//   (expirado, ya usado o inexistente — el backend manda el mensaje de cada caso).
type LinkState = 'checking' | 'valid' | 'invalid';

// ¿Qué? Mensaje que el login muestra al llegar desde aquí (CA-005.3).
const RESET_SUCCESS_MESSAGE =
  'Contraseña restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.';

function RequestNewLink() {
  return (
    <div className="flex justify-end">
      <Link to="/forgot-password">
        <Button variant="secondary">Solicitar un nuevo enlace</Button>
      </Link>
    </div>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [linkState, setLinkState] = useState<LinkState>('checking');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ¿Qué? Evita repetir la consulta cuando StrictMode ejecuta el efecto dos veces.
  const checkedRef = useRef(false);

  // ¿Qué? Pregunta al backend si el enlace sirve antes de mostrar el formulario (CA-005.2).
  // ¿Para qué? Antes el aviso de "expiró" solo aparecía después de escribir la contraseña.
  useEffect(() => {
    if (!token || checkedRef.current) return;
    checkedRef.current = true;

    authApi
      .validateResetToken({ token })
      .then(() => setLinkState('valid'))
      .catch((err: unknown) => {
        setLinkError(err instanceof Error ? err.message : 'El enlace de recuperación no es válido.');
        setLinkState('invalid');
      });
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    setServerError(null);
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};

    // ¿Qué? Indica qué requisito falta, igual que el registro (CA-001.3).
    const missing = getMissingPasswordRequirements(formData.newPassword);
    if (missing.length > 0) {
      newErrors.newPassword = `A la contraseña le falta: ${missing.join(', ')}.`;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-4">
          <Alert type="error" message="Este enlace no tiene un token válido." />
          <RequestNewLink />
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError(null);

    try {
      await authApi.resetPassword({ token, newPassword: formData.newPassword });
      // ¿Qué? CA-005.3 — va directo al login y el mensaje se muestra allá.
      navigate('/login', { replace: true, state: { successMessage: RESET_SUCCESS_MESSAGE } });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  if (linkState === 'checking') {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
        <div className="text-center space-y-4">
          <div
            aria-label="Cargando"
            role="status"
            className="mx-auto w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"
          />
          <p className="text-sm text-gray-600 dark:text-slate-400">Revisando el enlace...</p>
        </div>
      </div>
    );
  }

  if (linkState === 'invalid') {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-4">
          <Alert type="error" message={linkError ?? 'El enlace de recuperación no es válido.'} />
          <RequestNewLink />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-comic tracking-wide text-gray-900 dark:text-slate-100 mb-1">
            Nueva contraseña
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Elige una nueva contraseña para tu cuenta.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {serverError && <Alert type="error" message={serverError} />}

          <InputField
            id="newPassword"
            name="newPassword"
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            required
            value={formData.newPassword}
            onChange={handleChange}
            placeholder="••••••••"
            error={errors.newPassword}
          />

          <InputField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirmar nueva contraseña"
            type="password"
            autoComplete="new-password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            error={errors.confirmPassword}
          />

          <div className="flex justify-end pt-2">
            <Button type="submit" isLoading={isLoading}>
              Restablecer contraseña
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
