/**
 * Archivo: pages/staff/StaffEmergencyPage.tsx
 * Descripción: Configurar la información de emergencia que ven los clientes (RF-011, HU-011).
 * ¿Para qué? CA-011.4 — el staff edita los números de emergencia y la búsqueda del mapa.
 *   El endpoint PUT /emergency-info ya existía, pero no había ninguna pantalla que lo usara.
 * ¿Impacto? Al guardar, el backend exige al menos una clínica 24 horas y la línea de
 *   emergencias animales (CA-011.3); la pantalla lo valida antes para decir qué falta.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as emergencyApi from '@/api/emergency';
import {
  EMERGENCY_CATEGORY_LABELS,
  type EmergencyPhone,
  type EmergencyPhoneCategory,
} from '@/types/emergency';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { Alert } from '@/components/ui/Alert';

const CATEGORY_OPTIONS = Object.entries(EMERGENCY_CATEGORY_LABELS) as [
  EmergencyPhoneCategory,
  string,
][];

// ¿Qué? Mismas reglas que updateEmergencyInfoSchema en el backend.
const PHONE_REGEX = /^[0-9+()\s-]{3,20}$/;

const EMPTY_PHONE: EmergencyPhone = { label: '', phone: '', category: 'clinica_24h' };

// ¿Qué? Devuelve el primer problema del formulario, o null si se puede guardar.
function validate(searchQuery: string, phones: EmergencyPhone[]): string | null {
  if (searchQuery.trim().length < 3) {
    return 'El texto de búsqueda del mapa debe tener al menos 3 caracteres.';
  }
  for (const [i, p] of phones.entries()) {
    if (!p.label.trim()) return `Escribe el nombre del número ${i + 1}.`;
    if (!PHONE_REGEX.test(p.phone.trim())) {
      return `El teléfono del número ${i + 1} solo puede tener números, espacios, +, - y paréntesis.`;
    }
  }
  if (!phones.some((p) => p.category === 'clinica_24h')) {
    return 'Agrega al menos una clínica veterinaria 24 horas.';
  }
  if (!phones.some((p) => p.category === 'linea_emergencia')) {
    return 'Agrega la línea de emergencias animales.';
  }
  return null;
}

export function StaffEmergencyPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [phones, setPhones] = useState<EmergencyPhone[]>([]);
  const [configured, setConfigured] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    emergencyApi
      .getEmergencyInfo()
      .then((info) => {
        setSearchQuery(info.searchQuery);
        setPhones(info.emergencyPhones);
        setConfigured(info.configured);
        setIsLoaded(true);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la configuración.');
      });
  }, []);

  const updatePhone = (index: number, field: keyof EmergencyPhone, value: string) => {
    setPhones((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
    setError(null);
    setSuccess(false);
  };

  const removePhone = (index: number) => {
    setPhones((prev) => prev.filter((_, i) => i !== index));
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    const problem = validate(searchQuery, phones);
    if (problem) {
      setError(problem);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const saved = await emergencyApi.updateEmergencyInfo({
        searchQuery: searchQuery.trim(),
        emergencyPhones: phones.map((p) => ({ ...p, label: p.label.trim(), phone: p.phone.trim() })),
      });
      setPhones(saved.emergencyPhones);
      setConfigured(true);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la configuración.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <Link to="/staff" className="text-sm text-gray-500 dark:text-slate-400 hover:underline">
        ← Volver
      </Link>

      <h1 className="text-2xl font-comic tracking-wide text-gray-900 dark:text-slate-100 mt-4 mb-1">
        🚨 Configurar Emergencia
      </h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        Estos son los números y el mapa que ve el cliente al elegir 🔴 Emergencia.
      </p>

      {isLoaded && !configured && (
        <div className="mb-4">
          <Alert
            type="info"
            message="Todavía no se ha guardado ninguna configuración: el cliente solo ve la línea 123. Agrega el número de una clínica veterinaria 24 horas cercana y guarda."
          />
        </div>
      )}

      {success && (
        <div className="mb-4">
          <Alert type="success" message="Información de emergencia guardada. Los clientes ya la ven." />
        </div>
      )}

      {isLoaded && (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {error && <Alert type="error" message={error} />}

          <InputField
            id="searchQuery"
            name="searchQuery"
            label="Búsqueda del mapa"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setError(null);
              setSuccess(false);
            }}
            placeholder="Ej: veterinarias 24 horas cerca de Calle 10 #5-20, Bogotá"
          />
          <p className="-mt-4 text-xs text-gray-500 dark:text-slate-400">
            Incluye la dirección del local para que el mapa muestre veterinarias cercanas al negocio.
          </p>

          <fieldset className="space-y-4">
            <legend className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">
              Números de emergencia
            </legend>
            {phones.map((p, i) => (
              <div
                key={i}
                data-testid="emergency-phone-row"
                className="rounded-lg border border-gray-200 dark:border-slate-700 p-3 space-y-3"
              >
                <SelectField
                  id={`category-${i}`}
                  name={`category-${i}`}
                  label={`Tipo del número ${i + 1}`}
                  value={p.category}
                  onChange={(e) => updatePhone(i, 'category', e.target.value)}
                >
                  {CATEGORY_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectField>
                <InputField
                  id={`label-${i}`}
                  name={`label-${i}`}
                  label={`Nombre del número ${i + 1}`}
                  value={p.label}
                  onChange={(e) => updatePhone(i, 'label', e.target.value)}
                  placeholder="Ej: Clínica Veterinaria San Martín"
                />
                <InputField
                  id={`phone-${i}`}
                  name={`phone-${i}`}
                  label={`Teléfono del número ${i + 1}`}
                  type="tel"
                  value={p.phone}
                  onChange={(e) => updatePhone(i, 'phone', e.target.value)}
                  placeholder="Ej: 601 555 1234"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removePhone(i)}
                    className="text-sm text-red-600 dark:text-red-400 hover:underline"
                  >
                    Quitar este número
                  </button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPhones((prev) => [...prev, { ...EMPTY_PHONE }])}
            >
              + Agregar número
            </Button>
          </fieldset>

          <div className="flex justify-end">
            <Button type="submit" isLoading={isSaving}>
              Guardar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
