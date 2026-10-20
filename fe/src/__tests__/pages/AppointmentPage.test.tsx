/**
 * Archivo: __tests__/pages/AppointmentPage.test.tsx
 * Descripción: Tests de aceptación de la HU-009 en el semáforo y en /app/cita.
 * ¿Para qué? Verificar el menú (CA-009.1), el aviso sin mascotas (CA-009.2b), las
 *   validaciones de fecha y hora (CA-009.3, CA-009.4), el mensaje de éxito (CA-009.5) y
 *   "Mis citas" (CA-009.6).
 * ¿Impacto? Si fallan, el cliente no sabría por qué no puede agendar ni en qué estado está su cita.
 */

import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AppointmentPage } from '@/pages/client/AppointmentPage';
import { ClientHomePage } from '@/pages/client/ClientHomePage';
import { ApiError } from '@/api/axios';
import type { Pet } from '@/types/pets';
import type { MyAppointment } from '@/types/appointments';
import { mockUser, renderWithRouter } from '../helpers';

vi.mock('@/api/pets');
vi.mock('@/api/services');
vi.mock('@/api/appointments');
import * as petsApi from '@/api/pets';
import * as servicesApi from '@/api/services';
import * as appointmentsApi from '@/api/appointments';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }));

const PET = { id: 'pet-1', name: 'Max', species: 'canina', skinConditions: [] } as unknown as Pet;
const SERVICE = {
  id: 'srv-1',
  name: 'Baño completo',
  description: null,
  price: 40000,
  durationMinutes: 60,
  active: true,
  createdAt: '2026-01-01',
};

function appointment(status: MyAppointment['status']): MyAppointment {
  return {
    id: `appt-${status}`,
    clientId: mockUser.id,
    petId: PET.id,
    serviceId: SERVICE.id,
    date: '2026-10-25',
    time: '10:00',
    status,
    notes: null,
    totalPrice: 40000,
    priceBreakdown: null,
    createdAt: '2026-10-19',
    pet: { id: PET.id, name: 'Max' },
    service: { id: SERVICE.id, name: 'Baño retirado' },
  };
}

// ¿Qué? Fecha local AAAA-MM-DD desplazada `days` días desde hoy.
function localDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(petsApi.listMyPets).mockResolvedValue([PET]);
  vi.mocked(servicesApi.listServices).mockResolvedValue([SERVICE]);
  vi.mocked(appointmentsApi.listMyAppointments).mockResolvedValue([]);
  vi.mocked(appointmentsApi.quoteAppointment).mockResolvedValue({
    petName: 'Max',
    base: 40000,
    lines: [],
    total: 40000,
    blocked: false,
    blockingConditions: [],
  } as never);
});

async function fillForm(date: string, time: string) {
  fireEvent.change(await screen.findByLabelText(/^Mascota/), { target: { value: PET.id } });
  fireEvent.change(screen.getByLabelText(/^Servicio/), { target: { value: SERVICE.id } });
  fireEvent.change(screen.getByLabelText(/^Fecha/), { target: { value: date } });
  fireEvent.change(screen.getByLabelText(/^Hora/), { target: { value: time } });
}

const submit = () => userEvent.click(screen.getByRole('button', { name: /Agendar cita/ }));

describe('Semáforo (HU-009)', () => {
  it('CA-009.1 — muestra las tres opciones del semáforo', async () => {
    renderWithRouter(<ClientHomePage />);

    // ¿Qué? Se espera a los enlaces: al cargar las mascotas, 🟢 y 🟡 pasan de deshabilitadas a links.
    expect(await screen.findByRole('link', { name: /Cita de Grooming/ })).toHaveAttribute(
      'href',
      '/app/cita',
    );
    expect(screen.getByRole('link', { name: /Síntoma Leve/ })).toHaveAttribute(
      'href',
      '/app/sintoma',
    );
    expect(screen.getByRole('link', { name: /Emergencia/ })).toHaveAttribute(
      'href',
      '/app/emergencia',
    );
  });

  it('un error de red no se muestra como "no tienes mascotas"', async () => {
    vi.mocked(petsApi.listMyPets).mockRejectedValue(
      new ApiError('No se pudo conectar con el servidor.', null, null),
    );
    renderWithRouter(<ClientHomePage />);

    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument();
    expect(screen.queryByText(/no tienes mascotas registradas/)).not.toBeInTheDocument();
  });
});

describe('AppointmentPage (HU-009)', () => {
  it('CA-009.2b — sin mascotas muestra el aviso y no el formulario', async () => {
    vi.mocked(petsApi.listMyPets).mockResolvedValue([]);
    renderWithRouter(<AppointmentPage />);

    expect(await screen.findByText(/Todavía no tienes mascotas registradas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Agendar cita/ })).not.toBeInTheDocument();
  });

  it('CA-009.3 — no deja agendar para hoy', async () => {
    renderWithRouter(<AppointmentPage />);
    await fillForm(localDate(0), '10:00');
    await submit();

    expect(await screen.findByText('La cita debe ser a partir de mañana')).toBeInTheDocument();
    expect(appointmentsApi.createAppointment).not.toHaveBeenCalled();
  });

  it('CA-009.4 — no deja agendar fuera del horario de atención', async () => {
    renderWithRouter(<AppointmentPage />);
    await fillForm(localDate(1), '19:30');
    await submit();

    expect(
      await screen.findByText('La hora debe estar entre las 9:00am y las 6:00pm'),
    ).toBeInTheDocument();
    expect(appointmentsApi.createAppointment).not.toHaveBeenCalled();
  });

  it('CA-009.5 — al agendar dice que la cita quedó pendiente', async () => {
    vi.mocked(appointmentsApi.createAppointment).mockResolvedValue(appointment('pending'));
    renderWithRouter(<AppointmentPage />);
    await fillForm(localDate(1), '10:00');
    await submit();

    expect(
      await screen.findByText(
        '¡Cita agendada! Quedó en estado pendiente y te contactaremos para confirmarla.',
      ),
    ).toBeInTheDocument();
    expect(appointmentsApi.createAppointment).toHaveBeenCalledWith({
      petId: PET.id,
      serviceId: SERVICE.id,
      date: localDate(1),
      time: '10:00',
    });
  });

  it('CA-009.6 — "Mis citas" muestra cada estado con su nombre', async () => {
    vi.mocked(appointmentsApi.listMyAppointments).mockResolvedValue([
      appointment('pending'),
      appointment('confirmed'),
      appointment('completed'),
      appointment('cancelled'),
    ]);
    renderWithRouter(<AppointmentPage />);

    for (const label of ['Pendiente', 'Confirmada', 'Atendida', 'Cancelada']) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
    // ¿Qué? El nombre viene del backend aunque el servicio ya no esté en el catálogo activo.
    expect(screen.getAllByText(/Baño retirado \(Max\)/)).toHaveLength(4);
  });
});
