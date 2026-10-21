/**
 * Archivo: pages/ChangePasswordPage.tsx
 * Descripción: Página para cambiar la contraseña del usuario autenticado (RF-004, HU-004).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '@/api/auth';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { Alert } from '@/components/ui/Alert';

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

type FormErrors = Partial<FormData>;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const homeLink = user?.role === 'staff' ? '/staff' : '/app';

  const [formData, setFormData] = useState<FormData>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    setServerError(null);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'La contraseña actual es requerida.';
    }
    // ¿Qué? "Diferente a la actual" solo se evalúa si la nueva ya es válida.
    // ¿Para qué? Con ambos campos vacíos ('' === '') aparecía "debe ser diferente a la
    //   actual" en lugar del requisito que realmente falta.
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(formData.newPassword)) {
      newErrors.newPassword = 'La contraseña debe tener 8+ caracteres, mayúscula, minúscula y número.';
    } else if (formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = 'La nueva contraseña debe ser diferente a la actual.';
    }
    if (formData.newPassword !== formData.confirmNewPassword) {
      newErrors.confirmNewPassword = 'Las contraseñas no coinciden.';
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
      await authApi.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate(homeLink), 2000);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-comic tracking-wide text-gray-900 dark:text-slate-100 mb-1">
            Cambiar contraseña
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Ingresa tu contraseña actual y la nueva.
          </p>
        </div>

        {success ? (
          <Alert type="success" message="Contraseña cambiada correctamente." />
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {serverError && <Alert type="error" message={serverError} />}

            <InputField
              id="currentPassword"
              name="currentPassword"
              label="Contraseña actual"
              type="password"
              autoComplete="current-password"
              required
              value={formData.currentPassword}
              onChange={handleChange}
              placeholder="••••••••"
              error={errors.currentPassword}
            />

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
              id="confirmNewPassword"
              name="confirmNewPassword"
              label="Confirmar nueva contraseña"
              type="password"
              autoComplete="new-password"
              required
              value={formData.confirmNewPassword}
              onChange={handleChange}
              placeholder="••••••••"
              error={errors.confirmNewPassword}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => navigate(homeLink)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isLoading}>
                Cambiar contraseña
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
