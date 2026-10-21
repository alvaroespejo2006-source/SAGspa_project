/**
 * Archivo: __tests__/pages/ClientPets.test.tsx
 * Descripción: Tests de aceptación de la HU-013 en el inicio del cliente.
 * ¿Para qué? Verificar que el cliente ve la lista de sus mascotas (historia y CA-013.1) y el
 *   aviso cuando todavía no tiene ninguna (CA-013.2).
 */

import { screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import { ClientHomePage } from '@/pages/client/ClientHomePage';
import type { Pet } from '@/types/pets';
import { mockUser, renderWithRouter } from '../helpers';

vi.mock('@/api/pets');
import * as petsApi from '@/api/pets';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }));

const PETS = [
  { id: 'p1', name: 'Max', species: 'canina', breed: 'Criollo', age: 3 },
  { id: 'p2', name: 'Mia', species: 'felina', breed: null, age: 1 },
] as Pet[];

beforeEach(() => {
  vi.resetAllMocks();
});

describe('Mis mascotas (HU-013)', () => {
  it('CA-013.1 — muestra la lista de mascotas del cliente', async () => {
    vi.mocked(petsApi.listMyPets).mockResolvedValue(PETS);
    renderWithRouter(<ClientHomePage />);

    const list = await screen.findByRole('region', { name: /Mis mascotas/ });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Max');
    expect(items[0]).toHaveTextContent('Canina · Criollo · 3 años');
    expect(items[1]).toHaveTextContent('Felina · 1 año');
  });

  it('CA-013.2 — sin mascotas muestra el aviso y no la lista', async () => {
    vi.mocked(petsApi.listMyPets).mockResolvedValue([]);
    renderWithRouter(<ClientHomePage />);

    expect(await screen.findByText(/Todavía no tienes mascotas registradas/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Mis mascotas/ })).not.toBeInTheDocument();
  });
});
