/**
 * Archivo: __tests__/pages/StaffCreateAccountPage.test.tsx
 * Descripción: Tests de aceptación de la HU-008 en /staff/nueva-cuenta.
 * ¿Para qué? Verificar el formulario (CA-008.2), el error de correo duplicado (CA-008.3)
 *   y que la cuenta nueva aparezca en el listado (CA-008.4).
 * ¿Impacto? Si fallan, el staff no sabría si la cuenta se creó ni por qué falló.
 */

import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { StaffCreateAccountPage } from '@/pages/staff/StaffCreateAccountPage';
import { ApiError } from '@/api/axios';
import { mockUser, renderWithRouter } from '../helpers';

vi.mock('@/api/auth');
import * as authApi from '@/api/auth';

vi.mock('@/api/staff');
import * as staffApi from '@/api/staff';

const createStaffMock = vi.mocked(authApi.createStaff);
const listStaffMock = vi.mocked(staffApi.listStaff);

const CURRENT_STAFF = {
  id: 'staff-1',
  firstName: 'Ana',
  lastName: 'Ríos',
  email: 'ana@groomingspa.com',
  isEmailVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
};

const NEW_STAFF = {
  id: 'staff-2',
  firstName: 'Laura',
  lastName: 'Gómez',
  email: 'laura@groomingspa.com',
  isEmailVerified: false,
  createdAt: '2026-10-19T00:00:00Z',
};

beforeEach(() => {
  vi.resetAllMocks();
  listStaffMock.mockResolvedValue([CURRENT_STAFF]);
});

function fillForm(data: { firstName: string; lastName: string; email: string; password: string }) {
  fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: data.firstName } });
  fireEvent.change(screen.getByLabelText(/^Apellido/), { target: { value: data.lastName } });
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: data.email } });
  fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: data.password } });
}

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

describe('StaffCreateAccountPage (HU-008)', () => {
  it('CA-008.2 — muestra los campos nombre, apellido, correo y contraseña', async () => {
    renderWithRouter(<StaffCreateAccountPage />);

    expect(screen.getByLabelText(/^Nombre/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Apellido/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Contraseña/)).toHaveAttribute('type', 'password');
    expect(await screen.findByText('ana@groomingspa.com')).toBeInTheDocument();
  });

  it('valida los campos antes de enviar', async () => {
    renderWithRouter(<StaffCreateAccountPage />);
    fillForm({ firstName: 'L4ura', lastName: 'G', email: 'laura@', password: 'debil' });
    await submit();

    expect(await screen.findByText('El nombre solo puede contener letras.')).toBeInTheDocument();
    expect(screen.getByText('El apellido debe tener al menos 2 caracteres.')).toBeInTheDocument();
    expect(
      screen.getByText('Ingresa un correo válido, por ejemplo: nombre@dominio.com'),
    ).toBeInTheDocument();
    expect(screen.getByText(/^A la contraseña le falta:/)).toBeInTheDocument();
    expect(createStaffMock).not.toHaveBeenCalled();
  });

  it('CA-008.3 — muestra el error de correo ya registrado', async () => {
    createStaffMock.mockRejectedValue(new ApiError('El email ya está registrado.', 'CONFLICT', 409));
    renderWithRouter(<StaffCreateAccountPage />);
    fillForm({ ...NEW_STAFF, email: CURRENT_STAFF.email, password: 'StaffNueva123' });
    await submit();

    expect(await screen.findByText('El email ya está registrado.')).toBeInTheDocument();
  });

  it('CA-008.4 — tras crear la cuenta, aparece en el listado del equipo', async () => {
    createStaffMock.mockResolvedValue({ ...mockUser, ...NEW_STAFF, role: 'staff' });
    renderWithRouter(<StaffCreateAccountPage />);
    await screen.findByText(CURRENT_STAFF.email);

    listStaffMock.mockResolvedValue([NEW_STAFF, CURRENT_STAFF]);
    fillForm({ ...NEW_STAFF, email: ` ${NEW_STAFF.email} `, password: 'StaffNueva123' });
    await submit();

    expect(
      await screen.findByText(
        `Cuenta de staff creada. Enviamos un correo a ${NEW_STAFF.email} para que active la cuenta antes de iniciar sesión.`,
      ),
    ).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Cuentas de staff' });
    expect(await within(list).findByText(NEW_STAFF.email)).toBeInTheDocument();
    expect(within(list).getByText('Pendiente de verificar')).toBeInTheDocument();
    expect(createStaffMock).toHaveBeenCalledWith({
      firstName: 'Laura',
      lastName: 'Gómez',
      email: NEW_STAFF.email,
      password: 'StaffNueva123',
    });
  });
});
