/**
 * Archivo: __tests__/pages/SymptomReportPage.test.tsx
 * Descripción: Tests de aceptación de la HU-010 en /app/sintoma.
 * ¿Para qué? Verificar el formulario (CA-010.1), los campos obligatorios (CA-010.2), el
 *   mensaje de envío (CA-010.3) y la recomendación en "Mis reportes" (CA-010.4).
 * ¿Impacto? Si fallan, el cliente no sabría qué le falta al reporte ni qué le recomendaron.
 */

import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SymptomReportPage } from '@/pages/client/SymptomReportPage';
import type { Pet } from '@/types/pets';
import type { MySymptomReport } from '@/types/symptom-reports';
import { renderWithRouter } from '../helpers';

vi.mock('@/api/pets');
vi.mock('@/api/symptom-reports');
import * as petsApi from '@/api/pets';
import * as reportsApi from '@/api/symptom-reports';

const PET = { id: 'pet-1', name: 'Max' } as Pet;

function report(overrides: Partial<MySymptomReport>): MySymptomReport {
  return {
    id: 'r-1',
    clientId: 'c-1',
    petId: PET.id,
    symptom: 'Se rasca mucho',
    daysWithSymptom: 3,
    notes: null,
    status: 'pending',
    recommendation: null,
    reviewedAt: null,
    createdAt: '2026-10-19',
    pet: { id: PET.id, name: 'Max' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(petsApi.listMyPets).mockResolvedValue([PET]);
  vi.mocked(reportsApi.listMyReports).mockResolvedValue([]);
});

const submit = () => userEvent.click(screen.getByRole('button', { name: /Enviar reporte/ }));

describe('SymptomReportPage (HU-010)', () => {
  it('CA-010.1 — muestra mascota, síntoma y días', async () => {
    renderWithRouter(<SymptomReportPage />);

    expect(await screen.findByRole('option', { name: 'Max' })).toBeInTheDocument();
    expect(screen.getByLabelText(/¿Qué síntomas tiene\?/)).toBeInTheDocument();
    expect(screen.getByLabelText(/¿Hace cuántos días\?/)).toBeInTheDocument();
  });

  it('CA-010.2 — pide completar el síntoma y no envía', async () => {
    renderWithRouter(<SymptomReportPage />);
    fireEvent.change(await screen.findByLabelText(/^Mascota/), { target: { value: PET.id } });
    fireEvent.change(screen.getByLabelText(/¿Qué síntomas tiene\?/), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText(/¿Hace cuántos días\?/), { target: { value: '2' } });
    await submit();

    expect(await screen.findByText('Describe el síntoma de tu mascota.')).toBeInTheDocument();
    expect(reportsApi.createSymptomReport).not.toHaveBeenCalled();
  });

  it('CA-010.3 — al enviar dice que el staff lo revisará', async () => {
    vi.mocked(reportsApi.createSymptomReport).mockResolvedValue(report({}));
    renderWithRouter(<SymptomReportPage />);
    fireEvent.change(await screen.findByLabelText(/^Mascota/), { target: { value: PET.id } });
    fireEvent.change(screen.getByLabelText(/¿Qué síntomas tiene\?/), {
      target: { value: ' Se rasca mucho ' },
    });
    fireEvent.change(screen.getByLabelText(/¿Hace cuántos días\?/), { target: { value: '3' } });
    await submit();

    expect(
      await screen.findByText('Reporte enviado. Alguien del staff lo revisará pronto.'),
    ).toBeInTheDocument();
    expect(reportsApi.createSymptomReport).toHaveBeenCalledWith({
      petId: PET.id,
      symptom: 'Se rasca mucho',
      daysWithSymptom: 3,
    });
  });

  it('CA-010.4 — muestra la recomendación del staff y avisa cuando aún no la hay', async () => {
    vi.mocked(reportsApi.listMyReports).mockResolvedValue([
      report({ id: 'r-1', status: 'reviewed', recommendation: 'Tráelo para revisión' }),
      report({ id: 'r-2', symptom: 'Tos' }),
    ]);
    renderWithRouter(<SymptomReportPage />);

    expect(await screen.findByText('Tráelo para revisión')).toBeInTheDocument();
    expect(screen.getByText('Max — Tos')).toBeInTheDocument();
    expect(screen.getByText('El staff todavía no ha revisado este reporte.')).toBeInTheDocument();
  });

  it('sin mascotas muestra el aviso y no el formulario', async () => {
    vi.mocked(petsApi.listMyPets).mockResolvedValue([]);
    renderWithRouter(<SymptomReportPage />);

    expect(await screen.findByText(/Todavía no tienes mascotas registradas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enviar reporte/ })).not.toBeInTheDocument();
  });
});
