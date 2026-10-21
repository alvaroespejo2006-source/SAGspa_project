/**
 * Archivo: __tests__/pages/StaffSymptomsPage.test.tsx
 * Descripción: Tests de aceptación de la HU-018 en /staff/sintomas.
 * ¿Para qué? Verificar la bandeja (CA-018.1), el envío de la recomendación (CA-018.2) y el
 *   aviso de recomendación vacía en el reporte correcto (CA-018.3).
 */

import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { StaffSymptomsPage } from '@/pages/staff/StaffSymptomsPage';
import { ApiError } from '@/api/axios';
import type { PendingSymptomReport } from '@/types/symptom-reports';
import { renderWithRouter } from '../helpers';

vi.mock('@/api/symptom-reports');
import * as reportsApi from '@/api/symptom-reports';

function report(overrides: Partial<PendingSymptomReport>): PendingSymptomReport {
  return {
    id: 'r-1',
    clientId: 'c-1',
    petId: 'p-1',
    symptom: 'Se rasca mucho',
    daysWithSymptom: 3,
    notes: null,
    status: 'pending',
    recommendation: null,
    reviewedAt: null,
    createdAt: '2026-10-19T15:00:00.000Z',
    pet: { id: 'p-1', name: 'Max', species: 'canina' },
    client: { id: 'c-1', firstName: 'Ana', lastName: 'Ríos', phone: '3001234567' },
    ...overrides,
  };
}

const REPORTS = [
  report({}),
  report({ id: 'r-2', symptom: 'Tos', pet: { id: 'p-2', name: 'Mia', species: 'felina' } }),
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(reportsApi.listPendingReports).mockResolvedValue(REPORTS);
});

async function rows() {
  const list = await screen.findByRole('list', { name: 'Reportes pendientes' });
  return within(list).getAllByRole('listitem');
}

describe('StaffSymptomsPage (HU-018)', () => {
  it('CA-018.1 — muestra mascota con su especie, cliente, síntoma y fecha', async () => {
    renderWithRouter(<StaffSymptomsPage />);
    const [first, second] = await rows();

    expect(first).toHaveTextContent('Max (Canina) — Ana Ríos — 3001234567');
    expect(first).toHaveTextContent('Se rasca mucho');
    expect(first).toHaveTextContent(/Reportado el/);
    expect(second).toHaveTextContent('Mia (Felina)');
  });

  it('CA-018.3 — la recomendación vacía se avisa en ese reporte y no se envía', async () => {
    renderWithRouter(<StaffSymptomsPage />);
    const [, second] = await rows();
    await userEvent.click(within(second!).getByRole('button', { name: 'Enviar' }));

    expect(
      within(second!).getByText('Escribe la recomendación para el cliente.'),
    ).toBeInTheDocument();
    const [first] = await rows();
    expect(within(first!).queryByText(/Escribe la recomendación/)).not.toBeInTheDocument();
    expect(reportsApi.reviewReport).not.toHaveBeenCalled();
  });

  it('CA-018.2 — envía la recomendación y confirma que el cliente la ve', async () => {
    vi.mocked(reportsApi.reviewReport).mockResolvedValue(report({ status: 'reviewed' }));
    renderWithRouter(<StaffSymptomsPage />);
    const [first] = await rows();
    vi.mocked(reportsApi.listPendingReports).mockResolvedValue([REPORTS[1]!]);

    fireEvent.change(within(first!).getByLabelText(/Recomendación/), {
      target: { value: ' Tráelo mañana ' },
    });
    await userEvent.click(within(first!).getByRole('button', { name: 'Enviar' }));

    expect(reportsApi.reviewReport).toHaveBeenCalledWith('r-1', 'Tráelo mañana');
    expect(
      await screen.findByText('Recomendación enviada a Ana sobre Max. Ya la puede ver en su app.'),
    ).toBeInTheDocument();
    expect(await rows()).toHaveLength(1);
  });

  it('si otra persona ya lo respondió, lo dice en el reporte', async () => {
    vi.mocked(reportsApi.reviewReport).mockRejectedValue(
      new ApiError(
        'Este reporte ya fue revisado por otra persona del staff.',
        'REPORT_ALREADY_REVIEWED',
        400,
      ),
    );
    renderWithRouter(<StaffSymptomsPage />);
    const [first] = await rows();
    fireEvent.change(within(first!).getByLabelText(/Recomendación/), { target: { value: 'Ok' } });
    await userEvent.click(within(first!).getByRole('button', { name: 'Enviar' }));

    expect(
      await screen.findByText('Este reporte ya fue revisado por otra persona del staff.'),
    ).toBeInTheDocument();
  });
});
