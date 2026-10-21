/**
 * Archivo: __tests__/pages/StaffSalesPage.test.tsx
 * Descripción: Tests de aceptación de la HU-023 en /staff/ventas.
 * ¿Para qué? Verificar la venta sin cuenta (CA-023.1), con un cliente buscado (CA-023.2) y el
 *   aviso de stock insuficiente (CA-023.3).
 */

import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { StaffSalesPage } from '@/pages/staff/StaffSalesPage';
import { ApiError } from '@/api/axios';
import type { Product } from '@/types/products';
import type { Sale } from '@/types/sales';
import { renderWithRouter } from '../helpers';

vi.mock('@/api/products');
vi.mock('@/api/staff');
vi.mock('@/api/sales');
import * as productsApi from '@/api/products';
import * as staffApi from '@/api/staff';
import * as salesApi from '@/api/sales';

const TOY = { id: 'p-1', name: 'Pelota', price: 10000, stock: 5 } as Product;
const LEASH = { id: 'p-2', name: 'Correa', price: 30000, stock: 1 } as Product;
const CLIENT = {
  id: 'c-1',
  documentId: '1000000001',
  firstName: 'Ana',
  lastName: 'Ríos',
  email: 'ana@correo.com',
  phone: null,
};

const sale = (total: number): Sale => ({
  id: 'sale-1',
  status: 'completed',
  paymentStatus: 'paid',
  total,
  clientId: null,
  clientName: null,
  items: [],
  createdAt: '2026-10-20',
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(productsApi.listProducts).mockResolvedValue([TOY, LEASH]);
});

const addOne = (name: string) =>
  userEvent.click(screen.getByRole('button', { name: `Agregar una unidad de ${name}` }));

describe('StaffSalesPage (HU-023)', () => {
  it('CA-023.1 — registra la venta sin cuenta y dice el total y el comprador', async () => {
    vi.mocked(salesApi.createSale).mockResolvedValue(sale(20000));
    renderWithRouter(<StaffSalesPage />);
    await screen.findByText('Pelota');
    await addOne('Pelota');
    await addOne('Pelota');
    fireEvent.change(screen.getByLabelText(/nombre del comprador ocasional/), {
      target: { value: 'Don Pedro' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Registrar venta' }));

    expect(
      await screen.findByText(
        'Venta registrada por $20.000 a nombre de Don Pedro. El stock ya se descontó.',
      ),
    ).toBeInTheDocument();
    expect(salesApi.createSale).toHaveBeenCalledWith({
      items: [{ productId: 'p-1', quantity: 2 }],
      clientId: undefined,
      clientName: 'Don Pedro',
    });
  });

  it('CA-023.2 — busca un cliente y asocia la venta a su cuenta', async () => {
    vi.mocked(staffApi.searchClients).mockResolvedValue([CLIENT]);
    vi.mocked(salesApi.createSale).mockResolvedValue(sale(10000));
    renderWithRouter(<StaffSalesPage />);
    fireEvent.change(await screen.findByLabelText(/Buscar cliente con cuenta/), {
      target: { value: 'Ana' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await userEvent.click(await screen.findByRole('button', { name: /Ana Ríos/ }));
    await addOne('Pelota');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar venta' }));

    expect(salesApi.createSale).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'c-1' }));
    expect(await screen.findByText(/a nombre de Ana Ríos/)).toBeInTheDocument();
  });

  it('la búsqueda avisa cuando no encuentra a nadie', async () => {
    vi.mocked(staffApi.searchClients).mockResolvedValue([]);
    renderWithRouter(<StaffSalesPage />);
    fireEvent.change(await screen.findByLabelText(/Buscar cliente con cuenta/), {
      target: { value: 'Zz' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText(/No se encontró ningún cliente/)).toBeInTheDocument();
  });

  it('CA-023.3 — muestra qué producto no alcanza y recarga el stock', async () => {
    vi.mocked(salesApi.createSale).mockRejectedValue(
      new ApiError('No hay existencias de "Correa".', 'OUT_OF_STOCK', 409),
    );
    renderWithRouter(<StaffSalesPage />);
    await screen.findByText('Correa');
    await addOne('Correa');
    vi.mocked(productsApi.listProducts).mockResolvedValue([TOY, { ...LEASH, stock: 0 }]);
    await userEvent.click(screen.getByRole('button', { name: 'Registrar venta' }));

    expect(await screen.findByText('No hay existencias de "Correa".')).toBeInTheDocument();
    expect(await screen.findByText('Solo quedan 0: baja la cantidad.')).toBeInTheDocument();
    expect(productsApi.listProducts).toHaveBeenCalledTimes(2);
  });
});
