/**
 * Archivo: __tests__/pages/VerifyEmailPage.test.tsx
 * Descripción: Tests de aceptación de la HU-003 en la página /verify-email.
 * ¿Para qué? Verificar que cada resultado del enlace muestre la pantalla correcta
 *   (CA-003.1 a CA-003.4) y que la verificación se pida una sola vez.
 * ¿Impacto? Si fallan, un usuario con la cuenta ya activa podría ver un error, o uno con el
 *   enlace expirado no tendría cómo pedir otro.
 */

import { StrictMode } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { ApiError } from '@/api/axios';
import { renderWithRouter } from '../helpers';

vi.mock('@/api/auth');
import * as authApi from '@/api/auth';

const verifyEmailMock = vi.mocked(authApi.verifyEmail);
const resendMock = vi.mocked(authApi.resendVerification);

beforeEach(() => {
  verifyEmailMock.mockReset();
  resendMock.mockReset();
});

function renderPage(path = '/verify-email?token=abc123') {
  return renderWithRouter(<VerifyEmailPage />, { initialEntries: [path] });
}

describe('VerifyEmailPage (HU-003)', () => {
  it('CA-003.1 — muestra éxito y el botón para iniciar sesión', async () => {
    verifyEmailMock.mockResolvedValue(undefined);
    renderPage();

    expect(await screen.findByText('¡Cuenta verificada!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir a iniciar sesión' })).toBeInTheDocument();
    expect(verifyEmailMock).toHaveBeenCalledWith({ token: 'abc123' });
  });

  it('pide la verificación una sola vez aunque StrictMode monte dos veces', async () => {
    verifyEmailMock.mockResolvedValue(undefined);
    renderWithRouter(
      <StrictMode>
        <VerifyEmailPage />
      </StrictMode>,
      { initialEntries: ['/verify-email?token=abc123'] },
    );

    expect(await screen.findByText('¡Cuenta verificada!')).toBeInTheDocument();
    expect(verifyEmailMock).toHaveBeenCalledTimes(1);
  });

  it('CA-003.2 — enlace expirado: muestra el motivo y permite pedir uno nuevo', async () => {
    verifyEmailMock.mockRejectedValue(
      new ApiError('El enlace de verificación ha expirado. Solicita uno nuevo.', 'TOKEN_EXPIRED', 400),
    );
    resendMock.mockResolvedValue(undefined);
    renderPage();

    expect(
      await screen.findByText('El enlace de verificación ha expirado. Solicita uno nuevo.', {
        exact: false,
      }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Correo con el que te registraste'), {
      target: { value: 'laura@example.com' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Enviar nuevo enlace' }));

    await waitFor(() =>
      expect(resendMock).toHaveBeenCalledWith({ email: 'laura@example.com' }),
    );
    expect(
      await screen.findByText(
        'Si tu cuenta está pendiente de verificación, te enviamos un nuevo enlace a tu correo.',
      ),
    ).toBeInTheDocument();
  });

  it('CA-003.3 — enlace ya usado: informa y ofrece iniciar sesión', async () => {
    verifyEmailMock.mockRejectedValue(
      new ApiError('Este enlace ya fue utilizado.', 'TOKEN_ALREADY_USED', 400),
    );
    renderPage();

    expect(await screen.findByText('Este enlace ya fue utilizado.')).toBeInTheDocument();
    expect(screen.getByText('Tu cuenta ya está verificada.', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir a iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar nuevo enlace' })).not.toBeInTheDocument();
  });

  it('CA-003.4 — sin token: no llama a la API y ofrece pedir un enlace', () => {
    renderPage('/verify-email');

    expect(screen.getByText('Este enlace no tiene un token de verificación.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar nuevo enlace' })).toBeInTheDocument();
    expect(verifyEmailMock).not.toHaveBeenCalled();
  });

  it('valida el correo antes de pedir un enlace nuevo', async () => {
    renderPage('/verify-email');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar nuevo enlace' }));

    expect(
      await screen.findByText('Ingresa un correo válido, por ejemplo: nombre@dominio.com'),
    ).toBeInTheDocument();
    expect(resendMock).not.toHaveBeenCalled();
  });
});
