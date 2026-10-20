/**
 * Archivo: __tests__/pages/StaffSuppliersPage.test.tsx
 * Descripción: Tests de aceptación de la HU-020 en /staff/proveedores.
 * ¿Para qué? Verificar crear (CA-020.1), editar (CA-020.2) y el mensaje al eliminar un
 *   proveedor con pedidos (CA-020.3).
 */

import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { StaffSuppliersPage } from '@/pages/staff/StaffSuppliersPage';
import type { Supplier } from '@/types/suppliers';
import { renderWithRouter } from '../helpers';

vi.mock('@/api/suppliers');
import * as suppliersApi from '@/api/suppliers';

const PETCOL: Supplier = {
  id: 's-1',
  name: 'PetCol',
  contactName: 'Laura Gómez',
  phone: '601 555 1234',
  email: 'ventas@petcol.com',
  address: null,
  active: true,
  createdAt: '2026-01-01',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(suppliersApi.listSuppliers).mockResolvedValue([PETCOL]);
});

describe('StaffSuppliersPage (HU-020)', () => {
  it('CA-020.1 — valida y crea un proveedor', async () => {
    vi.mocked(suppliersApi.createSupplier).mockResolvedValue(PETCOL);
    renderWithRouter(<StaffSuppliersPage />);
    fireEvent.change(await screen.findByLabelText(/^Nombre del proveedor/), {
      target: { value: 'Mascotas SAS' },
    });
    fireEvent.change(screen.getByLabelText(/^Teléfono/), { target: { value: 'llamar' } });
    await userEvent.click(screen.getByRole('button', { name: 'Crear proveedor' }));

    expect(await screen.findByText(/El teléfono solo puede tener números/)).toBeInTheDocument();
    expect(suppliersApi.createSupplier).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^Teléfono/), { target: { value: '3001234567' } });
    await userEvent.click(screen.getByRole('button', { name: 'Crear proveedor' }));

    expect(await screen.findByText('Proveedor creado.')).toBeInTheDocument();
    expect(suppliersApi.createSupplier).toHaveBeenCalledWith({
      name: 'Mascotas SAS',
      contactName: undefined,
      phone: '3001234567',
      email: undefined,
      address: undefined,
    });
  });

  it('CA-020.2 — edita los datos de contacto', async () => {
    vi.mocked(suppliersApi.updateSupplier).mockResolvedValue(PETCOL);
    renderWithRouter(<StaffSuppliersPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Editar PetCol' }));

    expect(screen.getByLabelText(/^Email/)).toHaveValue('ventas@petcol.com');
    fireEvent.change(screen.getByLabelText(/^Teléfono/), { target: { value: '+57 300 123 4567' } });
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: '' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
    expect(suppliersApi.updateSupplier).toHaveBeenCalledWith('s-1', {
      name: 'PetCol',
      contactName: 'Laura Gómez',
      phone: '+57 300 123 4567',
      email: '',
      address: '',
    });
  });

  it('CA-020.3 — explica que se desactivó por tener pedidos', async () => {
    const message =
      'El proveedor tiene pedidos asociados, así que se desactivó en lugar de eliminarse.';
    vi.mocked(suppliersApi.deleteSupplier).mockResolvedValue(message);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithRouter(<StaffSuppliersPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar PetCol' }));

    expect(confirmSpy).toHaveBeenCalledWith('¿Eliminar el proveedor "PetCol"?');
    expect(await screen.findByText(message)).toBeInTheDocument();
    confirmSpy.mockRestore();
  });
});
