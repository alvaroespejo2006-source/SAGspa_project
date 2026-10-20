/**
 * Archivo: pages/LoginPage.tsx
 * Descripción: Página de inicio de sesión (RF-002, HU-002).
 * ¿Para qué? Permitir a clientes y staff autenticarse con email y contraseña.
 * ¿Impacto? Es la puerta de entrada principal al sistema. El formulario en sí vive en
 *   components/auth/LoginForm.tsx, reutilizado también por el pop-up de la navbar.
 */

import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { Alert } from '@/components/ui/Alert';

export function LoginPage() {
  const navigate = useNavigate();
  // ¿Qué? El interceptor de Axios llega aquí con ?sesion=expirada cuando el refresh
  //   token ya no sirve (HU-006, CA-006.2).
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('sesion') === 'expirada';

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-comic tracking-wide text-gray-900 dark:text-slate-100 mb-1">
            Iniciar sesión
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-brand-600 dark:text-brand-400 hover:underline">
              Regístrate
            </Link>
          </p>
        </div>

        {sessionExpired && (
          <div className="mb-4">
            <Alert type="info" message="Tu sesión expiró. Inicia sesión de nuevo para continuar." />
          </div>
        )}

        <LoginForm
          onSuccess={(profile) => navigate(profile.role === 'staff' ? '/staff' : '/app')}
        />
      </div>
    </div>
  );
}
