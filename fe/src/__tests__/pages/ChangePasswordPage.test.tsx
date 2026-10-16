/**
 * Archivo: __tests__/pages/ChangePasswordPage.test.tsx
 * Descripción: Tests de aceptación de la HU-004 en la página /change-password.
 * ¿Para qué? Verificar en la interfaz los criterios CA-004.1 a CA-004.4.
 * ¿Impacto? Si fallan, el usuario vería mensajes equivocados o podría enviar datos inválidos.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ChangePasswordPage } from '@/pages/ChangePasswordPage';
import { ApiError } from '@/api/axios';
import { mockUser, renderWithRouter } from '../helpers';

vi.mock('@/api/auth');
import * as authApi from '@/api/auth';

vi.mock('@/hooks/useAuth');
import { useAuth } from '@/hooks/useAuth';

const changePasswordMock = vi.mocked(authApi.changePassword);

beforeEach(() => {
  changePasswordMock.mockReset();
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    user: mockUser,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  });
});

function fillForm(current: string, next: string, confirm = next) {
  fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: current } });
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: next } });
  fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), {
    target: { value: confirm },
  });
}

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

describe('ChangePasswordPage (HU-004)', () => {
  it('CA-004.1 — muestra el error del servidor si la contraseña actual es incorrecta', async () => {
    changePasswordMock.mockRejectedValue(
      new ApiError('La contraseña actual es incorrecta.', 'INVALID_CURRENT_PASSWORD', 400),
    );
    renderWithRouter(<ChangePasswordPage />);
    fillForm('Incorrecta123', 'NuevaClave456');
    await submit();

    expect(await screen.findByText('La contraseña actual es incorrecta.')).toBeInTheDocument();
  });

  it('CA-004.2 — no permite que la nueva sea igual a la actual', async () => {
    renderWithRouter(<ChangePasswordPage />);
    fillForm('Secreta123', 'Secreta123');
    await submit();

    expect(
      await screen.findByText('La nueva contraseña debe ser diferente a la actual.'),
    ).toBeInTheDocument();
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('CA-004.3 — cambio exitoso muestra la confirmación', async () => {
    changePasswordMock.mockResolvedValue(undefined);
    renderWithRouter(<ChangePasswordPage />);
    fillForm('Secreta123', 'NuevaClave456');
    await submit();

    expect(await screen.findByText('Contraseña cambiada correctamente.')).toBeInTheDocument();
    expect(changePasswordMock).toHaveBeenCalledWith({
      currentPassword: 'Secreta123',
      newPassword: 'NuevaClave456',
    });
  });

  it('CA-004.4 — con campos vacíos muestra el requisito que falta, no "diferente a la actual"', async () => {
    renderWithRouter(<ChangePasswordPage />);
    await submit();

    expect(await screen.findByText('La contraseña actual es requerida.')).toBeInTheDocument();
    expect(
      screen.getByText('La contraseña debe tener 8+ caracteres, mayúscula, minúscula y número.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('La nueva contraseña debe ser diferente a la actual.'),
    ).not.toBeInTheDocument();
  });

  it('avisa si la confirmación no coincide', async () => {
    renderWithRouter(<ChangePasswordPage />);
    fillForm('Secreta123', 'NuevaClave456', 'OtraClave789');
    await submit();

    await waitFor(() =>
      expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument(),
    );
    expect(changePasswordMock).not.toHaveBeenCalled();
  });
});
