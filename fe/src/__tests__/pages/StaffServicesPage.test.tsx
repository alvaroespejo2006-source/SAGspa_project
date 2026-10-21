/**
 * Archivo: __tests__/pages/StaffServicesPage.test.tsx
 * Descripción: Tests de aceptación de la HU-014 en /staff/servicios.
 * ¿Para qué? Verificar crear (CA-014.1), editar el precio (CA-014.2) y el mensaje al eliminar
 *   un servicio con citas (CA-014.3).
 */

import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { StaffServicesPage } from '@/pages/staff/StaffServicesPage';
import type { Service } from '@/types/services';
import { renderWithRouter } from '../helpers';

vi.mock('@/api/services');
import * as servicesApi from '@/api/services';

const BATH: Service = {
  id: 'srv-1',
  name: 'Baño completo',
  description: null,
  price: 40000,
  durationMinutes: 60,
  active: true,
  createdAt: '2026-01-01',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(servicesApi.listServicesForStaff).mockResolvedValue([BATH]);
});

describe('StaffServicesPage (HU-014)', () => {
  it('CA-014.1 — valida y crea un servicio', async () => {
    vi.mocked(servicesApi.createService).mockResolvedValue(BATH);
    renderWithRouter(<StaffServicesPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Crear servicio' }));

    expect(
      await screen.findByText('El nombre del servicio debe tener al menos 2 caracteres.'),
    ).toBeInTheDocument();
    expect(servicesApi.createService).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^Nombre del servicio/), {
      target: { value: ' Corte ' },
    });
    fireEvent.change(screen.getByLabelText(/^Precio/), { target: { value: '30000' } });
    fireEvent.change(screen.getByLabelText(/^Duración/), { target: { value: '45' } });
    await userEvent.click(screen.getByRole('button', { name: 'Crear servicio' }));

    expect(await screen.findByText(/Servicio creado/)).toBeInTheDocument();
    expect(servicesApi.createService).toHaveBeenCalledWith({
      name: 'Corte',
      description: undefined,
      price: 30000,
      durationMinutes: 45,
    });
  });

  it('CA-014.2 — edita el precio de un servicio existente', async () => {
    vi.mocked(servicesApi.updateService).mockResolvedValue({ ...BATH, price: 45000 });
    renderWithRouter(<StaffServicesPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Baño completo' }));

    const price = screen.getByLabelText(/^Precio/);
    expect(price).toHaveValue(40000);
    fireEvent.change(price, { target: { value: '45000' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText(/Cambios guardados/)).toBeInTheDocument();
    expect(servicesApi.updateService).toHaveBeenCalledWith('srv-1', {
      name: 'Baño completo',
      description: undefined,
      price: 45000,
      durationMinutes: 60,
    });
  });

  it('CA-014.3 — pide confirmación y explica que se desactivó por tener citas', async () => {
    const message =
      'El servicio tiene citas asociadas, así que se desactivó en lugar de eliminarse.';
    vi.mocked(servicesApi.deleteService).mockResolvedValue(message);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithRouter(<StaffServicesPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar Baño completo' }));

    expect(confirmSpy).toHaveBeenCalledWith('¿Eliminar el servicio "Baño completo"?');
    expect(await screen.findByText(message)).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('si se cancela la confirmación, no elimina', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderWithRouter(<StaffServicesPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar Baño completo' }));

    expect(servicesApi.deleteService).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
