/**
 * Archivo: pages/VerifyEmailPage.tsx
 * Descripción: Procesa el token del enlace de activación de cuenta (RF-003, HU-003).
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import * as authApi from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

type VerifyState = 'processing' | 'success' | 'error' | 'missingToken';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<VerifyState>(token ? 'processing' : 'missingToken');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ¿Qué? Marca si ya se envió la verificación.
  // ¿Para qué? En desarrollo, StrictMode ejecuta el efecto dos veces: la segunda llamada
  //   encontraba el token ya usado y la pantalla podía terminar en "No pudimos verificar
  //   tu cuenta" aunque la cuenta sí quedó activada.
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!token || requestedRef.current) return;
    requestedRef.current = true;

    const verify = async () => {
      try {
        await authApi.verifyEmail({ token });
        setState('success');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'El enlace no es válido o expiró.');
        setState('error');
      }
    };

    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {state === 'processing' && (
          <div className="text-center space-y-4">
            <div
              aria-label="Cargando"
              role="status"
              className="mx-auto w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"
            />
            <p className="text-sm text-gray-600 dark:text-slate-400">Verificando tu cuenta...</p>
          </div>
        )}

        {state === 'success' && (
          <div className="space-y-4">
            <Alert
              type="success"
              message={
                <span>
                  <strong>¡Cuenta verificada!</strong> Ya puedes iniciar sesión.
                </span>
              }
            />
            <div className="flex justify-end">
              <Link to="/login">
                <Button variant="primary">Ir a iniciar sesión</Button>
              </Link>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4">
            <Alert
              type="error"
              message={
                <span>
                  <strong>No pudimos verificar tu cuenta.</strong>{' '}
                  {errorMessage ?? 'El enlace no es válido o ya expiró.'}
                </span>
              }
            />
            <div className="flex justify-end">
              <Link to="/register">
                <Button variant="secondary">Crear cuenta</Button>
              </Link>
            </div>
          </div>
        )}

        {state === 'missingToken' && (
          <div className="space-y-4">
            <Alert type="error" message="Este enlace no tiene un token de verificación." />
            <div className="flex justify-end">
              <Link to="/register">
                <Button variant="secondary">Crear cuenta</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
