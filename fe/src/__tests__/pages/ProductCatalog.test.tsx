/**
 * Archivo: __tests__/pages/ProductCatalog.test.tsx
 * Descripción: Tests de aceptación de la HU-015 en la tienda del cliente y en /staff/productos.
 * ¿Para qué? Verificar el catálogo con categoría (CA-015.1), la marca "Agotado" (CA-015.2) y
 *   que el staff edite precio y stock (CA-015.3).
 */

import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ShopPage } from '@/pages/client/ShopPage';
import { StaffProductsPage } from '@/pages/staff/StaffProductsPage';
import type { Product } from '@/types/products';
import { renderWithRouter } from '../helpers';

vi.mock('@/api/products');
vi.mock('@/api/orders');
import * as productsApi from '@/api/products';
import * as ordersApi from '@/api/orders';

function product(overrides: Partial<Product>): Product {
  return {
    id: 'p-1',
    name: 'Pelota',
    description: null,
    price: 12000,
    stock: 5,
    category: 'Juguetes',
    active: true,
    createdAt: '2026-01-01',
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(ordersApi.listMyOrders).mockResolvedValue([]);
});

describe('Tienda — catálogo (HU-015)', () => {
  it('CA-015.1 / CA-015.2 — muestra categoría y marca "Agotado" sin dejar agregarlo', async () => {
    vi.mocked(productsApi.listProducts).mockResolvedValue([
      product({}),
      product({ id: 'p-2', name: 'Shampoo', stock: 0, category: 'Higiene' }),
    ]);
    renderWithRouter(<ShopPage />);

    const list = await screen.findByRole('list', { name: 'Productos disponibles' });
    const [toy, shampoo] = within(list).getAllByRole('listitem');
    expect(toy).toHaveTextContent('Juguetes');
    expect(toy).toHaveTextContent('5 disponibles');
    expect(toy).not.toHaveTextContent('Agotado');
    expect(shampoo).toHaveTextContent('Agotado');
    expect(shampoo).toHaveTextContent('Higiene');
    expect(within(shampoo!).getByRole('button', { name: '+' })).toBeDisabled();
  });
});

describe('StaffProductsPage (HU-015)', () => {
  it('CA-015.3 — edita el precio y el stock de un producto', async () => {
    vi.mocked(productsApi.listProductsForStaff).mockResolvedValue([product({})]);
    vi.mocked(productsApi.updateProduct).mockResolvedValue(product({ price: 15000, stock: 0 }));
    renderWithRouter(<StaffProductsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Pelota' }));

    fireEvent.change(screen.getByLabelText(/^Precio/), { target: { value: '15000' } });
    fireEvent.change(screen.getByLabelText(/^Stock/), { target: { value: '0' } });
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText(/Cambios guardados/)).toBeInTheDocument();
    expect(productsApi.updateProduct).toHaveBeenCalledWith('p-1', {
      name: 'Pelota',
      description: undefined,
      price: 15000,
      stock: 0,
      category: 'Juguetes',
    });
  });

  it('valida el stock antes de enviar', async () => {
    vi.mocked(productsApi.listProductsForStaff).mockResolvedValue([]);
    renderWithRouter(<StaffProductsPage />);
    fireEvent.change(await screen.findByLabelText(/^Nombre del producto/), {
      target: { value: 'Pelota' },
    });
    fireEvent.change(screen.getByLabelText(/^Precio/), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/^Stock/), { target: { value: '-2' } });
    await userEvent.click(screen.getByRole('button', { name: 'Crear producto' }));

    expect(
      await screen.findByText('El stock debe ser un número entero de 0 o más.'),
    ).toBeInTheDocument();
    expect(productsApi.createProduct).not.toHaveBeenCalled();
  });

  it('explica cuando el producto se desactivó en lugar de eliminarse', async () => {
    const message =
      'El producto tiene pedidos o ventas asociadas, así que se desactivó en lugar de eliminarse.';
    vi.mocked(productsApi.listProductsForStaff).mockResolvedValue([product({})]);
    vi.mocked(productsApi.deleteProduct).mockResolvedValue(message);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithRouter(<StaffProductsPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar Pelota' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    confirmSpy.mockRestore();
  });
});
