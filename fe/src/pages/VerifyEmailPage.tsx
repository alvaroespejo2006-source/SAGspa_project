/**
 * Archivo: pages/VerifyEmailPage.tsx
 * Descripción: Procesa el token del enlace de activación de cuenta (RF-003, HU-003).
 * ¿Para qué? Activar la cuenta y, si falla, explicar el motivo exacto (CA-003.2 / CA-003.3)
 *   y ofrecer la salida correcta: iniciar sesión o pedir un enlace nuevo.
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import * as authApi from '@/api/auth';
import { ApiError } from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { InputField } from '@/components/ui/InputField';

// ¿Qué? 'alreadyUsed' se separa de 'error' porque la salida es distinta: la cuenta ya está
//   activa, así que se ofrece iniciar sesión en vez de pedir un enlace nuevo.
type VerifyState = 'processing' | 'success' | 'alreadyUsed' | 'error' | 'missingToken';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ¿Qué? Formulario para pedir un nuevo enlace de verificación (enlace expirado o inválido).
function ResendVerificationForm() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Ingresa un correo válido, por ejemplo: nombre@dominio.com');
      return;
    }

    setIsLoading(true);
    setServerError(null);
    try {
      await authApi.resendVerification({ email: email.trim() });
      setSent(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'No se pudo enviar el enlace.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <Alert
        type="success"
        message="Si tu cuenta está pendiente de verificación, te enviamos un nuevo enlace a tu correo."
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      {serverError && <Alert type="error" message={serverError} />}
      <InputField
        id="resendEmail"
        name="email"
        label="Correo con el que te registraste"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setEmailError(null);
        }}
        placeholder="tucorreo@ejemplo.com"
        error={emailError ?? undefined}
      />
      <div className="flex justify-end">
        <Button type="submit" isLoading={isLoading}>
          Enviar nuevo enlace
        </Button>
      </div>
    </form>
  );
}

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
        // ¿Qué? El backend envía TOKEN_ALREADY_USED / TOKEN_EXPIRED / TOKEN_INVALID.
        if (err instanceof ApiError && err.code === 'TOKEN_ALREADY_USED') {
          setState('alreadyUsed');
          return;
        }
        setErrorMessage(err instanceof Error ? err.message : 'El enlace no es válido o expiró.');
        setState('error');
      }
    };

    verify();
  }, [token]);

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

        {/* CA-003.3 — el enlace ya se usó: la cuenta está activa, solo falta iniciar sesión. */}
        {state === 'alreadyUsed' && (
          <div className="space-y-4">
            <Alert
              type="info"
              message={
                <span>
                  <strong>Este enlace ya fue utilizado.</strong> Tu cuenta ya está verificada.
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

        {/* CA-003.2 / CA-003.4 — enlace expirado o inválido: se puede pedir uno nuevo. */}
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
            <ResendVerificationForm />
          </div>
        )}

        {state === 'missingToken' && (
          <div className="space-y-4">
            <Alert type="error" message="Este enlace no tiene un token de verificación." />
            <ResendVerificationForm />
          </div>
        )}
      </div>
    </div>
  );
}
