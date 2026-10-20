/**
 * Archivo: __tests__/pages/PasswordRecovery.test.tsx
 * Descripción: Tests de aceptación de la HU-005 en /forgot-password, /reset-password y /login.
 * ¿Para qué? Verificar en la interfaz los criterios CA-005.1 a CA-005.3.
 * ¿Impacto? Si fallan, el usuario no sabría si el enlace expiró ni si ya puede iniciar sesión.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { LoginPage } from '@/pages/LoginPage';
import { ApiError } from '@/api/axios';
import { renderWithRouter } from '../helpers';

vi.mock('@/api/auth');
import * as authApi from '@/api/auth';

// ¿Qué? El LoginForm real usa useAuth; aquí solo importa que el login muestre el mensaje.
vi.mock('@/components/auth/LoginForm', () => ({ LoginForm: () => <form aria-label="login" /> }));

const forgotMock = vi.mocked(authApi.forgotPassword);
const validateMock = vi.mocked(authApi.validateResetToken);
const resetMock = vi.mocked(authApi.resetPassword);

beforeEach(() => {
  vi.resetAllMocks();
});

// ¿Qué? Renderiza /reset-password junto a /login para poder seguir la redirección.
function renderResetPage(token = 'token-valido') {
  return render(
    <MemoryRouter initialEntries={[`/reset-password?token=${token}`]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage (HU-005)', () => {
  it('CA-005.1 — muestra el mensaje genérico de la HU después de enviar el correo', async () => {
    forgotMock.mockResolvedValue(undefined);
    renderWithRouter(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/Correo electrónico/), {
      target: { value: ' ana@correo.com ' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(
      await screen.findByText('Si el correo está registrado, recibirás un enlace de recuperación.'),
    ).toBeInTheDocument();
    expect(forgotMock).toHaveBeenCalledWith({ email: 'ana@correo.com' });
  });

  it('no envía un correo mal escrito', async () => {
    renderWithRouter(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/Correo electrónico/), { target: { value: 'ana@' } });
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(
      await screen.findByText('Ingresa un correo válido, por ejemplo: nombre@dominio.com'),
    ).toBeInTheDocument();
    expect(forgotMock).not.toHaveBeenCalled();
  });

  it('avisa cuando se superó el límite de intentos en vez de decir que se envió', async () => {
    forgotMock.mockRejectedValue(
      new ApiError('Demasiados intentos. Intenta de nuevo en unos minutos.', 'TOO_MANY_REQUESTS', 429),
    );
    renderWithRouter(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/Correo electrónico/), {
      target: { value: 'ana@correo.com' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    expect(
      await screen.findByText('Demasiados intentos. Intenta de nuevo en unos minutos.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/recibirás un enlace/)).not.toBeInTheDocument();
  });
});

describe('ResetPasswordPage (HU-005)', () => {
  it('CA-005.2 — al abrir un enlace expirado muestra el aviso y no el formulario', async () => {
    validateMock.mockRejectedValue(
      new ApiError('El enlace de recuperación expiró. Solicita uno nuevo.', 'TOKEN_EXPIRED', 400),
    );
    renderResetPage('token-expirado');

    expect(
      await screen.findByText('El enlace de recuperación expiró. Solicita uno nuevo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solicitar un nuevo enlace' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nueva contraseña/)).not.toBeInTheDocument();
    expect(validateMock).toHaveBeenCalledWith({ token: 'token-expirado' });
  });

  it('indica qué requisito le falta a la nueva contraseña', async () => {
    validateMock.mockResolvedValue(undefined);
    renderResetPage();
    fireEvent.change(await screen.findByLabelText(/^Nueva contraseña/), {
      target: { value: 'sinmayus1' },
    });
    fireEvent.change(screen.getByLabelText(/Confirmar nueva contraseña/), {
      target: { value: 'sinmayus1' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));

    expect(
      await screen.findByText('A la contraseña le falta: una mayúscula.'),
    ).toBeInTheDocument();
    expect(resetMock).not.toHaveBeenCalled();
  });

  it('CA-005.3 — al restablecer redirige al login con el mensaje de éxito', async () => {
    validateMock.mockResolvedValue(undefined);
    resetMock.mockResolvedValue(undefined);
    renderResetPage();
    fireEvent.change(await screen.findByLabelText(/^Nueva contraseña/), {
      target: { value: 'NuevaClave456' },
    });
    fireEvent.change(screen.getByLabelText(/Confirmar nueva contraseña/), {
      target: { value: 'NuevaClave456' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));

    expect(
      await screen.findByText(
        'Contraseña restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(resetMock).toHaveBeenCalledWith({ token: 'token-valido', newPassword: 'NuevaClave456' });
  });
});
