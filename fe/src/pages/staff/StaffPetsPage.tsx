/**
 * Archivo: pages/staff/StaffPetsPage.tsx
 * Descripción: Registro y edición de mascotas a nombre de un cliente existente (RF-012, HU-012).
 * ¿Para qué? Requisito previo para que el cliente pueda usar 🟢 y 🟡 del semáforo
 *   (RF-009, RF-010). El staff también fija aquí los factores de precio del grooming:
 *   tamaño, tipo de pelo y condiciones de piel (RF-014).
 * ¿Impacto? El staff ubica al cliente por nombre/email/documento (no memoriza UUIDs)
 *   y luego elige la mascota de una lista ya cargada — nunca texto libre para el clientId.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as staffApi from '@/api/staff';
import * as petsApi from '@/api/pets';
import type { ClientSummary } from '@/types/staff';
import type { CoatType, Pet, PetBehavior, PetSize, PetSpecies, SkinConditionType } from '@/types/pets';
import { SIZE_LABELS, COAT_LABELS, BEHAVIOR_LABELS, SKIN_CONDITION_LABELS } from '@/types/pricing';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { SelectField } from '@/components/ui/SelectField';
import { Alert } from '@/components/ui/Alert';

const SPECIES_OPTIONS: { value: PetSpecies; label: string }[] = [
  { value: 'canina', label: 'Canina' },
  { value: 'felina', label: 'Felina' },
];
// ¿Qué? Sexo como lista cerrada (HU-012) — mismo enum que el backend (PET_GENDERS).
const GENDER_OPTIONS = [
  { value: 'macho', label: 'Macho' },
  { value: 'hembra', label: 'Hembra' },
];
const SIZE_OPTIONS = Object.entries(SIZE_LABELS) as [PetSize, string][];
const COAT_OPTIONS = Object.entries(COAT_LABELS) as [CoatType, string][];
const BEHAVIOR_OPTIONS = Object.entries(BEHAVIOR_LABELS) as [PetBehavior, string][];
// ¿Qué? Las 6 que suman recargo y las 4 que bloquean la cita — mismo orden que el enum del backend.
const SURCHARGE_CONDITIONS: SkinConditionType[] = [
  'pulgas',
  'garrapatas',
  'piel_irritada',
  'alergia',
  'piel_sensible',
  'nudos',
];
const BLOCKING_CONDITIONS: SkinConditionType[] = ['hongos', 'sarna', 'heridas', 'infeccion'];

interface FormData {
  name: string;
  species: PetSpecies | '';
  breed: string;
  gender: string;
  age: string;
  weight: string;
  color: string;
  size: PetSize | '';
  coatType: CoatType | '';
  behavior: PetBehavior | '';
  skinConditions: SkinConditionType[];
  pathology: string;
}

const EMPTY_FORM: FormData = {
  name: '',
  species: '',
  breed: '',
  gender: '',
  age: '',
  weight: '',
  color: '',
  size: '',
  coatType: '',
  behavior: '',
  skinConditions: [],
  pathology: 'No aplica',
};

// ¿Qué? Errores por campo del formulario de mascota.
type FieldErrors = Partial<Record<'name' | 'species' | 'age' | 'weight', string>>;

// ¿Qué? Valida antes de enviar, con las mismas reglas del backend (HU-012, CA-012.1).
// ¿Para qué? Antes solo se revisaba la especie: un nombre vacío o una edad con decimales
//   llegaban al servidor y volvían como un error genérico.
function validateForm(data: FormData): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.name.trim()) errors.name = 'El nombre de la mascota es requerido.';
  if (!data.species) errors.species = 'Selecciona la especie de la mascota.';
  if (data.age !== '') {
    const age = Number(data.age);
    if (!Number.isInteger(age) || age < 0) errors.age = 'La edad debe ser un número entero de años.';
    else if (age > 40) errors.age = 'Revisa la edad: no puede superar los 40 años.';
  }
  if (data.weight !== '' && !(Number(data.weight) > 0)) {
    errors.weight = 'El peso debe ser mayor a 0.';
  }
  return errors;
}

function petToForm(pet: Pet): FormData {
  // ¿Qué? Mascotas registradas antes con sexo en texto libre: solo se conserva si es válido.
  const gender = pet.gender?.trim().toLowerCase() ?? '';
  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed ?? '',
    gender: GENDER_OPTIONS.some((g) => g.value === gender) ? gender : '',
    age: pet.age != null ? String(pet.age) : '',
    weight: pet.weight != null ? String(pet.weight) : '',
    color: pet.color ?? '',
    size: pet.size ?? '',
    coatType: pet.coatType ?? '',
    behavior: pet.behavior ?? '',
    skinConditions: pet.skinConditions.map((c) => c.type),
    pathology: pet.pathology,
  };
}

export function StaffPetsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientSummary[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  // ¿Qué? null = el formulario crea una mascota nueva; un id = está editando esa mascota.
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState<string | null>(null);

  // ¿Qué? Carga las mascotas del cliente; si falla, lo dice en vez de mostrar "no tiene mascotas".
  const loadPets = (clientId: string) =>
    petsApi
      .listPetsByClient(clientId)
      .then(setPets)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las mascotas.');
      });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) {
      setError('Escribe al menos 2 caracteres para buscar.');
      return;
    }
    setIsSearching(true);
    setError(null);
    setSelectedClient(null);
    try {
      const found = await staffApi.searchClients(query.trim());
      setResults(found);
      if (found.length === 0) setError('No se encontró ningún cliente con ese criterio.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo buscar el cliente.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectClient = (client: ClientSummary) => {
    setSelectedClient(client);
    setResults([]);
    setSuccess(null);
    setError(null);
    resetForm();
    setPets([]);
    loadPets(client.id);
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setFieldErrors({});
    setEditingId(null);
  };

  const startEdit = (pet: Pet) => {
    setFormData(petToForm(pet));
    setEditingId(pet.id);
    setSuccess(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const toggleCondition = (type: SkinConditionType) => {
    setFormData((prev) => ({
      ...prev,
      skinConditions: prev.skinConditions.includes(type)
        ? prev.skinConditions.filter((c) => c !== type)
        : [...prev.skinConditions, type],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    setSuccess(null);
    const errors = validateForm(formData);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !formData.species) return;

    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: formData.name.trim(),
      species: formData.species,
      breed: formData.breed || undefined,
      gender: formData.gender || undefined,
      age: formData.age ? Number(formData.age) : undefined,
      weight: formData.weight ? Number(formData.weight) : undefined,
      color: formData.color || undefined,
      size: formData.size || undefined,
      coatType: formData.coatType || undefined,
      behavior: formData.behavior || undefined,
      skinConditions: formData.skinConditions.map((type) => ({ type })),
      pathology: formData.pathology.trim() || 'No aplica',
    };

    try {
      if (editingId) {
        await petsApi.updatePet(editingId, payload);
        setSuccess('Cambios guardados.');
      } else {
        await petsApi.createPet({ clientId: selectedClient.id, ...payload });
        setSuccess('Mascota registrada correctamente.');
      }
      resetForm();
      // ¿Qué? CA-012.3 — la mascota aparece en el listado de este cliente.
      await loadPets(selectedClient.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la mascota.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <Link to="/staff" className="text-sm text-gray-500 dark:text-slate-400 hover:underline">
        ← Volver
      </Link>

      <h1 className="text-2xl font-comic tracking-wide text-gray-900 dark:text-slate-100 mt-4 mb-6">
        🐾 Registrar Mascota
      </h1>

      {!selectedClient ? (
        <>
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="flex-1">
              <InputField
                id="query"
                name="query"
                label="Buscar cliente por nombre, email o documento"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej: Juan Pérez, juan@correo.com"
              />
            </div>
            <div className="pt-7">
              <Button type="submit" isLoading={isSearching}>Buscar</Button>
            </div>
          </form>

          {error && <Alert type="error" message={error} />}

          {results.length > 0 && (
            <ul className="mt-4 space-y-2">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => selectClient(c)}
                    className="w-full text-left rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm hover:border-brand-400 dark:hover:border-brand-500 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-200"
                  >
                    <span className="font-medium text-gray-900 dark:text-slate-100">
                      {c.firstName} {c.lastName}
                    </span>
                    <span className="text-gray-500 dark:text-slate-400"> — {c.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm">
            <span>
              Cliente: <strong className="text-gray-900 dark:text-slate-100">{selectedClient.firstName} {selectedClient.lastName}</strong> — {selectedClient.email}
            </span>
            <button
              onClick={() => setSelectedClient(null)}
              className="text-brand-600 dark:text-brand-400 hover:underline"
            >
              Cambiar
            </button>
          </div>

          {success && (
            <div className="mb-4">
              <Alert type="success" message={success} />
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4 mb-10">
            {error && <Alert type="error" message={error} />}

            {editingId && (
              <p className="text-sm text-brand-700 dark:text-brand-300">
                Editando una mascota existente.{' '}
                <button type="button" onClick={resetForm} className="underline">
                  Cancelar y registrar una nueva
                </button>
              </p>
            )}

            <InputField
              id="name"
              name="name"
              label="Nombre de la mascota"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: Max"
              error={fieldErrors.name}
            />
            <SelectField
              id="species"
              name="species"
              label="Especie"
              required
              value={formData.species}
              onChange={handleChange}
              error={fieldErrors.species}
            >
              <option value="" disabled>Selecciona una especie</option>
              {SPECIES_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </SelectField>
            <InputField
              id="breed"
              name="breed"
              label="Raza (opcional)"
              value={formData.breed}
              onChange={handleChange}
            />
            <SelectField
              id="gender"
              name="gender"
              label="Sexo (opcional)"
              value={formData.gender}
              onChange={handleChange}
            >
              <option value="">Sin especificar</option>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </SelectField>
            <InputField
              id="age"
              name="age"
              label="Edad en años (opcional)"
              type="number"
              min={0}
              value={formData.age}
              onChange={handleChange}
              error={fieldErrors.age}
            />
            <InputField
              id="weight"
              name="weight"
              label="Peso en kg (opcional)"
              type="number"
              min={0}
              step="0.1"
              value={formData.weight}
              onChange={handleChange}
              placeholder="Ej: 8.5"
              error={fieldErrors.weight}
            />
            <InputField
              id="color"
              name="color"
              label="Color (opcional)"
              value={formData.color}
              onChange={handleChange}
              placeholder="Ej: Café con blanco"
            />

            {/* ─── Factores de precio del grooming (RF-014) ─── */}
            <div className="rounded-lg border border-gray-200 dark:border-slate-700 p-4 space-y-4">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Datos para el precio del grooming
              </p>

              <SelectField
                id="size"
                name="size"
                label="Tamaño"
                value={formData.size}
                onChange={handleChange}
              >
                <option value="">Sugerir desde el peso</option>
                {SIZE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectField>
              <p className="-mt-2 text-xs text-gray-500 dark:text-slate-400">
                Si lo dejas en “Sugerir desde el peso”, el sistema clasifica la talla según los
                kilos registrados.
              </p>

              <SelectField
                id="coatType"
                name="coatType"
                label="Tipo de pelo"
                value={formData.coatType}
                onChange={handleChange}
              >
                <option value="">Sin especificar</option>
                {COAT_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectField>

              <SelectField
                id="behavior"
                name="behavior"
                label="Comportamiento"
                value={formData.behavior}
                onChange={handleChange}
              >
                <option value="">Sin especificar</option>
                {BEHAVIOR_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectField>
              <p className="-mt-2 text-xs text-gray-500 dark:text-slate-400">
                “Agresivo” impide que el cliente agende en la app — primero se evalúa a la
                mascota en persona.
              </p>

              <fieldset>
                <legend className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Condiciones de piel
                </legend>
                <div className="space-y-1.5">
                  {SURCHARGE_CONDITIONS.map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.skinConditions.includes(type)}
                        onChange={() => toggleCondition(type)}
                        className="rounded border-gray-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500"
                      />
                      {SKIN_CONDITION_LABELS[type]}
                    </label>
                  ))}
                </div>
                <p className="mt-2 mb-1 text-xs font-medium text-red-700 dark:text-red-400">
                  Requieren revisión antes de un baño (el cliente no podrá agendar):
                </p>
                <div className="space-y-1.5">
                  {BLOCKING_CONDITIONS.map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.skinConditions.includes(type)}
                        onChange={() => toggleCondition(type)}
                        className="rounded border-gray-300 dark:border-slate-600 text-red-600 focus:ring-red-500"
                      />
                      {SKIN_CONDITION_LABELS[type]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pathology" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Notas de patología
              </label>
              <textarea
                id="pathology"
                name="pathology"
                value={formData.pathology}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 border border-gray-300 dark:border-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-0"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Texto libre para el historial. Si no tiene ninguna, deja escrito “No aplica”.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={isSubmitting}>
                {editingId ? 'Guardar cambios' : 'Registrar mascota'}
              </Button>
            </div>
          </form>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
            Mascotas de este cliente
          </h2>
          {pets.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">Todavía no tiene mascotas registradas.</p>
          ) : (
            <ul className="space-y-2">
              {pets.map((p) => (
                <li key={p.id} className="rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p>
                        <span className="font-medium text-gray-900 dark:text-slate-100">{p.name}</span>
                        <span className="text-gray-500 dark:text-slate-400">
                          {' '}— {SPECIES_OPTIONS.find((opt) => opt.value === p.species)?.label ?? p.species}
                          {p.breed ? `, ${p.breed}` : ''}
                          {p.gender ? `, ${p.gender.toLowerCase()}` : ''}
                          {p.age != null ? `, ${p.age} ${p.age === 1 ? 'año' : 'años'}` : ''}
                          {p.weight != null ? `, ${p.weight} kg` : ''}
                          {p.size ? `, ${SIZE_LABELS[p.size].toLowerCase()}` : ''}
                          {p.coatType ? `, pelo ${COAT_LABELS[p.coatType].toLowerCase()}` : ''}
                          {p.behavior ? `, ${BEHAVIOR_LABELS[p.behavior].toLowerCase()}` : ''}
                        </span>
                      </p>
                      {p.skinConditions.length > 0 && (
                        <p className="mt-1 text-gray-500 dark:text-slate-400">
                          Piel: {p.skinConditions.map((c) => SKIN_CONDITION_LABELS[c.type]).join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="shrink-0 text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Editar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
