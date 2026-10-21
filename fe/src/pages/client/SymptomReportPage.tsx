/**
 * Archivo: pages/client/SymptomReportPage.tsx
 * Descripción: Reportar síntoma leve (RF-010, HU-010) y ver "Mis reportes" con su recomendación.
 * ¿Impacto? No pide diagnóstico ni tratamiento — GroomingSpa no tiene veterinario
 *   profesional en planta, solo una auxiliar que revisa y recomienda (ver límite de RF-010).
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as petsApi from '@/api/pets';
import * as reportsApi from '@/api/symptom-reports';
import type { Pet } from '@/types/pets';
import type { MySymptomReport } from '@/types/symptom-reports';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/SelectField';
import { InputField } from '@/components/ui/InputField';
import { Alert } from '@/components/ui/Alert';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface FormData {
  petId: string;
  symptom: string;
  daysWithSymptom: string;
}

const EMPTY_FORM: FormData = { petId: '', symptom: '', daysWithSymptom: '' };

// ¿Qué? Valida el formulario antes de enviarlo (HU-010, CA-010.2).
// ¿Para qué? Antes se enviaba vacío y el error del servidor llegaba sin decir qué campo faltaba.
function validateForm(data: FormData): Partial<FormData> {
  const errors: Partial<FormData> = {};
  if (!data.petId) errors.petId = 'Selecciona la mascota.';
  const symptom = data.symptom.trim();
  if (!symptom) errors.symptom = 'Describe el síntoma de tu mascota.';
  else if (symptom.length < 3) errors.symptom = 'Describe el síntoma con al menos 3 caracteres.';
  const days = Number(data.daysWithSymptom);
  if (!data.daysWithSymptom) errors.daysWithSymptom = 'Indica hace cuántos días tiene el síntoma.';
  else if (!Number.isInteger(days) || days < 1) errors.daysWithSymptom = 'Debe ser al menos 1 día.';
  else if (days > 365) {
    errors.daysWithSymptom = 'Si lleva más de un año, escribe 365 y cuéntalo en la descripción.';
  }
  return errors;
}

export function SymptomReportPage() {
  // ¿Qué? null mientras carga — así no se confunde "cargando" con "no tiene mascotas".
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [reports, setReports] = useState<MySymptomReport[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<FormData>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadReports = () => reportsApi.listMyReports().then(setReports);

  // ¿Qué? Si alguna carga falla, se avisa en vez de dejar la pantalla vacía sin explicación.
  useEffect(() => {
    const onError = (err: unknown) =>
      setLoadError(err instanceof Error ? err.message : 'No se pudo cargar la información.');
    petsApi.listMyPets().then(setPets).catch(onError);
    reportsApi.listMyReports().then(setReports).catch(onError);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    const errors = validateForm(formData);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    setError(null);

    try {
      await reportsApi.createSymptomReport({
        petId: formData.petId,
        symptom: formData.symptom.trim(),
        daysWithSymptom: Number(formData.daysWithSymptom),
      });
      setSuccess(true);
      setFormData(EMPTY_FORM);
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el reporte.');
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
        🟡 Reportar Síntoma Leve
      </h1>

      {success && (
        <div className="mb-4">
          <Alert type="success" message="Reporte enviado. Alguien del staff lo revisará pronto." />
        </div>
      )}

      {loadError && (
        <div className="mb-4">
          <Alert type="error" message={loadError} />
        </div>
      )}

      {/* ¿Qué? CA-009.2b también aplica al 🟡 — incluso si se entra escribiendo la URL. */}
      {pets !== null && pets.length === 0 ? (
        <div className="mb-10">
          <Alert
            type="info"
            message="Todavía no tienes mascotas registradas. Acércate o comunícate con GroomingSpa para que registremos a tu mascota; después podrás reportar síntomas."
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

          <InputField
            id="symptom"
            name="symptom"
            label="¿Qué síntomas tiene?"
            type="text"
            required
            value={formData.symptom}
            onChange={handleChange}
            placeholder="Ej: No quiere comer, está decaído"
            error={fieldErrors.symptom}
          />

          <InputField
            id="daysWithSymptom"
            name="daysWithSymptom"
            label="¿Hace cuántos días?"
            type="number"
            min={1}
            required
            value={formData.daysWithSymptom}
            onChange={handleChange}
            placeholder="Ej: 2"
            error={fieldErrors.daysWithSymptom}
          />

          <div className="flex justify-end pt-2">
            <Button type="submit" isLoading={isLoading}>
              Enviar reporte 💊
            </Button>
          </div>
        </form>
      )}

      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">Mis reportes</h2>
      {reports.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Todavía no has enviado reportes.
        </p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => {
            return (
              <li
                key={r.id}
                className="rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900 dark:text-slate-100">
                    {r.pet.name} — {r.symptom}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-gray-500 dark:text-slate-400">Hace {r.daysWithSymptom} día(s)</p>
                {/* ¿Qué? CA-010.4 — la recomendación del staff, o el aviso de que aún no la hay. */}
                {r.recommendation ? (
                  <p className="mt-2 text-green-700 dark:text-green-400">
                    <strong>Recomendación:</strong> {r.recommendation}
                  </p>
                ) : (
                  <p className="mt-2 text-gray-500 dark:text-slate-400">
                    El staff todavía no ha revisado este reporte.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
