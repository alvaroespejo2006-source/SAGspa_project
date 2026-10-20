/**
 * Archivo: pages/staff/StaffAgendaPage.tsx
 * Descripción: Calendario del día para el staff (RF-017, HU-017).
 * ¿Para qué? Ver de un vistazo las citas de grooming del día y avanzar su estado
 *   (pendiente → confirmada → completada, o cancelada) a medida que se atienden.
 * ¿Impacto? Un estado final (completada/cancelada) no puede volver a moverse (RN-097),
 *   por lo que esos botones se ocultan una vez la cita llega a ese estado.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as appointmentsApi from '@/api/appointments';
import type { AgendaAppointment, AppointmentStatus } from '@/types/appointments';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { Alert } from '@/components/ui/Alert';
import { StatusBadge } from '@/components/ui/StatusBadge';

// ¿Qué? Fecha LOCAL (AAAA-MM-DD) desplazada `days` días desde `base`.
// ¿Para qué? toISOString() da la fecha en UTC: desde las 7:00 p.m. en Colombia la agenda
//   "de hoy" abría en el día siguiente (HU-017, mismo bug que HU-009).
function shiftDate(base: string, days: number): string {
  const [y, m, d] = base.split('-').map(Number);
  const date = new Date(y!, m! - 1, d! + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function todayLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// ¿Qué? Próximo estado sugerido según el estado actual — el flujo normal de una cita.
const NEXT_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  pending: 'confirmed',
  confirmed: 'completed',
};

// ¿Qué? "Atendida" en vez de "completada", como la ve el cliente (CA-009.6, CA-017.4).
const NEXT_LABEL: Partial<Record<AppointmentStatus, string>> = {
  pending: 'Confirmar',
  confirmed: 'Marcar como atendida',
};

const STATUS_LABELS: Partial<Record<AppointmentStatus, string>> = { completed: 'Atendida' };

const SUCCESS_MESSAGES: Record<AppointmentStatus, string> = {
  pending: '',
  confirmed: 'Cita confirmada. El cliente ya la ve confirmada en su app.',
  completed: 'Cita marcada como atendida.',
  cancelled: 'Cita cancelada.',
};

export function StaffAgendaPage() {
  const [date, setDate] = useState(todayLocal());
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadAgenda = (d: string) => {
    setIsLoading(true);
    setError(null);
    appointmentsApi
      .getAgenda(d)
      .then(setAppointments)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar la agenda.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadAgenda(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ¿Qué? CA-017.2 — cambiar de día con el selector o con los botones.
  const goTo = (d: string) => {
    if (!d) return;
    setDate(d);
    setSuccess(null);
    loadAgenda(d);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => goTo(e.target.value);

  const handleStatusChange = async (appt: AgendaAppointment, status: AppointmentStatus) => {
    // ¿Qué? Cancelar pide confirmación: antes un clic cancelaba la cita sin preguntar.
    if (
      status === 'cancelled' &&
      !window.confirm(`¿Cancelar la cita de ${appt.pet.name} a las ${appt.time}?`)
    ) {
      return;
    }
    const id = appt.id;
    setUpdatingId(id);
    setError(null);
    setSuccess(null);
    try {
      await appointmentsApi.updateAppointmentStatus(id, status);
      setSuccess(SUCCESS_MESSAGES[status]);
      loadAgenda(date);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la cita.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/staff" className="text-sm text-gray-500 dark:text-slate-400 hover:underline">
        ← Volver
      </Link>

      <h1 className="text-2xl font-comic tracking-wide text-gray-900 dark:text-slate-100 mt-4 mb-6">
        📅 Agenda del día
      </h1>

      <div className="mb-6 flex flex-wrap items-end gap-2">
        <div className="max-w-xs">
          <InputField
            id="date"
            name="date"
            label="Fecha"
            type="date"
            value={date}
            onChange={handleDateChange}
          />
        </div>
        <Button
          variant="secondary"
          className="text-xs px-3 py-2"
          onClick={() => goTo(shiftDate(date, -1))}
        >
          ← Día anterior
        </Button>
        <Button
          variant="secondary"
          className="text-xs px-3 py-2"
          onClick={() => goTo(todayLocal())}
        >
          Hoy
        </Button>
        <Button
          variant="secondary"
          className="text-xs px-3 py-2"
          onClick={() => goTo(shiftDate(date, 1))}
        >
          Día siguiente →
        </Button>
      </div>

      {success && (
        <div className="mb-4">
          <Alert type="success" message={success} />
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Cargando...</p>
      ) : appointments.length === 0 ? (
        // ¿Qué? CA-017.5 — mensaje cuando no hay citas.
        <p className="text-sm text-gray-500 dark:text-slate-400">
          No hay citas programadas para este día.
        </p>
      ) : (
        <ul className="space-y-3" aria-label="Citas del día">
          {appointments.map((a) => {
            const nextStatus = NEXT_STATUS[a.status];
            const isFinal = a.status === 'completed' || a.status === 'cancelled';
            return (
              <li
                key={a.id}
                className="rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900 dark:text-slate-100">
                    {a.time} — {a.service.name}
                  </span>
                  <StatusBadge status={a.status} label={STATUS_LABELS[a.status]} />
                </div>
                <p className="text-gray-500 dark:text-slate-400 mb-1">
                  🐾 {a.pet.name} — {a.client.firstName} {a.client.lastName}
                  {a.client.phone ? ` — ${a.client.phone}` : ''}
                </p>

                {!isFinal && (
                  <div className="flex gap-2 mt-2">
                    {nextStatus && (
                      <Button
                        variant="primary"
                        className="text-xs px-3 py-1.5"
                        isLoading={updatingId === a.id}
                        onClick={() => handleStatusChange(a, nextStatus)}
                      >
                        {NEXT_LABEL[a.status]}
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      className="text-xs px-3 py-1.5"
                      isLoading={updatingId === a.id}
                      onClick={() => handleStatusChange(a, 'cancelled')}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
