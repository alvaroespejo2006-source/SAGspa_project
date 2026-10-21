/**
 * Archivo: __tests__/components/UserProfile.test.tsx
 * Descripción: Tests de aceptación de la HU-007 en la cabecera y al cargar la sesión.
 * ¿Para qué? Verificar que la cabecera muestra los datos del usuario (CA-007.1) y que un
 *   token rechazado lleva al login sin dejar tokens guardados (CA-007.2).
 * ¿Impacto? Si fallan, el usuario no sabría con qué cuenta entró o quedaría con una sesión rota.
 */

import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { Navbar } from '@/components/layout/Navbar';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ui/ProtectedRoute';
import { ApiError } from '@/api/axios';
import { mockUser, renderWithRouter } from '../helpers';

vi.mock('@/api/auth');
import * as authApi from '@/api/auth';

vi.mock('@/hooks/useAuthModal', () => ({ useAuthModal: () => ({ open: vi.fn() }) }));
// ¿Qué? jsdom no implementa matchMedia, que usa el botón de tema de la navbar.
vi.mock('@/components/ui/ThemeToggle', () => ({ ThemeToggle: () => null }));

const getMeMock = vi.mocked(authApi.getMe);

afterEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
});

describe('Navbar (HU-007)', () => {
  // ¿Qué? Se usa el AuthProvider real: carga el perfil con getMe igual que en la app.
  function renderNavbar() {
    localStorage.setItem('accessToken', 'token-valido');
    return renderWithRouter(
      <AuthProvider>
        <Navbar />
      </AuthProvider>,
    );
  }

  it('CA-007.1 — muestra el nombre, el rol y el correo del cliente', async () => {
    getMeMock.mockResolvedValue(mockUser);
    renderNavbar();

    const profile = await screen.findByTestId('navbar-profile');
    expect(within(profile).getByText(mockUser.firstName)).toBeInTheDocument();
    expect(within(profile).getByText(`Cliente · ${mockUser.email}`)).toBeInTheDocument();
  });

  it('CA-007.1 — identifica una cuenta de staff', async () => {
    getMeMock.mockResolvedValue({ ...mockUser, firstName: 'Laura', role: 'staff' });
    renderNavbar();

    const profile = await screen.findByTestId('navbar-profile');
    expect(within(profile).getByText('Laura')).toBeInTheDocument();
    expect(within(profile).getByText(`Staff · ${mockUser.email}`)).toBeInTheDocument();
  });

  it('el nombre no está oculto en pantallas pequeñas', async () => {
    getMeMock.mockResolvedValue(mockUser);
    renderNavbar();

    const profile = await screen.findByTestId('navbar-profile');
    expect(profile.className).not.toMatch(/\bhidden\b/);
  });
});

describe('Carga del perfil (HU-007)', () => {
  function renderProtectedApp() {
    localStorage.setItem('accessToken', 'token-manipulado');
    localStorage.setItem('refreshToken', 'refresh');
    return render(
      <MemoryRouter initialEntries={['/app']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <p>Zona privada</p>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<p>Pantalla de login</p>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  it('CA-007.2 — con un token inválido lleva al login y borra los tokens', async () => {
    getMeMock.mockRejectedValue(new ApiError('Tu sesión no es válida.', 'UNAUTHORIZED', 401));
    renderProtectedApp();

    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
    expect(screen.queryByText('Zona privada')).not.toBeInTheDocument();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('si el servidor no responde, no borra los tokens', async () => {
    getMeMock.mockRejectedValue(new ApiError('No se pudo conectar con el servidor.', null, null));
    renderProtectedApp();

    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
    expect(localStorage.getItem('accessToken')).toBe('token-manipulado');
  });
});
