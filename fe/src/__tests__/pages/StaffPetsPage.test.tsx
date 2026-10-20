/**
 * Archivo: __tests__/pages/StaffPetsPage.test.tsx
 * Descripción: Tests de aceptación de la HU-012 en /staff/mascotas.
 * ¿Para qué? Verificar los campos del formulario (CA-012.1), el error de cliente inexistente
 *   (CA-012.2) y que la mascota aparezca en el listado del cliente (CA-012.3).
 * ¿Impacto? Si fallan, el staff no podría dejar listas las mascotas para que el cliente agende.
 */

import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { StaffPetsPage } from '@/pages/staff/StaffPetsPage';
import { ApiError } from '@/api/axios';
import type { Pet } from '@/types/pets';
import { renderWithRouter } from '../helpers';

vi.mock('@/api/staff');
vi.mock('@/api/pets');
import * as staffApi from '@/api/staff';
import * as petsApi from '@/api/pets';

const CLIENT = {
  id: 'client-1',
  documentId: '1000000001',
  firstName: 'Ana',
  lastName: 'Ríos',
  email: 'ana@correo.com',
  phone: '3001234567',
};

const MAX = {
  id: 'pet-1',
  clientId: CLIENT.id,
  name: 'Max',
  species: 'canina',
  breed: 'Criollo',
  gender: 'macho',
  age: 3,
  weight: null,
  color: null,
  size: null,
  coatType: null,
  behavior: null,
  skinConditions: [],
  pathology: 'No aplica',
  createdAt: '2026-10-19',
} as Pet;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(staffApi.searchClients).mockResolvedValue([CLIENT]);
  vi.mocked(petsApi.listPetsByClient).mockResolvedValue([]);
});

// ¿Qué? Busca y elige a la clienta Ana para abrir el formulario.
async function openFormForAna() {
  renderWithRouter(<StaffPetsPage />);
  fireEvent.change(screen.getByLabelText(/Buscar cliente/), { target: { value: 'Ana' } });
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  await userEvent.click(await screen.findByRole('button', { name: /Ana Ríos/ }));
}

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Registrar mascota' }));

describe('StaffPetsPage (HU-012)', () => {
  it('CA-012.1 — muestra nombre, especie, raza, sexo y edad', async () => {
    await openFormForAna();

    expect(screen.getByLabelText(/^Nombre de la mascota/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Especie/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Raza/)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Hembra' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Edad/)).toBeInTheDocument();
  });

  it('valida nombre y especie antes de enviar', async () => {
    await openFormForAna();
    fireEvent.change(screen.getByLabelText(/^Nombre de la mascota/), { target: { value: '   ' } });
    await submit();

    expect(await screen.findByText('El nombre de la mascota es requerido.')).toBeInTheDocument();
    expect(screen.getByText('Selecciona la especie de la mascota.')).toBeInTheDocument();
    expect(petsApi.createPet).not.toHaveBeenCalled();
  });

  it('CA-012.2 — muestra el error de cliente no encontrado', async () => {
    vi.mocked(petsApi.createPet).mockRejectedValue(
      new ApiError('Cliente no encontrado.', 'NOT_FOUND', 404),
    );
    await openFormForAna();
    fireEvent.change(screen.getByLabelText(/^Nombre de la mascota/), { target: { value: 'Max' } });
    fireEvent.change(screen.getByLabelText(/^Especie/), { target: { value: 'canina' } });
    await submit();

    expect(await screen.findByText('Cliente no encontrado.')).toBeInTheDocument();
  });

  it('CA-012.3 — al registrar, la mascota aparece en el listado del cliente', async () => {
    vi.mocked(petsApi.createPet).mockResolvedValue(MAX);
    await openFormForAna();
    vi.mocked(petsApi.listPetsByClient).mockResolvedValue([MAX]);

    fireEvent.change(screen.getByLabelText(/^Nombre de la mascota/), {
      target: { value: ' Max ' },
    });
    fireEvent.change(screen.getByLabelText(/^Especie/), { target: { value: 'canina' } });
    fireEvent.change(screen.getByLabelText(/^Raza/), { target: { value: 'Criollo' } });
    fireEvent.change(screen.getByLabelText(/^Sexo/), { target: { value: 'macho' } });
    fireEvent.change(screen.getByLabelText(/^Edad/), { target: { value: '3' } });
    await submit();

    expect(await screen.findByText('Mascota registrada correctamente.')).toBeInTheDocument();
    expect(await screen.findByText(/Canina, Criollo, macho, 3 años/)).toBeInTheDocument();
    expect(petsApi.createPet).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: CLIENT.id,
        name: 'Max',
        species: 'canina',
        breed: 'Criollo',
        gender: 'macho',
        age: 3,
      }),
    );
  });
});
