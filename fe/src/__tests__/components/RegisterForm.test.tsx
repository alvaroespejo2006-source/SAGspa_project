/**
 * Archivo: __tests__/components/RegisterForm.test.tsx
 * Descripción: Tests de aceptación de la HU-001 en el formulario de registro.
 * ¿Para qué? Verificar en la interfaz los criterios CA-001.1 a CA-001.5 y CA-001.9.
 * ¿Impacto? Si fallan, el cliente vería mensajes confusos o podría enviar el registro dos veces.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { renderWithRouter } from '../helpers';

vi.mock('@/hooks/useAuth');
import { useAuth } from '@/hooks/useAuth';

const mockUseAuth = vi.mocked(useAuth);
const registerMock = vi.fn();

beforeEach(() => {
  registerMock.mockReset();
  mockUseAuth.mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    login: vi.fn(),
    register: registerMock,
    logout: vi.fn(),
  });
});

// ¿Qué? Llena el formulario con datos válidos; `overrides` cambia campos puntuales.
async function fillForm(overrides: Partial<Record<string, string>> = {}) {
  const values = {
    'Número de documento': '1012345678',
    Nombre: 'Laura',
    Apellido: 'Gómez',
    Teléfono: '3001234567',
    'Correo electrónico': 'laura@example.com',
    Contraseña: 'Secreta123',
    'Confirmar contraseña': 'Secreta123',
    ...overrides,
  };
  // ¿Qué? fireEvent.change en vez de userEvent.type — escribir letra por letra en jsdom
  //   hace que el test supere los 5 s por defecto.
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
  }
  await userEvent.click(screen.getByRole('checkbox'));
}

describe('RegisterForm (HU-001)', () => {
  it('CA-001.1 — muestra los 7 campos del registro', () => {
    renderWithRouter(<RegisterForm />);

    for (const label of [
      'Número de documento',
      'Nombre',
      'Apellido',
      'Teléfono',
      'Correo electrónico',
      'Contraseña',
      'Confirmar contraseña',
    ]) {
      expect(screen.getByLabelText(label, { exact: true })).toBeInTheDocument();
    }
  });

  it('CA-001.2 — exige el teléfono', async () => {
    renderWithRouter(<RegisterForm />);
    await fillForm({ Teléfono: '' });
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('El teléfono es obligatorio.')).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('CA-001.3 — indica qué requisitos de la contraseña faltan', async () => {
    renderWithRouter(<RegisterForm />);
    await fillForm({ Contraseña: 'secreta', 'Confirmar contraseña': 'secreta' });
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByText(
        'A la contraseña le falta: al menos 8 caracteres, una mayúscula, un número.',
      ),
    ).toBeInTheDocument();
  });

  it('CA-001.4 — avisa cuando las contraseñas no coinciden', async () => {
    renderWithRouter(<RegisterForm />);
    await fillForm({ 'Confirmar contraseña': 'Otra12345' });
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
  });

  it('CA-001.5 — al registrarse pide revisar el correo', async () => {
    registerMock.mockResolvedValue(undefined);
    renderWithRouter(<RegisterForm />);
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('¡Ya casi! Revisa tu correo')).toBeInTheDocument();
    expect(registerMock).toHaveBeenCalledWith({
      documentId: '1012345678',
      firstName: 'Laura',
      lastName: 'Gómez',
      phone: '3001234567',
      email: 'laura@example.com',
      password: 'Secreta123',
    });
  });

  it('CA-001.6 — muestra el error del servidor si el correo o documento ya existen', async () => {
    registerMock.mockRejectedValue(new Error('El email o el documento ya están registrados.'));
    renderWithRouter(<RegisterForm />);
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByText('El email o el documento ya están registrados.'),
    ).toBeInTheDocument();
  });

  it('CA-001.9 — deshabilita el botón mientras se envía', async () => {
    // ¿Qué? Promesa que no se resuelve hasta que el test lo decida.
    let resolveRegister!: () => void;
    registerMock.mockReturnValue(new Promise<void>((resolve) => (resolveRegister = resolve)));
    renderWithRouter(<RegisterForm />);
    await fillForm();

    const button = screen.getByRole('button', { name: 'Crear cuenta' });
    await userEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveAttribute('aria-busy', 'true');

    resolveRegister();
    expect(await screen.findByText('¡Ya casi! Revisa tu correo')).toBeInTheDocument();
  });
});
