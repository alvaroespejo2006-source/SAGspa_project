/**
 * Archivo: pages/staff/StaffSuppliersPage.tsx
 * Descripción: Proveedores de productos (RF-020, HU-020).
 * ¿Para qué? El staff registra, EDITA (CA-020.2) y desactiva proveedores para saber a quién
 *   pedirle reabastecimiento (RF-021).
 * ¿Impacto? "Eliminar" desactiva el proveedor si ya tiene pedidos asociados (RN-202) en vez de
 *   borrarlo, para no perder el historial; la pantalla dice cuál de los dos pasó.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as suppliersApi from '@/api/suppliers';
import type { Supplier } from '@/types/suppliers';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { Alert } from '@/components/ui/Alert';

interface FormData {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
}

const EMPTY_FORM: FormData = { name: '', contactName: '', phone: '', email: '', address: '' };

function supplierToForm(s: Supplier): FormData {
  return {
    name: s.name,
    contactName: s.contactName ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    address: s.address ?? '',
  };
}

// ¿Qué? Mismas reglas que createSupplierSchema en el backend.
const PHONE_REGEX = /^[0-9+()\s-]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(data: FormData): Partial<FormData> {
  const errors: Partial<FormData> = {};
  if (data.name.trim().length < 2) {
    errors.name = 'El nombre del proveedor debe tener al menos 2 caracteres.';
  }
  if (data.phone.trim() && !PHONE_REGEX.test(data.phone.trim())) {
    errors.phone = 'El teléfono solo puede tener números, espacios, +, - y paréntesis (7 a 20).';
  }
  if (data.email.trim() && !EMAIL_REGEX.test(data.email.trim())) {
    errors.email = 'Ingresa un correo válido, por ejemplo: nombre@dominio.com';
  }
  return errors;
}

export function StaffSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<FormData>>({});
  // ¿Qué? null = el formulario crea un proveedor nuevo; un id = está editando ese proveedor.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadSuppliers = () =>
    suppliersApi
      .listSuppliers()
      .then(setSuppliers)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los proveedores.');
      });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setFieldErrors({});
    setEditingId(null);
  };

  const startEdit = (supplier: Supplier) => {
    setFormData(supplierToForm(supplier));
    setFieldErrors({});
    setEditingId(supplier.id);
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
    try {
      if (editingId) {
        // ¿Qué? CA-020.2 — al editar se envían todos los campos: uno vacío borra ese dato.
        await suppliersApi.updateSupplier(editingId, {
          name: formData.name.trim(),
          contactName: formData.contactName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          address: formData.address.trim(),
        });
        setSuccess('Cambios guardados.');
      } else {
        await suppliersApi.createSupplier({
          name: formData.name.trim(),
          contactName: formData.contactName.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
        });
        setSuccess('Proveedor creado.');
      }
      resetForm();
      await loadSuppliers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el proveedor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (supplier: Supplier) => {
    setBusyId(supplier.id);
    setError(null);
    setSuccess(null);
    try {
      await suppliersApi.updateSupplier(supplier.id, { active: !supplier.active });
      setSuccess(
        supplier.active
          ? `"${supplier.name}" quedó inactivo.`
          : `"${supplier.name}" quedó activo de nuevo.`,
      );
      await loadSuppliers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el proveedor.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    // ¿Qué? Confirmación: antes un clic en "Eliminar" borraba el proveedor sin preguntar.
    if (!window.confirm(`¿Eliminar el proveedor "${supplier.name}"?`)) return;
    setBusyId(supplier.id);
    setError(null);
    setSuccess(null);
    try {
      // ¿Qué? CA-020.3 — el mensaje dice si se borró o se desactivó por tener pedidos.
      setSuccess(await suppliersApi.deleteSupplier(supplier.id));
      if (editingId === supplier.id) resetForm();
      await loadSuppliers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el proveedor.');
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
        📦 Proveedores
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

      <form onSubmit={handleSubmit} noValidate className="space-y-4 mb-10">
        {editingId && (
          <p className="text-sm text-brand-700 dark:text-brand-300">
            Editando un proveedor existente.{' '}
            <button type="button" onClick={resetForm} className="underline">
              Cancelar y crear uno nuevo
            </button>
          </p>
        )}
        <InputField
          id="name"
          name="name"
          label="Nombre del proveedor"
          required
          value={formData.name}
          onChange={handleChange}
          placeholder="Ej: Distribuidora PetCol"
          error={fieldErrors.name}
        />
        <InputField
          id="contactName"
          name="contactName"
          label="Nombre de contacto (opcional)"
          value={formData.contactName}
          onChange={handleChange}
        />
        <InputField
          id="phone"
          name="phone"
          label="Teléfono (opcional)"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Ej: 601 555 1234"
          error={fieldErrors.phone}
        />
        <InputField
          id="email"
          name="email"
          label="Email (opcional)"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={fieldErrors.email}
        />
        <InputField
          id="address"
          name="address"
          label="Dirección (opcional)"
          value={formData.address}
          onChange={handleChange}
        />

        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSubmitting}>
            {editingId ? 'Guardar cambios' : 'Crear proveedor'}
          </Button>
        </div>
      </form>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
        Proveedores registrados
      </h2>
      {suppliers.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Todavía no hay proveedores registrados.
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Proveedores registrados">
          {suppliers.map((s) => (
            <li
              key={s.id}
              className={`rounded-lg border px-4 py-3 text-sm ${
                s.active
                  ? 'border-gray-200 dark:border-slate-700'
                  : 'border-gray-200 dark:border-slate-700 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-gray-900 dark:text-slate-100">{s.name}</span>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {s.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              {(s.contactName || s.phone || s.email || s.address) && (
                <p className="text-gray-500 dark:text-slate-400">
                  {[s.contactName, s.phone, s.email, s.address].filter(Boolean).join(' — ')}
                </p>
              )}
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
