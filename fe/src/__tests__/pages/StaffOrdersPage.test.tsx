/**
 * Archivo: __tests__/pages/StaffOrdersPage.test.tsx
 * Descripción: Tests de aceptación de la HU-019 en /staff/pedidos.
 * ¿Para qué? Verificar la lista con cliente, productos y total (CA-019.1), completar
 *   (CA-019.2), cancelar con confirmación (CA-019.3) y las pestañas por estado.
 */

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { StaffOrdersPage } from '@/pages/staff/StaffOrdersPage';
import type { StaffOrder } from '@/types/orders';
import { renderWithRouter } from '../helpers';

vi.mock('@/api/orders');
import * as ordersApi from '@/api/orders';

function order(overrides: Partial<StaffOrder>): StaffOrder {
  return {
    id: 'o-1',
    clientId: 'c-1',
    status: 'pending',
    paymentStatus: 'unpaid',
    total: 24000,
    items: [{ productId: 'p-1', name: 'Pelota', quantity: 2, unitPrice: 12000 }],
    createdAt: '2026-10-19T15:00:00.000Z',
    client: { id: 'c-1', firstName: 'Ana', lastName: 'Ríos', phone: '3001234567' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(ordersApi.listOrdersByStatus).mockResolvedValue([order({})]);
  vi.mocked(ordersApi.updateOrderStatus).mockResolvedValue({} as never);
});

describe('StaffOrdersPage (HU-019)', () => {
  it('CA-019.1 — muestra cliente, productos, cantidades y total de los pendientes', async () => {
    renderWithRouter(<StaffOrdersPage />);
    const list = await screen.findByRole('list', { name: 'Pedidos pendientes' });

    expect(within(list).getByText(/Ana Ríos — 3001234567/)).toBeInTheDocument();
    expect(within(list).getByText('2x Pelota — $24.000')).toBeInTheDocument();
    expect(within(list).getByText('Total: $24.000')).toBeInTheDocument();
    expect(within(list).getByText(/Sin pagar/)).toBeInTheDocument();
    expect(ordersApi.listOrdersByStatus).toHaveBeenCalledWith('pending');
  });

  it('CA-019.2 — marca el pedido como pagado y entregado', async () => {
    renderWithRouter(<StaffOrdersPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar pagado y entregado' }));

    expect(ordersApi.updateOrderStatus).toHaveBeenCalledWith('o-1', 'completed');
    expect(
      await screen.findByText('Pedido de Ana Ríos marcado como pagado y entregado.'),
    ).toBeInTheDocument();
  });

  it('CA-019.3 — cancelar pide confirmación y avisa que el stock vuelve', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithRouter(<StaffOrdersPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(confirmSpy).toHaveBeenCalledWith(
      '¿Cancelar el pedido de Ana Ríos? El stock volverá a estar disponible.',
    );
    expect(ordersApi.updateOrderStatus).toHaveBeenCalledWith('o-1', 'cancelled');
    expect(await screen.findByText(/Los productos volvieron al stock/)).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('la pestaña de completados muestra los pedidos sin botones', async () => {
    renderWithRouter(<StaffOrdersPage />);
    await screen.findByRole('list', { name: 'Pedidos pendientes' });
    vi.mocked(ordersApi.listOrdersByStatus).mockResolvedValue([
      order({ status: 'completed', paymentStatus: 'paid' }),
    ]);
    await userEvent.click(screen.getByRole('tab', { name: 'Completados' }));

    const list = await screen.findByRole('list', { name: 'Pedidos completados' });
    expect(ordersApi.listOrdersByStatus).toHaveBeenLastCalledWith('completed');
    expect(within(list).getByText('Completado')).toBeInTheDocument();
    expect(within(list).getByText(/Pagado/)).toBeInTheDocument();
    expect(within(list).queryByRole('button')).not.toBeInTheDocument();
  });
});
