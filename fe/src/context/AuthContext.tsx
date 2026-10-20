/**
 * Archivo: context/AuthContext.tsx
 * Descripción: Provider del contexto global de autenticación — estado del usuario y tokens JWT.
 * ¿Para qué? Compartir el estado de autenticación (usuario, tokens, loading) en
 *   toda la aplicación sin necesidad de prop drilling.
 * ¿Impacto? Sin este contexto cada componente tendría que leer localStorage
 *   directamente y manejar su propio estado de auth — imposible de mantener.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import * as authApi from '@/api/auth';
import { ApiError } from '@/api/axios';
import type { User, LoginRequest, RegisterRequest } from '@/types/auth';
import { AuthContext } from './auth-context';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  // ¿Qué? El estado inicial ya refleja si hay un token guardado — así el efecto de
  //   abajo nunca necesita un setState síncrono en la rama "no hay token".
  // ¿Para qué? Cumplir react-hooks/set-state-in-effect: un efecto solo debe llamar
  //   setState desde un callback asíncrono (then/catch/finally), no en su cuerpo síncrono.
  const [isLoading, setIsLoading] = useState<boolean>(
    () => localStorage.getItem('accessToken') !== null,
  );

  // ¿Qué? Al cargar la app, si hay un token guardado, intentar cargar el perfil.
  // ¿Para qué? Restaurar la sesión del usuario si ya se había autenticado antes.
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    authApi
      .getMe()
      .then(setUser)
      .catch((err: unknown) => {
        // ¿Qué? Solo se borran los tokens si el backend los rechazó (HU-007, CA-007.2).
        // ¿Para qué? Con el servidor caído o sin internet, borrarlos obligaba a iniciar
        //   sesión otra vez aunque la sesión seguía siendo válida. Sin `user`, las rutas
        //   protegidas igual llevan al login; al recargar con conexión, la sesión vuelve.
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  // ¿Qué? Función de login — guarda tokens y el usuario que ya trae la respuesta (RF-002).
  const login = useCallback(async (data: LoginRequest): Promise<User> => {
    const response = await authApi.login(data);
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    const profile = await authApi.getMe();
    setUser(profile);
    return profile;
  }, []);

  // ¿Qué? Función de registro — registra al cliente; NO hace login automático porque
  //   la cuenta queda sin verificar hasta que el usuario haga clic en el enlace del correo.
  const register = useCallback(async (data: RegisterRequest) => {
    await authApi.register(data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
