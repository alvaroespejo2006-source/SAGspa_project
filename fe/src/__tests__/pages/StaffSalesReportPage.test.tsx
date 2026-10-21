/**
 * Archivo: __tests__/pages/StaffSalesReportPage.test.tsx
 * Descripción: Tests de aceptación de la HU-022 en /staff/reporte-ventas.
 * ¿Para qué? Verificar el total, las transacciones y el detalle por producto (CA-022.1), el
 *   desglose app/mostrador (CA-022.3) y la validación del rango.
 */

import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { StaffSalesReportPage } from '@/pages/staff/StaffSalesReportPage';
import type { SalesReport } from '@/types/sales';
import { renderWithRouter } from '../helpers';

vi.mock('@/api/sales');
import * as salesApi from '@/api/sales';

const REPORT: SalesReport = {
  from: '2026-10-01',
  to: '2026-10-20',
  totalRevenue: 50000,
  totalOrders: 2,
  appOrders: 1,
  counterSales: 1,
  byProduct: [
    { productId: 'p-2', name: 'Correa', unitsSold: 1, revenue: 30000 },
    { productId: 'p-1', name: 'Pelota', unitsSold: 2, revenue: 20000 },
  ],
};

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(salesApi.getSalesReport).mockResolvedValue(REPORT);
});

describe('StaffSalesReportPage (HU-022)', () => {
  it('CA-022.1 / CA-022.3 — al abrir consulta el mes y muestra totales, desglose y productos', async () => {
    renderWithRouter(<StaffSalesReportPage />);

    expect(await screen.findByText('$50.000')).toBeInTheDocument();
    expect(screen.getByText('1 de la app · 1 de mostrador')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Ventas por producto' });
    const [first, second] = within(list).getAllByRole('listitem');
    expect(first).toHaveTextContent('Correa — 1 unidad');
    expect(second).toHaveTextContent('Pelota — 2 unidades');
    // ¿Qué? "Hasta" es la fecha local de hoy, no la de UTC.
    expect(vi.mocked(salesApi.getSalesReport).mock.calls[0]![1]).toBe(localToday());
  });

  it('avisa si la fecha inicial es posterior a la final y no consulta', async () => {
    renderWithRouter(<StaffSalesReportPage />);
    await screen.findByText('$50.000');
    vi.mocked(salesApi.getSalesReport).mockClear();

    fireEvent.change(screen.getByLabelText(/^Desde/), { target: { value: '2030-12-31' } });
    await userEvent.click(screen.getByRole('button', { name: 'Consultar' }));

    expect(
      await screen.findByText('La fecha inicial no puede ser posterior a la fecha final.'),
    ).toBeInTheDocument();
    expect(salesApi.getSalesReport).not.toHaveBeenCalled();
  });

  it('sin ventas en el rango lo dice', async () => {
    vi.mocked(salesApi.getSalesReport).mockResolvedValue({
      ...REPORT,
      totalRevenue: 0,
      totalOrders: 0,
      appOrders: 0,
      counterSales: 0,
      byProduct: [],
    });
    renderWithRouter(<StaffSalesReportPage />);

    expect(await screen.findByText('No hay ventas en este rango de fechas.')).toBeInTheDocument();
  });
});
