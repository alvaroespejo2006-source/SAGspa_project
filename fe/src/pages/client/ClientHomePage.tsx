/**
 * Archivo: pages/client/ClientHomePage.tsx
 * Descripción: Menú principal del cliente — el semáforo (RF-009, RF-010, RF-011; HU-009 a HU-011).
 * ¿Para qué? Punto de entrada desde el que el cliente elige qué necesita: una cita de
 *   grooming, reportar un síntoma leve, o ver información de emergencia.
 * ¿Impacto? Si el cliente no tiene mascotas registradas, no puede usar 🟢 ni 🟡
 *   (CA-009.2b) — el staff debe registrar al menos una primero.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as petsApi from '@/api/pets';
import type { Pet } from '@/types/pets';
import { useAuth } from '@/hooks/useAuth';

export function ClientHomePage() {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ¿Qué? Si la carga falla se muestra el error, no "no tienes mascotas" (HU-009, CA-009.2b).
  // ¿Para qué? Antes un fallo de red dejaba la lista vacía y el cliente leía que debía ir al
  //   local a registrar una mascota que ya tenía registrada.
  useEffect(() => {
    petsApi
      .listMyPets()
      .then(setPets)
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'No se pudieron cargar tus mascotas.');
      });
  }, []);

  const hasPets = (pets?.length ?? 0) > 0;
  const isLoadingPets = pets === null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-comic tracking-wide text-gray-900 dark:text-slate-100 mb-1 text-center">
        🚦 ¡Hola, {user?.firstName}!
      </h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-8">
        ¿Cómo podemos ayudarte hoy? Selecciona según el estado de tu mascota.
      </p>

      {loadError && (
        <div className="mb-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {loadError}
        </div>
      )}

      {!isLoadingPets && !hasPets && (
        <div className="mb-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          Todavía no tienes mascotas registradas. Acércate o comunícate con GroomingSpa
          para que registremos a tu mascota — después de eso podrás agendar citas y
          reportar síntomas.
        </div>
      )}

      <div className="grid gap-4">
        <SemaforoOption
          to="/app/cita"
          emoji="🟢"
          title="Cita de Grooming"
          description="Tu mascota está bien y quiere verse bonita."
          disabled={!hasPets}
        />
        <SemaforoOption
          to="/app/sintoma"
          emoji="🟡"
          title="Síntoma Leve"
          description="Tu mascota tiene síntomas que requieren atención."
          disabled={!hasPets}
        />
        <SemaforoOption
          to="/app/emergencia"
          emoji="🔴"
          title="Emergencia"
          description="Tu mascota necesita atención urgente."
        />
      </div>

      <div className="grid gap-4 mt-8 pt-8 border-t border-gray-200 dark:border-slate-700">
        <SemaforoOption
          to="/app/tienda"
          emoji="🛍️"
          title="Tienda"
          description="Compra juguetes, accesorios y productos — paga al recogerlos en el local."
        />
      </div>
    </div>
  );
}

interface SemaforoOptionProps {
  to: string;
  emoji: string;
  title: string;
  description: string;
  disabled?: boolean;
}

function SemaforoOption({ to, emoji, title, description, disabled }: SemaforoOptionProps) {
  const content = (
    <div
      className={[
        'flex items-center gap-4 rounded-xl p-4 transition-all duration-200',
        disabled
          ? 'border border-gray-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
          : 'comic-border comic-shadow hover:-translate-y-0.5 hover:bg-gray-50 dark:hover:bg-slate-800/50',
      ].join(' ')}
    >
      <span className="text-3xl" aria-hidden="true">{emoji}</span>
      <div className="text-left">
        <p className="font-medium text-gray-900 dark:text-slate-100">{title}</p>
        <p className="text-sm text-gray-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );

  if (disabled) return content;

  return <Link to={to}>{content}</Link>;
}
