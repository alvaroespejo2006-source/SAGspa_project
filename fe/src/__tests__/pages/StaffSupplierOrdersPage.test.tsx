/**
 * Archivo: __tests__/pages/StaffSupplierOrdersPage.test.tsx
 * Descripción: Tests de aceptación de la HU-021 en /staff/pedidos-proveedor.
 * ¿Para qué? Verificar crear el pedido (CA-021.1), recibirlo (CA-021.2) y el aviso cuando ya
 *   se recibió (CA-021.3).
 */

import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { StaffSupplierOrdersPage } from '@/pages/staff/StaffSupplierOrdersPage';
import { ApiError } from '@/api/axios';
import type { Supplier } from '@/types/suppliers';
import type { Product } from '@/types/products';
import type { SupplierOrder } from '@/types/supplier-orders';
import { renderWithRouter } from '../helpers';

vi.mock('@/api/suppliers');
vi.mock('@/api/products');
vi.mock('@/api/supplier-orders');
import * as suppliersApi from '@/api/suppliers';
import * as productsApi from '@/api/products';
import * as supplierOrdersApi from '@/api/supplier-orders';

const ACTIVE = { id: 's-1', name: 'PetCol', active: true } as Supplier;
const INACTIVE = { id: 's-2', name: 'Vieja SAS', active: false } as Supplier;
const TOY = { id: 'p-1', name: 'Pelota' } as Product;

const ORDERED: SupplierOrder = {
  id: 'so-1',
  supplierId: 's-1',
  supplierName: 'PetCol',
  status: 'ordered',
  expectedDate: '2026-10-25',
  receivedDate: null,
  items: [{ productId: 'p-1', productName: 'Pelota', quantity: 10, unitCost: 6000 }],
  createdAt: '2026-10-19',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(suppliersApi.listSuppliers).mockResolvedValue([ACTIVE, INACTIVE]);
  vi.mocked(productsApi.listProductsForStaff).mockResolvedValue([TOY]);
  vi.mocked(supplierOrdersApi.listSupplierOrders).mockResolvedValue([ORDERED]);
});

describe('StaffSupplierOrdersPage (HU-021)', () => {
  it('solo ofrece proveedores activos', async () => {
    renderWithRouter(<StaffSupplierOrdersPage />);

    expect(await screen.findByRole('option', { name: 'PetCol' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Vieja SAS' })).not.toBeInTheDocument();
  });

  it('CA-021.1 — avisa la fila incompleta en vez de descartarla, y luego crea', async () => {
    vi.mocked(supplierOrdersApi.createSupplierOrder).mockResolvedValue(ORDERED);
    renderWithRouter(<StaffSupplierOrdersPage />);
    fireEvent.change(await screen.findByLabelText(/^Proveedor/), { target: { value: 's-1' } });
    fireEvent.change(screen.getByLabelText(/^Producto/), { target: { value: 'p-1' } });
    fireEvent.change(screen.getByLabelText(/^Cantidad/), { target: { value: '10' } });
    await userEvent.click(screen.getByRole('button', { name: 'Crear pedido' }));

    expect(
      await screen.findByText('El costo unitario de la fila 1 debe ser mayor a 0.'),
    ).toBeInTheDocument();
    expect(supplierOrdersApi.createSupplierOrder).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^Costo unitario/), { target: { value: '6000' } });
    await userEvent.click(screen.getByRole('button', { name: 'Crear pedido' }));

    expect(await screen.findByText(/Pedido creado/)).toBeInTheDocument();
    expect(supplierOrdersApi.createSupplierOrder).toHaveBeenCalledWith({
      supplierId: 's-1',
      expectedDate: undefined,
      items: [{ productId: 'p-1', quantity: 10, unitCost: 6000 }],
    });
  });

  it('CA-021.2 — recibir pide confirmación y dice cuánto se sumó', async () => {
    vi.mocked(supplierOrdersApi.receiveSupplierOrder).mockResolvedValue({
      ...ORDERED,
      status: 'received',
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithRouter(<StaffSupplierOrdersPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar como recibido' }));

    expect(confirmSpy).toHaveBeenCalledWith(
      '¿Marcar como recibido el pedido de PetCol? Se sumarán 10 unidades al stock.',
    );
    expect(
      await screen.findByText('Pedido recibido. Stock actualizado: +10 Pelota.'),
    ).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('CA-021.3 — si ya se recibió, muestra el motivo', async () => {
    vi.mocked(supplierOrdersApi.receiveSupplierOrder).mockRejectedValue(
      new ApiError(
        'Este pedido ya fue marcado como recibido: el stock ya se sumó.',
        'SUPPLIER_ORDER_ALREADY_RECEIVED',
        400,
      ),
    );
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithRouter(<StaffSupplierOrdersPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar como recibido' }));

    expect(
      await screen.findByText('Este pedido ya fue marcado como recibido: el stock ya se sumó.'),
    ).toBeInTheDocument();
    confirmSpy.mockRestore();
  });
});
