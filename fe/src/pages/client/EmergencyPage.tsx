/**
 * Archivo: pages/client/EmergencyPage.tsx
 * Descripción: Emergencia — veterinarias cercanas (RF-011, HU-011).
 * ¿Para qué? GroomingSpa no atiende emergencias — esta pantalla solo informa,
 *   nunca crea citas ni reportes (CA-011.1).
 * ¿Impacto? En una emergencia la pantalla no puede quedar vacía: si la API falla se muestra
 *   la línea 123, y si no hay clave de mapas se ofrece abrir Google Maps directamente.
 */

import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import * as emergencyApi from '@/api/emergency';
import {
  EMERGENCY_CATEGORY_LABELS,
  type EmergencyInfo,
  type EmergencyPhoneCategory,
} from '@/types/emergency';

// ¿Qué? Clave de la API de mapas leída de una variable de entorno — nunca hardcodeada
//   directamente en el componente (RN-113, corrige el hallazgo de seguridad del código anterior).
const MAPS_API_KEY = import.meta.env.VITE_MAPS_API_KEY as string | undefined;

// ¿Qué? Lo mínimo que se muestra si no se pudo consultar la API (sin conexión, servidor caído).
const FALLBACK_INFO: EmergencyInfo = {
  searchQuery: 'veterinarias 24 horas cercanas',
  emergencyPhones: [
    { label: 'Línea de emergencias 123', phone: '123', category: 'linea_emergencia' },
  ],
  configured: false,
};

// ¿Qué? Orden en que se listan los números: primero las clínicas 24 h (CA-011.3).
const CATEGORY_ORDER: EmergencyPhoneCategory[] = ['clinica_24h', 'linea_emergencia', 'otro'];

export function EmergencyPage() {
  const [info, setInfo] = useState<EmergencyInfo | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    emergencyApi
      .getEmergencyInfo()
      .then(setInfo)
      .catch(() => {
        setInfo(FALLBACK_INFO);
        setUsingFallback(true);
      });
  }, []);

  const phones = [...(info?.emergencyPhones ?? [])].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
  );
  const query = encodeURIComponent(info?.searchQuery ?? FALLBACK_INFO.searchQuery);

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <Link to="/app" className="text-sm text-gray-500 dark:text-slate-400 hover:underline">
        ← Volver
      </Link>

      <h1 className="text-2xl font-comic tracking-wide text-gray-900 dark:text-slate-100 mt-4 mb-1">
        🔴 Emergencia — Veterinarias Cercanas
      </h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        GroomingSpa no atiende emergencias médicas. Aquí tienes veterinarias cercanas y
        números de contacto inmediato.
      </p>

      {/* ¿Qué? CA-011.3 — los números van primero: en una emergencia es lo más rápido. */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
        📞 Números de emergencia
      </h2>
      {usingFallback && (
        <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">
          No pudimos cargar todos los números. Mientras tanto, llama a la línea 123.
        </p>
      )}
      <ul className="space-y-2 mb-6" aria-label="Números de emergencia">
        {phones.map((p, i) => (
          <li
            key={`${p.phone}-${i}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm"
          >
            <span className="min-w-0">
              <span className="block text-gray-700 dark:text-slate-300">{p.label}</span>
              {p.category !== 'otro' && (
                <span className="block text-xs text-gray-500 dark:text-slate-400">
                  {EMERGENCY_CATEGORY_LABELS[p.category]}
                </span>
              )}
            </span>
            <a
              href={`tel:${p.phone.replace(/\s/g, '')}`}
              className="shrink-0 font-semibold text-brand-600 dark:text-brand-400"
            >
              {p.phone}
            </a>
          </li>
        ))}
      </ul>

      {/* ¿Qué? CA-011.2 — mapa con la búsqueda configurada por el staff. */}
      {info && MAPS_API_KEY ? (
        <iframe
          title="Veterinarias cercanas"
          width="100%"
          height="300"
          style={{ border: 0, borderRadius: '12px' }}
          loading="lazy"
          src={`https://www.google.com/maps/embed/v1/search?key=${MAPS_API_KEY}&q=${query}`}
        />
      ) : (
        // ¿Qué? Sin clave de la API de mapas, un enlace a Google Maps (no necesita clave).
        // ¿Para qué? Antes se le mostraba al CLIENTE "falta configurar VITE_MAPS_API_KEY",
        //   un mensaje técnico que no le servía para encontrar una veterinaria.
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${query}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-center text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-gray-50 dark:hover:bg-slate-800/50"
        >
          🗺️ Abrir mapa de veterinarias cercanas
        </a>
      )}
    </div>
  );
}
