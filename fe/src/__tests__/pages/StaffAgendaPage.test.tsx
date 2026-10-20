/**
 * Archivo: __tests__/pages/StaffAgendaPage.test.tsx
 * Descripción: Tests de aceptación de la HU-017 en /staff/agenda.
 * ¿Para qué? Verificar las citas del día (CA-017.1), el cambio de fecha (CA-017.2), confirmar y
 *   atender (CA-017.3, CA-017.4) y el mensaje sin citas (CA-017.5).
 */

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { StaffAgendaPage } from '@/pages/staff/StaffAgendaPage';
import type { AgendaAppointment } from '@/types/appointments';
import { renderWithRouter } from '../helpers';

vi.mock('@/api/appointments');
import * as appointmentsApi from '@/api/appointments';

function appt(overrides: Partial<AgendaAppointment>): AgendaAppointment {
  return {
    id: 'a-1',
    time: '09:30',
    status: 'pending',
    pet: { id: 'p-1', name: 'Max' },
    client: { id: 'c-1', firstName: 'Ana', lastName: 'Ríos', phone: '3001234567' },
    service: { id: 's-1', name: 'Baño completo', durationMinutes: 60 },
    ...overrides,
  };
}

function localDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('StaffAgendaPage (HU-017)', () => {
  it('CA-017.1 — abre en la fecha local de hoy y muestra cada cita con sus datos', async () => {
    vi.mocked(appointmentsApi.getAgenda).mockResolvedValue([appt({})]);
    renderWithRouter(<StaffAgendaPage />);

    const list = await screen.findByRole('list', { name: 'Citas del día' });
    expect(within(list).getByText('09:30 — Baño completo')).toBeInTheDocument();
    expect(within(list).getByText(/Max — Ana Ríos — 3001234567/)).toBeInTheDocument();
    expect(within(list).getByText('Pendiente')).toBeInTheDocument();
    expect(appointmentsApi.getAgenda).toHaveBeenCalledWith(localDate(0));
  });

  it('CA-017.2 — los botones cambian de día', async () => {
    vi.mocked(appointmentsApi.getAgenda).mockResolvedValue([]);
    renderWithRouter(<StaffAgendaPage />);
    await screen.findByText('No hay citas programadas para este día.');

    await userEvent.click(screen.getByRole('button', { name: 'Día siguiente →' }));
    expect(appointmentsApi.getAgenda).toHaveBeenLastCalledWith(localDate(1));
    await userEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(appointmentsApi.getAgenda).toHaveBeenLastCalledWith(localDate(0));
  });

  it('CA-017.3 / CA-017.4 — confirmar y marcar como atendida', async () => {
    vi.mocked(appointmentsApi.getAgenda).mockResolvedValue([
      appt({ id: 'a-1' }),
      appt({ id: 'a-2', time: '11:00', status: 'confirmed' }),
      appt({ id: 'a-3', time: '14:00', status: 'completed' }),
    ]);
    vi.mocked(appointmentsApi.updateAppointmentStatus).mockResolvedValue({} as never);
    renderWithRouter(<StaffAgendaPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    expect(appointmentsApi.updateAppointmentStatus).toHaveBeenCalledWith('a-1', 'confirmed');
    expect(await screen.findByText(/Cita confirmada/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Marcar como atendida' }));
    expect(appointmentsApi.updateAppointmentStatus).toHaveBeenCalledWith('a-2', 'completed');
    // ¿Qué? La cita atendida se muestra como "Atendida" y ya no tiene botones.
    expect(screen.getByText('Atendida')).toBeInTheDocument();
  });

  it('cancelar pide confirmación', async () => {
    vi.mocked(appointmentsApi.getAgenda).mockResolvedValue([appt({})]);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderWithRouter(<StaffAgendaPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(confirmSpy).toHaveBeenCalledWith('¿Cancelar la cita de Max a las 09:30?');
    expect(appointmentsApi.updateAppointmentStatus).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('CA-017.5 — sin citas muestra el mensaje de la HU', async () => {
    vi.mocked(appointmentsApi.getAgenda).mockResolvedValue([]);
    renderWithRouter(<StaffAgendaPage />);

    expect(await screen.findByText('No hay citas programadas para este día.')).toBeInTheDocument();
  });
});
