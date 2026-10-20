/**
 * Archivo: __tests__/pages/Emergency.test.tsx
 * Descripción: Tests de aceptación de la HU-011 en /app/emergencia y /staff/emergencia.
 * ¿Para qué? Verificar que el cliente ve números y mapa sin formularios (CA-011.1 a CA-011.3)
 *   y que el staff puede editarlos (CA-011.4).
 * ¿Impacto? Si fallan, en una emergencia el cliente podría no ver a quién llamar.
 */

import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { EmergencyPage } from '@/pages/client/EmergencyPage';
import { StaffEmergencyPage } from '@/pages/staff/StaffEmergencyPage';
import { ApiError } from '@/api/axios';
import type { EmergencyInfo } from '@/types/emergency';
import { renderWithRouter } from '../helpers';

vi.mock('@/api/emergency');
import * as emergencyApi from '@/api/emergency';

const CONFIGURED: EmergencyInfo = {
  searchQuery: 'veterinarias 24 horas cerca de Calle 10',
  emergencyPhones: [
    { label: 'Línea de emergencias 123', phone: '123', category: 'linea_emergencia' },
    { label: 'Clínica Central', phone: '601 555 1234', category: 'clinica_24h' },
  ],
  configured: true,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(emergencyApi.getEmergencyInfo).mockResolvedValue(CONFIGURED);
});

describe('EmergencyPage (HU-011)', () => {
  it('CA-011.1 / CA-011.3 — muestra los números sin formularios, la clínica 24 h primero', async () => {
    renderWithRouter(<EmergencyPage />);

    const list = await screen.findByRole('list', { name: 'Números de emergencia' });
    const items = await within(list).findAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Clínica Central');
    expect(items[0]).toHaveTextContent('Clínica veterinaria 24 horas');
    expect(items[1]).toHaveTextContent('Línea de emergencias animales');
    expect(within(list).getByRole('link', { name: '601 555 1234' })).toHaveAttribute(
      'href',
      'tel:6015551234',
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('CA-011.2 — sin clave de mapas ofrece abrir Google Maps con la búsqueda configurada', async () => {
    renderWithRouter(<EmergencyPage />);

    const link = await screen.findByRole('link', { name: /Abrir mapa de veterinarias cercanas/ });
    expect(link.getAttribute('href')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIGURED.searchQuery)}`,
    );
    expect(screen.queryByText(/VITE_MAPS_API_KEY/)).not.toBeInTheDocument();
  });

  it('si la API falla muestra igual la línea 123', async () => {
    vi.mocked(emergencyApi.getEmergencyInfo).mockRejectedValue(
      new ApiError('No se pudo conectar con el servidor.', null, null),
    );
    renderWithRouter(<EmergencyPage />);

    expect(await screen.findByRole('link', { name: '123' })).toHaveAttribute('href', 'tel:123');
    expect(screen.getByText(/llama a la línea 123/)).toBeInTheDocument();
  });
});

describe('StaffEmergencyPage (HU-011)', () => {
  it('CA-011.4 — el staff agrega un número y guarda', async () => {
    vi.mocked(emergencyApi.updateEmergencyInfo).mockImplementation(async (data) => ({
      ...data,
      configured: true,
    }));
    renderWithRouter(<StaffEmergencyPage />);

    await userEvent.click(await screen.findByRole('button', { name: '+ Agregar número' }));
    fireEvent.change(screen.getByLabelText(/Tipo del número 3/), { target: { value: 'otro' } });
    fireEvent.change(screen.getByLabelText(/Nombre del número 3/), {
      target: { value: 'Protección animal' },
    });
    fireEvent.change(screen.getByLabelText(/Teléfono del número 3/), { target: { value: '195' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(
      await screen.findByText('Información de emergencia guardada. Los clientes ya la ven.'),
    ).toBeInTheDocument();
    expect(emergencyApi.updateEmergencyInfo).toHaveBeenCalledWith({
      searchQuery: CONFIGURED.searchQuery,
      emergencyPhones: [
        ...CONFIGURED.emergencyPhones,
        { label: 'Protección animal', phone: '195', category: 'otro' },
      ],
    });
  });

  it('CA-011.3 — no deja guardar sin una clínica 24 horas', async () => {
    renderWithRouter(<StaffEmergencyPage />);
    const rows = await screen.findAllByTestId('emergency-phone-row');
    await userEvent.click(within(rows[1]!).getByRole('button', { name: 'Quitar este número' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(
      await screen.findByText('Agrega al menos una clínica veterinaria 24 horas.'),
    ).toBeInTheDocument();
    expect(emergencyApi.updateEmergencyInfo).not.toHaveBeenCalled();
  });

  it('avisa cuando todavía no se configuró nada', async () => {
    vi.mocked(emergencyApi.getEmergencyInfo).mockResolvedValue({
      ...CONFIGURED,
      emergencyPhones: [CONFIGURED.emergencyPhones[0]!],
      configured: false,
    });
    renderWithRouter(<StaffEmergencyPage />);

    expect(
      await screen.findByText(/Todavía no se ha guardado ninguna configuración/),
    ).toBeInTheDocument();
  });
});
