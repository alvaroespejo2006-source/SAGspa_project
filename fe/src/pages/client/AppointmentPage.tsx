/**
 * Archivo: pages/client/AppointmentPage.tsx
 * Descripción: Agendar cita de grooming (RF-009, HU-009) y ver "Mis citas".
 * ¿Para qué? La mascota y el servicio se eligen de listas ya existentes — nunca texto
 *   libre (RN-091, RN-093). Al elegir ambos, se muestra un estimador de precio (RF-014)
 *   con el desglose; si la mascota tiene una condición de piel que exige revisión, no se
 *   deja agendar y se deriva al reporte de síntoma (RF-010).
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as petsApi from '@/api/pets';
import * as servicesApi from '@/api/services';
import * as appointmentsApi from '@/api/appointments';
import type { Pet } from '@/types/pets';
import type { Service } from '@/types/services';
import type { MyAppointment } from '@/types/appointments';
import type { PriceBreakdown } from '@/types/pricing';
import { formatCOP } from '@/types/pricing';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/SelectField';
import { InputField } from '@/components/ui/InputField';
import { Alert } from '@/components/ui/Alert';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface FormData {
  petId: string;
  serviceId: string;
  date: string;
  time: string;
}

const EMPTY_FORM: FormData = { petId: '', serviceId: '', date: '', time: '' };

// ¿Qué? Fecha mínima seleccionable — mañana (RN-092), con la fecha LOCAL del navegador.
// ¿Para qué? toISOString() da la fecha en UTC: desde las 7:00 p.m. en Colombia ya devolvía
//   pasado mañana y no dejaba elegir mañana (HU-009, CA-009.3).
function tomorrowLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ¿Qué? Valida el formulario con los mensajes de la HU antes de enviarlo (CA-009.3, CA-009.4).
// ¿Para qué? Antes no se validaba nada en la pantalla: el error llegaba del servidor y con
//   un texto distinto al de la HU.
function validateForm(data: FormData): Partial<FormData> {
  const errors: Partial<FormData> = {};
  if (!data.petId) errors.petId = 'Selecciona tu mascota.';
  if (!data.serviceId) errors.serviceId = 'Selecciona un servicio.';
  if (!data.date) errors.date = 'Selecciona la fecha de la cita.';
  else if (data.date < tomorrowLocal()) errors.date = 'La cita debe ser a partir de mañana';
  if (!data.time) errors.time = 'Selecciona la hora de la cita.';
  else if (data.time < '09:00' || data.time > '18:00') {
    errors.time = 'La hora debe estar entre las 9:00am y las 6:00pm';
  }
  return errors;
}

// ¿Qué? Texto del estado de una cita como lo nombra CA-009.6.
const APPOINTMENT_STATUS_LABELS: Record<string, string> = { completed: 'Atendida' };

export function AppointmentPage() {
  // ¿Qué? null mientras carga — así no se confunde "cargando" con "no tiene mascotas".
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<MyAppointment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<FormData>>({});
  const [quote, setQuote] = useState<PriceBreakdown | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadAppointments = () => appointmentsApi.listMyAppointments().then(setAppointments);

  // ¿Qué? Si alguna carga falla, se avisa en vez de dejar la pantalla vacía sin explicación.
  useEffect(() => {
    const onError = (err: unknown) =>
      setLoadError(err instanceof Error ? err.message : 'No se pudo cargar la información.');
    petsApi.listMyPets().then(setPets).catch(onError);
    servicesApi.listServices().then(setServices).catch(onError);
    appointmentsApi.listMyAppointments().then(setAppointments).catch(onError);
  }, []);

  // ¿Qué? Al tener mascota + servicio, pide el estimador de precio (RF-014).
  const { petId: selectedPetId, serviceId: selectedServiceId } = formData;
  useEffect(() => {
    if (!selectedPetId || !selectedServiceId) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setIsQuoting(true);
    appointmentsApi
      .quoteAppointment(selectedPetId, selectedServiceId)
      .then((b) => {
        if (!cancelled) setQuote(b);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      })
      .finally(() => {
        if (!cancelled) setIsQuoting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPetId, selectedServiceId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    setError(null);
  };

  const blocked = quote?.blocked ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked) return;
    setSuccess(false);

    const errors = validateForm(formData);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    setError(null);

    try {
      await appointmentsApi.createAppointment(formData);
      setSuccess(true);
      setFormData(EMPTY_FORM);
      setQuote(null);
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agendar la cita.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <Link to="/app" className="text-sm text-gray-500 dark:text-slate-400 hover:underline">
        ← Volver
      </Link>

      <h1 className="text-2xl font-comic tracking-wide text-gray-900 dark:text-slate-100 mt-4 mb-6">
        🟢 Agendar Cita de Grooming
      </h1>

      {/* ¿Qué? CA-009.5 — dice que la cita quedó pendiente y que la confirmarán. */}
      {success && (
        <div className="mb-4">
          <Alert
            type="success"
            message="¡Cita agendada! Quedó en estado pendiente y te contactaremos para confirmarla."
          />
        </div>
      )}

      {loadError && (
        <div className="mb-4">
          <Alert type="error" message={loadError} />
        </div>
      )}

      {/* ¿Qué? CA-009.2b — también si se entra a /app/cita escribiendo la URL. */}
      {pets !== null && pets.length === 0 ? (
        <div className="mb-10">
          <Alert
            type="info"
            message="Todavía no tienes mascotas registradas. Acércate o comunícate con GroomingSpa para que registremos a tu mascota; después podrás agendar citas."
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4 mb-10">
          {error && <Alert type="error" message={error} />}

          <SelectField
            id="petId"
            name="petId"
            label="Mascota"
            required
            value={formData.petId}
            onChange={handleChange}
            error={fieldErrors.petId}
          >
            <option value="" disabled>
              Selecciona tu mascota
            </option>
            {(pets ?? []).map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="serviceId"
            name="serviceId"
            label="Servicio"
            required
            value={formData.serviceId}
            onChange={handleChange}
            error={fieldErrors.serviceId}
          >
            <option value="" disabled>
              Selecciona un servicio
            </option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} — desde {formatCOP(service.price)}
              </option>
            ))}
          </SelectField>

          {/* ─── Estimador de precio / aviso de bloqueo (RF-014, RF-010) ─── */}
          {isQuoting && (
            <p className="text-sm text-gray-500 dark:text-slate-400">Calculando precio…</p>
          )}

          {quote && !blocked && (
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Precio estimado — {quote.petName}
              </p>
              <dl className="mt-3 space-y-1.5 text-sm tabular-nums">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-slate-400">Base</dt>
                  <dd>{formatCOP(quote.base)}</dd>
                </div>
                {quote.lines.map((line) => (
                  <div key={line.label} className="flex justify-between">
                    <dt className="text-gray-500 dark:text-slate-400">{line.label}</dt>
                    <dd className="text-amber-700 dark:text-amber-500">
                      + {formatCOP(line.amount)}
                    </dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-gray-200 dark:border-slate-700 pt-2 font-semibold text-gray-900 dark:text-slate-100">
                  <dt>Total estimado</dt>
                  <dd>{formatCOP(quote.total)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                El personal confirma el total al confirmar la cita.{' '}
                <Link to="/precios" className="text-brand-600 dark:text-brand-400 hover:underline">
                  Cómo calculamos el precio
                </Link>
              </p>
            </div>
          )}

          {quote && blocked && (
            <div className="rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-4">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {quote.petName} necesita una revisión antes de un baño
              </p>
              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                Registramos en su ficha: {quote.blockingConditions.join(', ')}. Por seguridad no se
                puede agendar grooming hasta que el personal lo revise.
              </p>
              <Link
                to="/app/sintoma"
                className="mt-3 inline-block text-sm font-medium text-red-800 dark:text-red-300 underline"
              >
                Reportar un síntoma (🟡) →
              </Link>
            </div>
          )}

          <InputField
            id="date"
            name="date"
            label="Fecha"
            type="date"
            required
            min={tomorrowLocal()}
            value={formData.date}
            onChange={handleChange}
            error={fieldErrors.date}
          />

          <InputField
            id="time"
            name="time"
            label="Hora (entre 9:00am y 6:00pm)"
            type="time"
            required
            min="09:00"
            max="18:00"
            value={formData.time}
            onChange={handleChange}
            error={fieldErrors.time}
          />

          <div className="flex justify-end pt-2">
            <Button type="submit" isLoading={isLoading} disabled={blocked}>
              Agendar cita 🐾
            </Button>
          </div>
        </form>
      )}

      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">Mis citas</h2>
      {appointments.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Todavía no tienes citas agendadas.
        </p>
      ) : (
        <ul className="space-y-2">
          {appointments.map((a) => {
            return (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm text-gray-700 dark:text-slate-300"
              >
                <span>
                  {a.date} — {a.time} — {a.service.name} ({a.pet.name})
                  {a.totalPrice != null && (
                    <span className="text-gray-500 dark:text-slate-400">
                      {' '}
                      · {formatCOP(a.totalPrice)}
                    </span>
                  )}
                </span>
                <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABELS[a.status]} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
