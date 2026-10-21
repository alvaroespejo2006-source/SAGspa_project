/**
 * Archivo: components/auth/LoginForm.tsx
 * Descripción: Formulario de inicio de sesión reutilizable (RF-002, HU-002).
 * ¿Para qué? El mismo formulario se usa en la página /login y en el pop-up que se abre
 *   desde la navbar — así la lógica de autenticación vive en un solo lugar.
 * ¿Impacto? No cambia la lógica de negocio: sigue llamando a `login()` del AuthContext
 *   con { email, password } igual que antes. Solo añade un aviso legal visible.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types/auth';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { Alert } from '@/components/ui/Alert';

// ¿Qué? Correo con formato real: algo@algo.algo, sin espacios (mismo criterio del registro).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormData {
  email: string;
  password: string;
}

type FormErrors = Partial<FormData>;

interface LoginFormProps {
  // ¿Qué? Se llama con el perfil del usuario tras un login correcto — quien usa el
  //   formulario decide a dónde navegar (según el rol) y si cerrar el pop-up.
  onSuccess: (profile: User) => void;
  // ¿Qué? Se llama al hacer clic en un enlace interno (recuperar contraseña, legales).
  //   Sirve para que el pop-up se cierre antes de navegar.
  onNavigate?: () => void;
}

export function LoginForm({ onSuccess, onNavigate }: LoginFormProps) {
  const { login } = useAuth();

  const [formData, setFormData] = useState<FormData>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    setError(null);
  };

  // ¿Qué? Validación en el cliente antes de llamar a la API (CA-002.1).
  // ¿Para qué? Sin esto, un campo vacío llegaba al backend y el usuario veía el JSON
  //   crudo del error 422 en lugar de un mensaje claro junto al campo.
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'El correo es obligatorio.';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      newErrors.email = 'Ingresa un correo válido, por ejemplo: nombre@dominio.com';
    }
    if (!formData.password) {
      newErrors.password = 'La contraseña es obligatoria.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setError(null);

    try {
      // ¿Qué? El rol del perfil decide a dónde navegar — CA-002.3/CA-002.4.
      const profile = await login({ email: formData.email.trim(), password: formData.password });
      onSuccess(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && <Alert type="error" message={error} />}

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
        autoComplete="current-password"
        required
        value={formData.password}
        onChange={handleChange}
        placeholder="••••••••"
        error={errors.password}
      />

      <div className="flex justify-end">
        <Link
          to="/forgot-password"
          onClick={onNavigate}
          className="text-xs text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" isLoading={isLoading}>
          Iniciar sesión
        </Button>
      </div>

      {/* ¿Qué? Aviso legal visible — deja constancia de que al usar el servicio se
          aceptan los documentos, con enlace directo a cada uno. */}
      <p className="text-xs text-gray-500 dark:text-slate-400 text-center pt-1">
        Al iniciar sesión aceptas nuestros{' '}
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
          Política de Privacidad
        </Link>
        .
      </p>
    </form>
  );
}
