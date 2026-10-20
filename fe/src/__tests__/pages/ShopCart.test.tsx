/**
 * Archivo: __tests__/pages/ShopCart.test.tsx
 * Descripción: Tests de aceptación de la HU-016 en la tienda del cliente.
 * ¿Para qué? Verificar agregar al carrito (CA-016.1), el total con sus líneas (CA-016.2), el
 *   mensaje al confirmar (CA-016.3), el aviso de producto agotado (CA-016.4) y "Mis pedidos"
 *   (CA-016.5).
 */

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ShopPage } from '@/pages/client/ShopPage';
import { ApiError } from '@/api/axios';
import type { Product } from '@/types/products';
import type { Order } from '@/types/orders';
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

const TOY = product({});
const LEASH = product({ id: 'p-2', name: 'Correa', price: 30000, stock: 2, category: null });

function order(id: string, status: Order['status']): Order {
  return {
    id,
    clientId: 'c-1',
    status,
    paymentStatus: status === 'completed' ? 'paid' : 'unpaid',
    total: 12000,
    items: [{ productId: TOY.id, name: 'Pelota', quantity: 1, unitPrice: 12000 }],
    createdAt: '2026-10-19',
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(productsApi.listProducts).mockResolvedValue([TOY, LEASH]);
  vi.mocked(ordersApi.listMyOrders).mockResolvedValue([]);
});

const add = (name: string) =>
  userEvent.click(screen.getByRole('button', { name: `Agregar ${name} al carrito` }));

async function cartLines() {
  const cart = await screen.findByRole('list', { name: 'Productos en el carrito' });
  return within(cart).getAllByRole('listitem');
}

describe('Carrito y pedido (HU-016)', () => {
  it('CA-016.1 / CA-016.2 — agrega, suma cantidades y muestra subtotales y total', async () => {
    renderWithRouter(<ShopPage />);
    await screen.findByText('Pelota');
    await add('Pelota');
    await add('Pelota');
    await add('Correa');

    const [toyLine, leashLine] = await cartLines();
    expect(within(toyLine!).getByLabelText('Cantidad de Pelota')).toHaveTextContent('2');
    expect(toyLine).toHaveTextContent('$12.000 c/u');
    expect(toyLine).toHaveTextContent('$24.000');
    expect(leashLine).toHaveTextContent('$30.000');
    expect(screen.getByText('Total: $54.000')).toBeInTheDocument();
  });

  it('no deja agregar más unidades de las disponibles', async () => {
    renderWithRouter(<ShopPage />);
    await screen.findByText('Correa');
    await add('Correa');
    await add('Correa');

    expect(screen.getByRole('button', { name: 'Agregar Correa al carrito' })).toBeDisabled();
  });

  it('CA-016.3 — al confirmar dice que el pedido quedó registrado y se paga en el local', async () => {
    vi.mocked(ordersApi.createOrder).mockResolvedValue(order('o-1', 'pending'));
    renderWithRouter(<ShopPage />);
    await screen.findByText('Pelota');
    await add('Pelota');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(
      await screen.findByText(
        '¡Pedido registrado! Págalo en el local cuando lo recojas en GroomingSpa.',
      ),
    ).toBeInTheDocument();
    expect(ordersApi.createOrder).toHaveBeenCalledWith({
      items: [{ productId: TOY.id, quantity: 1 }],
    });
    expect(screen.queryByRole('list', { name: 'Productos en el carrito' })).not.toBeInTheDocument();
  });

  it('CA-016.4 — si se agotó, muestra qué producto, recarga el stock y conserva el carrito', async () => {
    vi.mocked(ordersApi.createOrder).mockRejectedValue(
      new ApiError('"Correa" se agotó. Quítalo del carrito para continuar.', 'OUT_OF_STOCK', 409),
    );
    renderWithRouter(<ShopPage />);
    await screen.findByText('Correa');
    await add('Correa');
    vi.mocked(productsApi.listProducts).mockResolvedValue([TOY, { ...LEASH, stock: 0 }]);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(
      await screen.findByText('"Correa" se agotó. Quítalo del carrito para continuar.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Este producto se agotó: quítalo para continuar.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeDisabled();
    expect(productsApi.listProducts).toHaveBeenCalledTimes(2);
  });

  it('CA-016.5 — "Mis pedidos" muestra Pendiente, Completado y Cancelado', async () => {
    vi.mocked(ordersApi.listMyOrders).mockResolvedValue([
      order('o-1', 'pending'),
      order('o-2', 'completed'),
      order('o-3', 'cancelled'),
    ]);
    renderWithRouter(<ShopPage />);

    const list = await screen.findByRole('list', { name: 'Mis pedidos' });
    expect(within(list).getByText('Pendiente')).toBeInTheDocument();
    expect(within(list).getByText('Completado')).toBeInTheDocument();
    expect(within(list).getByText('Cancelado')).toBeInTheDocument();
    expect(within(list).getByText('Págalo en el local cuando lo recojas.')).toBeInTheDocument();
  });
});
