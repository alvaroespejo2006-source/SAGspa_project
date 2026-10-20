/**
 * Archivo: pages/staff/StaffOrdersPage.tsx
 * Descripción: Pedidos de la tienda para el staff (RF-019, HU-019).
 * ¿Para qué? Ver los pedidos por estado y, cuando el cliente paga y recoge, marcarlos como
 *   completados; si no los recoge, cancelarlos para devolver el stock (CA-019.3).
 * ¿Impacto? Un pedido cerrado (completado/cancelado) ya no se puede mover, así que esas
 *   pestañas solo muestran la información, sin botones.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as ordersApi from '@/api/orders';
import type { OrderStatus, StaffOrder } from '@/types/orders';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { StatusBadge } from '@/components/ui/StatusBadge';

// ¿Qué? Pestañas por estado (la HU pide listar "por estado"); un pedido es masculino.
const TABS: { status: OrderStatus; label: string; empty: string }[] = [
  { status: 'pending', label: 'Pendientes', empty: 'No hay pedidos pendientes por entregar.' },
  { status: 'completed', label: 'Completados', empty: 'Todavía no hay pedidos completados.' },
  { status: 'cancelled', label: 'Cancelados', empty: 'No hay pedidos cancelados.' },
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const formatCOP = (value: number) => `$${value.toLocaleString('es-CO')}`;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function StaffOrdersPage() {
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadOrders = (s: OrderStatus) => {
    setIsLoading(true);
    ordersApi
      .listOrdersByStatus(s)
      .then(setOrders)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los pedidos.'),
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadOrders('pending');
  }, []);

  const changeTab = (s: OrderStatus) => {
    setStatus(s);
    setError(null);
    setSuccess(null);
    loadOrders(s);
  };

  const handleStatusChange = async (order: StaffOrder, next: 'completed' | 'cancelled') => {
    const who = `${order.client.firstName} ${order.client.lastName}`;
    // ¿Qué? Cancelar devuelve el stock: se pide confirmación (antes era un solo clic).
    if (
      next === 'cancelled' &&
      !window.confirm(`¿Cancelar el pedido de ${who}? El stock volverá a estar disponible.`)
    ) {
      return;
    }
    setBusyId(order.id);
    setError(null);
    setSuccess(null);
    try {
      await ordersApi.updateOrderStatus(order.id, next);
      setSuccess(
        next === 'completed'
          ? `Pedido de ${who} marcado como pagado y entregado.`
          : `Pedido de ${who} cancelado. Los productos volvieron al stock.`,
      );
      loadOrders(status);
    } catch (err) {
      // ¿Qué? Si otra persona ya lo cerró, se muestra el motivo y se recarga la lista.
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el pedido.');
      loadOrders(status);
    } finally {
      setBusyId(null);
    }
  };

  const currentTab = TABS.find((t) => t.status === status)!;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/staff" className="text-sm text-gray-500 dark:text-slate-400 hover:underline">
        ← Volver
      </Link>

      <h1 className="text-2xl font-comic tracking-wide text-gray-900 dark:text-slate-100 mt-4 mb-6">
        📋 Pedidos de la tienda
      </h1>

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Estado de los pedidos">
        {TABS.map((t) => (
          <Button
            key={t.status}
            role="tab"
            aria-selected={status === t.status}
            variant={status === t.status ? 'primary' : 'secondary'}
            className="text-xs px-3 py-1.5"
            onClick={() => changeTab(t.status)}
          >
            {t.label}
          </Button>
        ))}
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
      ) : orders.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">{currentTab.empty}</p>
      ) : (
        <ul className="space-y-4" aria-label={`Pedidos ${currentTab.label.toLowerCase()}`}>
          {orders.map((o) => (
            <li
              key={o.id}
              className="rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900 dark:text-slate-100">
                  {o.client.firstName} {o.client.lastName}
                  {o.client.phone ? ` — ${o.client.phone}` : ''}
                </span>
                <StatusBadge status={o.status} label={STATUS_LABELS[o.status]} />
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">
                Pedido el {formatDate(o.createdAt)}
                {o.paymentStatus === 'paid' ? ' · Pagado' : ' · Sin pagar'}
              </p>

              {/* ¿Qué? CA-019.1 — productos, cantidades y total. */}
              <ul className="text-gray-600 dark:text-slate-400 mb-2 pl-4 list-disc">
                {o.items.map((item) => (
                  <li key={item.productId}>
                    {item.quantity}x {item.name} — {formatCOP(item.unitPrice * item.quantity)}
                  </li>
                ))}
              </ul>

              <p className="font-medium text-gray-900 dark:text-slate-100 mb-2">
                Total: {formatCOP(o.total)}
              </p>

              {o.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    className="text-xs px-3 py-1.5"
                    isLoading={busyId === o.id}
                    onClick={() => handleStatusChange(o, 'completed')}
                  >
                    Marcar pagado y entregado
                  </Button>
                  <Button
                    variant="danger"
                    className="text-xs px-3 py-1.5"
                    isLoading={busyId === o.id}
                    onClick={() => handleStatusChange(o, 'cancelled')}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
