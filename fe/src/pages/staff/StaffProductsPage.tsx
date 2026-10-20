/**
 * Archivo: pages/staff/StaffProductsPage.tsx
 * Descripción: Catálogo de productos en venta (RF-015, HU-015).
 * ¿Para qué? El staff crea, EDITA (precio y stock incluidos, CA-015.3) y desactiva productos —
 *   sin un producto activo con stock, los clientes no pueden pedirlo (RF-016).
 * ¿Impacto? "Eliminar" desactiva el producto si ya tiene pedidos/ventas asociadas
 *   (RN-153), en vez de borrarlo, para no perder el historial; la pantalla dice cuál pasó.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as productsApi from '@/api/products';
import type { Product } from '@/types/products';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { Alert } from '@/components/ui/Alert';

interface FormData {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
}

const EMPTY_FORM: FormData = { name: '', description: '', price: '', stock: '', category: '' };

function productToForm(product: Product): FormData {
  return {
    name: product.name,
    description: product.description ?? '',
    price: String(product.price),
    stock: String(product.stock),
    category: product.category ?? '',
  };
}

// ¿Qué? Mismas reglas que createProductSchema en el backend.
function validateForm(data: FormData): Partial<FormData> {
  const errors: Partial<FormData> = {};
  if (data.name.trim().length < 2) {
    errors.name = 'El nombre del producto debe tener al menos 2 caracteres.';
  }
  const price = Number(data.price);
  if (!data.price || !(price > 0)) errors.price = 'El precio debe ser mayor a 0.';
  else if (price > 99_999_999) errors.price = 'Revisa el precio: es demasiado alto.';
  if (data.stock !== '') {
    const stock = Number(data.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      errors.stock = 'El stock debe ser un número entero de 0 o más.';
    } else if (stock > 100_000) {
      errors.stock = 'Revisa el stock: no puede superar las 100.000 unidades.';
    }
  }
  return errors;
}

export function StaffProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<FormData>>({});
  // ¿Qué? null = el formulario crea un producto nuevo; un id = está editando ese producto.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadProducts = () =>
    productsApi
      .listProductsForStaff(false)
      .then(setProducts)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los productos.');
      });

  useEffect(() => {
    loadProducts();
  }, []);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setFieldErrors({});
    setEditingId(null);
  };

  const startEdit = (product: Product) => {
    setFormData(productToForm(product));
    setFieldErrors({});
    setEditingId(product.id);
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
      stock: formData.stock !== '' ? Number(formData.stock) : undefined,
      category: formData.category.trim() || undefined,
    };
    try {
      if (editingId) {
        // ¿Qué? CA-015.3 — precio y stock nuevos quedan en el catálogo del cliente.
        await productsApi.updateProduct(editingId, payload);
        setSuccess('Cambios guardados. Los clientes ya ven el producto actualizado.');
      } else {
        await productsApi.createProduct(payload);
        setSuccess('Producto creado.');
      }
      resetForm();
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el producto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (product: Product) => {
    setBusyId(product.id);
    setError(null);
    setSuccess(null);
    try {
      await productsApi.updateProduct(product.id, { active: !product.active });
      setSuccess(
        product.active
          ? `"${product.name}" quedó inactivo: ya no aparece en la tienda.`
          : `"${product.name}" quedó activo de nuevo.`,
      );
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el producto.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (product: Product) => {
    // ¿Qué? Confirmación: antes un clic en "Eliminar" borraba el producto sin preguntar.
    if (!window.confirm(`¿Eliminar el producto "${product.name}"?`)) return;
    setBusyId(product.id);
    setError(null);
    setSuccess(null);
    try {
      setSuccess(await productsApi.deleteProduct(product.id));
      if (editingId === product.id) resetForm();
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el producto.');
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
        🛒 Catálogo de Productos
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
            Editando un producto existente.{' '}
            <button type="button" onClick={resetForm} className="underline">
              Cancelar y crear uno nuevo
            </button>
          </p>
        )}
        <InputField
          id="name"
          name="name"
          label="Nombre del producto"
          required
          value={formData.name}
          onChange={handleChange}
          placeholder="Ej: Correa para perro"
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
          id="category"
          name="category"
          label="Categoría (opcional)"
          value={formData.category}
          onChange={handleChange}
          placeholder="Ej: Juguetes, Accesorios, Medicamentos"
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
          id="stock"
          name="stock"
          label={editingId ? 'Stock' : 'Stock inicial'}
          type="number"
          min={0}
          value={formData.stock}
          onChange={handleChange}
          placeholder="0"
          error={fieldErrors.stock}
        />

        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSubmitting}>
            {editingId ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </form>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
        Productos existentes
      </h2>
      {products.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Todavía no hay productos registrados.
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Productos existentes">
          {products.map((p) => (
            <li
              key={p.id}
              className={`rounded-lg border px-4 py-3 text-sm ${
                p.active
                  ? 'border-gray-200 dark:border-slate-700'
                  : 'border-gray-200 dark:border-slate-700 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-gray-900 dark:text-slate-100">
                  {p.name} — ${p.price.toLocaleString('es-CO')}
                </span>
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {p.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <p className="text-gray-500 dark:text-slate-400">
                Stock: {p.stock === 0 ? '0 (agotado)' : p.stock}
                {p.category ? ` — ${p.category}` : ''}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  variant="secondary"
                  className="text-xs px-3 py-1.5"
                  disabled={busyId === p.id}
                  onClick={() => startEdit(p)}
                  aria-label={`Editar ${p.name}`}
                >
                  Editar
                </Button>
                <Button
                  variant="secondary"
                  className="text-xs px-3 py-1.5"
                  isLoading={busyId === p.id}
                  onClick={() => toggleActive(p)}
                >
                  {p.active ? 'Desactivar' : 'Activar'}
                </Button>
                <Button
                  variant="danger"
                  className="text-xs px-3 py-1.5"
                  isLoading={busyId === p.id}
                  onClick={() => handleDelete(p)}
                  aria-label={`Eliminar ${p.name}`}
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
