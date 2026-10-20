/**
 * Archivo: pages/staff/StaffServicesPage.tsx
 * Descripción: Catálogo de servicios de grooming (RF-014, HU-014).
 * ¿Para qué? El staff crea, EDITA (precio incluido, CA-014.2) y desactiva servicios — sin un
 *   servicio activo, los clientes no pueden agendar citas (RF-009).
 * ¿Impacto? "Eliminar" desactiva el servicio si ya tiene citas asociadas (RN-143),
 *   en vez de borrarlo, para no perder el historial; la pantalla dice cuál de los dos pasó.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as servicesApi from '@/api/services';
import type { Service } from '@/types/services';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { Alert } from '@/components/ui/Alert';

interface FormData {
  name: string;
  description: string;
  price: string;
  durationMinutes: string;
}

const EMPTY_FORM: FormData = { name: '', description: '', price: '', durationMinutes: '' };

function serviceToForm(service: Service): FormData {
  return {
    name: service.name,
    description: service.description ?? '',
    price: String(service.price),
    durationMinutes: String(service.durationMinutes),
  };
}

// ¿Qué? Mismas reglas que createServiceSchema en el backend.
function validateForm(data: FormData): Partial<FormData> {
  const errors: Partial<FormData> = {};
  if (data.name.trim().length < 2) {
    errors.name = 'El nombre del servicio debe tener al menos 2 caracteres.';
  }
  const price = Number(data.price);
  if (!data.price || !(price > 0)) errors.price = 'El precio debe ser mayor a 0.';
  else if (price > 99_999_999) errors.price = 'Revisa el precio: es demasiado alto.';
  const duration = Number(data.durationMinutes);
  if (!data.durationMinutes || !Number.isInteger(duration) || duration <= 0) {
    errors.durationMinutes = 'La duración debe ser un número entero de minutos mayor a 0.';
  } else if (duration > 480) {
    errors.durationMinutes = 'La duración no puede superar las 8 horas (480 minutos).';
  }
  return errors;
}

export function StaffServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<FormData>>({});
  // ¿Qué? null = el formulario crea un servicio nuevo; un id = está editando ese servicio.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadServices = () =>
    servicesApi
      .listServicesForStaff(false)
      .then(setServices)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los servicios.');
      });

  useEffect(() => {
    loadServices();
  }, []);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setFieldErrors({});
    setEditingId(null);
  };

  const startEdit = (service: Service) => {
    setFormData(serviceToForm(service));
    setFieldErrors({});
    setEditingId(service.id);
    setSuccess(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    const errors = validateForm(formData);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    setError(null);
    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      price: Number(formData.price),
      durationMinutes: Number(formData.durationMinutes),
    };
    try {
      if (editingId) {
        // ¿Qué? CA-014.2 — el nuevo precio queda en el catálogo que ven los clientes.
        await servicesApi.updateService(editingId, payload);
        setSuccess('Cambios guardados. Los clientes ya ven el servicio actualizado.');
      } else {
        await servicesApi.createService(payload);
        setSuccess('Servicio creado. Ya está disponible para que los clientes lo elijan.');
      }
      resetForm();
      await loadServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el servicio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (service: Service) => {
    setBusyId(service.id);
    setError(null);
    setSuccess(null);
    try {
      await servicesApi.updateService(service.id, { active: !service.active });
      setSuccess(
        service.active
          ? `"${service.name}" quedó inactivo: los clientes ya no lo ven al agendar.`
          : `"${service.name}" quedó activo de nuevo.`,
      );
      await loadServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el servicio.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (service: Service) => {
    // ¿Qué? Confirmación: antes un clic en "Eliminar" borraba el servicio sin preguntar.
    if (!window.confirm(`¿Eliminar el servicio "${service.name}"?`)) return;
    setBusyId(service.id);
    setError(null);
    setSuccess(null);
    try {
      // ¿Qué? CA-014.3 — el mensaje dice si se borró o se desactivó por tener citas.
      setSuccess(await servicesApi.deleteService(service.id));
      if (editingId === service.id) resetForm();
      await loadServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el servicio.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <Link to="/staff" className="text-sm text-gray-500 dark:text-slate-400 hover:underline">
        ← Volver
      </Link>

      <h1 className="text-2xl font-comic tracking-wide text-gray-900 dark:text-slate-100 mt-4 mb-6">
        ✂️ Catálogo de Servicios
      </h1>

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

      <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">
        El precio de aquí es el <strong>precio base</strong> (mascota pequeña, pelo corto, sin
        condiciones). Los recargos por tamaño, pelo y piel se ajustan en el{' '}
        <Link to="/staff/tarifario" className="text-brand-600 dark:text-brand-400 hover:underline">
          tarifario de grooming
        </Link>
        .
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4 mb-10">
        {editingId && (
          <p className="text-sm text-brand-700 dark:text-brand-300">
            Editando un servicio existente.{' '}
            <button type="button" onClick={resetForm} className="underline">
              Cancelar y crear uno nuevo
            </button>
          </p>
        )}
        <InputField
          id="name"
          name="name"
          label="Nombre del servicio"
          required
          value={formData.name}
          onChange={handleChange}
          placeholder="Ej: Baño y corte"
          error={fieldErrors.name}
        />
        <InputField
          id="description"
          name="description"
          label="Descripción (opcional)"
          value={formData.description}
          onChange={handleChange}
        />
        <InputField
          id="price"
          name="price"
          label="Precio (COP)"
          type="number"
          min={1}
          required
          value={formData.price}
          onChange={handleChange}
          error={fieldErrors.price}
        />
        <InputField
          id="durationMinutes"
          name="durationMinutes"
          label="Duración (minutos)"
          type="number"
          min={1}
          required
          value={formData.durationMinutes}
          onChange={handleChange}
          error={fieldErrors.durationMinutes}
        />

        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSubmitting}>
            {editingId ? 'Guardar cambios' : 'Crear servicio'}
          </Button>
        </div>
      </form>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
        Servicios existentes
      </h2>
      {services.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Todavía no hay servicios registrados.
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Servicios existentes">
          {services.map((s) => (
            <li
              key={s.id}
              className={`rounded-lg border px-4 py-3 text-sm ${
                s.active
                  ? 'border-gray-200 dark:border-slate-700'
                  : 'border-gray-200 dark:border-slate-700 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-gray-900 dark:text-slate-100">
                  {s.name} — desde ${s.price.toLocaleString('es-CO')} ({s.durationMinutes} min)
                </span>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {s.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  variant="secondary"
                  className="text-xs px-3 py-1.5"
                  disabled={busyId === s.id}
                  onClick={() => startEdit(s)}
                  aria-label={`Editar ${s.name}`}
                >
                  Editar
                </Button>
                <Button
                  variant="secondary"
                  className="text-xs px-3 py-1.5"
                  isLoading={busyId === s.id}
                  onClick={() => toggleActive(s)}
                >
                  {s.active ? 'Desactivar' : 'Activar'}
                </Button>
                <Button
                  variant="danger"
                  className="text-xs px-3 py-1.5"
                  isLoading={busyId === s.id}
                  onClick={() => handleDelete(s)}
                  aria-label={`Eliminar ${s.name}`}
                >
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
