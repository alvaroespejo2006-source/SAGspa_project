/**
 * Archivo: components/layout/Navbar.tsx
 * Descripción: Barra de navegación principal de GroomingSpa.
 * ¿Para qué? Proveer navegación consistente y acceso al toggle de tema en todas las páginas.
 * ¿Impacto? Centralizar la navbar aquí evita duplicar código en cada página.
 */

import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/hooks/useAuthModal';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { open } = useAuthModal();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const homeLink = user?.role === 'staff' ? '/staff' : user?.role === 'client' ? '/app' : '/';

  return (
    <header className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <nav
        className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between"
        aria-label="Navegación principal"
      >
        <Link
          to={homeLink}
          className="font-comic tracking-wide text-base text-gray-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors duration-200"
        >
          🐾 Super Amigos Grooming Spa
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              {/* ¿Qué? Datos del usuario en la cabecera (HU-007, CA-007.1).
                  ¿Para qué? Confirmar con qué cuenta se inició sesión. El nombre se ve en
                  todos los tamaños (antes se ocultaba en celular); rol y correo desde sm. */}
              <div
                data-testid="navbar-profile"
                title={user?.email}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1 text-sm text-gray-700 dark:text-slate-300 min-w-0"
              >
                <User className="h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-medium truncate max-w-[7rem] sm:max-w-[12rem]">
                    {user?.firstName}
                  </span>
                  <span className="hidden sm:block text-xs text-gray-500 dark:text-slate-400 truncate max-w-[12rem]">
                    {user?.role === 'staff' ? 'Staff' : 'Cliente'} · {user?.email}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                className="p-2 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => open('login')}
                className="px-3 py-1.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-200"
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => open('register')}
                className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 rounded-lg transition-colors duration-200"
              >
                Registrarme
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
