/**
 * Archivo: __tests__/components/LoginForm.test.tsx
 * Descripción: Tests de aceptación de la HU-002 en el formulario de inicio de sesión.
 * ¿Para qué? Verificar en la interfaz los criterios CA-002.1 a CA-002.5 y CA-002.7.
 * ¿Impacto? Si fallan, el usuario no sabría por qué no puede entrar o terminaría en la vista equivocada.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { LoginForm } from '@/components/auth/LoginForm';
import { mockUser, renderWithRouter } from '../helpers';

vi.mock('@/hooks/useAuth');
import { useAuth } from '@/hooks/useAuth';

const mockUseAuth = vi.mocked(useAuth);
const loginMock = vi.fn();

beforeEach(() => {
  loginMock.mockReset();
  mockUseAuth.mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    login: loginMock,
    register: vi.fn(),
    logout: vi.fn(),
  });
});

function fillForm(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Contraseña', { exact: true }), {
    target: { value: password },
  });
}

describe('LoginForm (HU-002)', () => {
  it('CA-002.1 — muestra correo, contraseña y el botón "Iniciar sesión"', () => {
    renderWithRouter(<LoginForm onSuccess={vi.fn()} />);

    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('CA-002.1 — valida los campos sin llamar a la API', async () => {
    renderWithRouter(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('El correo es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es obligatoria.')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('CA-002.1 — rechaza un correo mal escrito', async () => {
    renderWithRouter(<LoginForm onSuccess={vi.fn()} />);
    fillForm('laura@', 'Secreta123');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(
      await screen.findByText('Ingresa un correo válido, por ejemplo: nombre@dominio.com'),
    ).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('CA-002.2 — muestra "Credenciales inválidas." cuando el servidor rechaza el login', async () => {
    loginMock.mockRejectedValue(new Error('Credenciales inválidas.'));
    renderWithRouter(<LoginForm onSuccess={vi.fn()} />);
    fillForm('laura@example.com', 'Incorrecta1');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Credenciales inválidas.')).toBeInTheDocument();
  });

  it('CA-002.4 / CA-002.5 — entrega el perfil (con su rol) a quien decide la navegación', async () => {
    const staffProfile = { ...mockUser, role: 'staff' as const };
    loginMock.mockResolvedValue(staffProfile);
    const onSuccess = vi.fn();
    renderWithRouter(<LoginForm onSuccess={onSuccess} />);
    fillForm('  staff@groomingspa.com ', 'StaffPass123');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(staffProfile));
    // ¿Qué? El correo se envía sin espacios alrededor.
    expect(loginMock).toHaveBeenCalledWith({
      email: 'staff@groomingspa.com',
      password: 'StaffPass123',
    });
  });

  it('CA-002.7 — deshabilita el botón mientras se valida el login', async () => {
    let resolveLogin!: (value: typeof mockUser) => void;
    loginMock.mockReturnValue(new Promise((resolve) => (resolveLogin = resolve)));
    renderWithRouter(<LoginForm onSuccess={vi.fn()} />);
    fillForm('laura@example.com', 'Secreta123');

    const button = screen.getByRole('button', { name: 'Iniciar sesión' });
    await userEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());
    resolveLogin(mockUser);
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});
