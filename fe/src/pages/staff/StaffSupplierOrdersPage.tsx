/**
 * Archivo: pages/staff/StaffSupplierOrdersPage.tsx
 * Descripción: Pedidos de reabastecimiento a proveedores (RF-021, HU-021).
 * ¿Para qué? El stock de un producto solo se incrementa cuando el pedido se marca
 *   como recibido (RN-212) — nunca al crearlo, para no sumar mercancía que aún no llegó.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as suppliersApi from '@/api/suppliers';
import * as productsApi from '@/api/products';
import * as supplierOrdersApi from '@/api/supplier-orders';
import type { Supplier } from '@/types/suppliers';
import type { Product } from '@/types/products';
import type { SupplierOrder } from '@/types/supplier-orders';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/SelectField';
import { InputField } from '@/components/ui/InputField';
import { Alert } from '@/components/ui/Alert';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface DraftItem {
  productId: string;
  quantity: string;
  unitCost: string;
}

const EMPTY_ITEM: DraftItem = { productId: '', quantity: '', unitCost: '' };

const formatCOP = (value: number) => `$${value.toLocaleString('es-CO')}`;

// ¿Qué? Valida el pedido y devuelve el primer problema, o null si se puede enviar.
// ¿Para qué? Antes las filas incompletas se DESCARTABAN en silencio: si faltaba el costo de
//   un producto, el pedido se creaba sin ese producto y nadie se enteraba (HU-021).
function validateOrder(supplierId: string, items: DraftItem[]): string | null {
  if (!supplierId) return 'Selecciona el proveedor.';
  for (const [i, item] of items.entries()) {
    const n = i + 1;
    if (!item.productId) return `Elige el producto de la fila ${n}.`;
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return `La cantidad de la fila ${n} debe ser un número entero mayor a 0.`;
    }
    if (!(Number(item.unitCost) > 0))
      return `El costo unitario de la fila ${n} debe ser mayor a 0.`;
  }
  return null;
}

export function StaffSupplierOrdersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);

  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [items, setItems] = useState<DraftItem[]>([{ ...EMPTY_ITEM }]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadOrders = () => supplierOrdersApi.listSupplierOrders().then(setOrders);

  // ¿Qué? Solo los proveedores ACTIVOS se pueden elegir (el backend rechaza los inactivos).
  const activeSuppliers = suppliers.filter((s) => s.active);

  useEffect(() => {
    const onError = (err: unknown) =>
      setError(err instanceof Error ? err.message : 'No se pudo cargar la información.');
    suppliersApi.listSuppliers().then(setSuppliers).catch(onError);
    productsApi.listProductsForStaff(false).then(setProducts).catch(onError);
    supplierOrdersApi.listSupplierOrders().then(setOrders).catch(onError);
  }, []);

  const updateItem = (index: number, field: keyof DraftItem, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItemRow = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItemRow = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    const problem = validateOrder(supplierId, items);
    if (problem) {
      setError(problem);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await supplierOrdersApi.createSupplierOrder({
        supplierId,
        expectedDate: expectedDate || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost),
        })),
      });
      // ¿Qué? CA-021.1 — el pedido queda en estado "Pedido"; el stock se suma al recibirlo.
      setSuccess('Pedido creado. El stock se sumará cuando lo marques como recibido.');
      setSupplierId('');
      setExpectedDate('');
      setItems([{ ...EMPTY_ITEM }]);
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceive = async (order: SupplierOrder) => {
    const units = order.items.reduce((sum, i) => sum + i.quantity, 0);
    // ¿Qué? Recibir suma stock y no se puede deshacer: se pide confirmación.
    if (
      !window.confirm(
        `¿Marcar como recibido el pedido de ${order.supplierName}? Se sumarán ${units} unidades al stock.`,
      )
    ) {
      return;
    }
    setBusyId(order.id);
    setError(null);
    setSuccess(null);
    try {
      await supplierOrdersApi.receiveSupplierOrder(order.id);
      // ¿Qué? CA-021.2 — dice cuánto se sumó a cada producto.
      setSuccess(
        `Pedido recibido. Stock actualizado: ${order.items
          .map((i) => `+${i.quantity} ${i.productName}`)
          .join(', ')}.`,
      );
      await Promise.all([loadOrders(), productsApi.listProductsForStaff(false).then(setProducts)]);
    } catch (err) {
      // ¿Qué? CA-021.3 — si otra persona ya lo recibió, se muestra el motivo y se recarga.
      setError(err instanceof Error ? err.message : 'No se pudo marcar el pedido como recibido.');
      loadOrders();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/staff" className="text-sm text-gray-500 dark:text-slate-400 hover:underline">
        ← Volver
      </Link>

      <h1 className="text-2xl font-comic tracking-wide text-gray-900 dark:text-slate-100 mt-4 mb-6">
        🚚 Pedidos a Proveedor
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
        <SelectField
          id="supplierId"
          name="supplierId"
          label="Proveedor"
          required
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          <option value="" disabled>
            Selecciona un proveedor
          </option>
          {activeSuppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>

        <InputField
          id="expectedDate"
          name="expectedDate"
          label="Fecha esperada de entrega (opcional)"
          type="date"
          value={expectedDate}
          onChange={(e) => setExpectedDate(e.target.value)}
        />

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Productos a pedir</p>
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1">
                <SelectField
                  id={`product-${index}`}
                  name={`product-${index}`}
                  label="Producto"
                  value={item.productId}
                  onChange={(e) => updateItem(index, 'productId', e.target.value)}
                >
                  <option value="" disabled>
                    Selecciona
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="w-24">
                <InputField
                  id={`quantity-${index}`}
                  name={`quantity-${index}`}
                  label="Cantidad"
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                />
              </div>
              <div className="w-32">
                <InputField
                  id={`unitCost-${index}`}
                  name={`unitCost-${index}`}
                  label="Costo unitario"
                  type="number"
                  min={1}
                  value={item.unitCost}
                  onChange={(e) => updateItem(index, 'unitCost', e.target.value)}
                />
              </div>
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="danger"
                  className="text-xs px-2 py-2"
                  onClick={() => removeItemRow(index)}
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="text-xs px-3 py-1.5"
            onClick={addItemRow}
          >
            + Agregar producto
          </Button>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isSubmitting}>
            Crear pedido
          </Button>
        </div>
      </form>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
        Pedidos existentes
      </h2>
      {orders.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Todavía no hay pedidos a proveedor.
        </p>
      ) : (
        <ul className="space-y-3" aria-label="Pedidos a proveedor">
          {orders.map((o) => (
            <li
              key={o.id}
              className="rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900 dark:text-slate-100">
                  {o.supplierName}
                </span>
                <StatusBadge status={o.status} />
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                {o.status === 'received' && o.receivedDate
                  ? `Recibido el ${o.receivedDate}`
                  : o.expectedDate
                    ? `Llega el ${o.expectedDate}`
                    : 'Sin fecha de entrega'}
                {' · '}Costo total:{' '}
                {formatCOP(o.items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0))}
              </p>
              <ul className="text-gray-500 dark:text-slate-400 mb-2 pl-4 list-disc">
                {o.items.map((item) => (
                  <li key={item.productId}>
                    {item.quantity}x {item.productName} — costo {formatCOP(item.unitCost)} c/u
                  </li>
                ))}
              </ul>
              {o.status === 'ordered' && (
                <Button
                  variant="primary"
                  className="text-xs px-3 py-1.5"
                  isLoading={busyId === o.id}
                  onClick={() => handleReceive(o)}
                >
                  Marcar como recibido
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
