/**
 * Archivo: pages/client/ShopPage.tsx
 * Descripción: Tienda de productos — carrito y confirmación de pedido (RF-016, HU-016).
 * ¿Para qué? No hay pago en línea — el cliente arma el carrito, confirma el pedido y
 *   paga presencialmente en el local al recogerlo (auto-servicio de apartado).
 * ¿Impacto? El precio y el stock disponible se validan siempre en el servidor al
 *   confirmar — el total que se muestra aquí es solo referencial.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as productsApi from '@/api/products';
import * as ordersApi from '@/api/orders';
import type { Product } from '@/types/products';
import type { Order } from '@/types/orders';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadOrders = () => ordersApi.listMyOrders().then(setOrders);

  // ¿Qué? Si el catálogo no carga, se avisa en vez de decir "no hay productos" (HU-015).
  useEffect(() => {
    productsApi
      .listProducts()
      .then(setProducts)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo.');
      });
    loadOrders().catch(() => undefined);
  }, []);

  const setQuantity = (productId: string, quantity: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (quantity <= 0) delete next[productId];
      else next[productId] = quantity;
      return next;
    });
  };

  const cartItems = Object.entries(cart)
    .map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId);
      return product ? { product, quantity } : null;
    })
    .filter((item): item is { product: Product; quantity: number } => item !== null);

  const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await ordersApi.createOrder({
        items: cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      });
      setSuccess(true);
      setCart({});
      await Promise.all([productsApi.listProducts().then(setProducts), loadOrders()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar el pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/app" className="text-sm text-gray-500 dark:text-slate-400 hover:underline">
        ← Volver
      </Link>

      <h1 className="text-2xl font-comic tracking-wide text-gray-900 dark:text-slate-100 mt-4 mb-1">
        🛍️ Tienda
      </h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        Arma tu pedido y págalo presencialmente al recogerlo en GroomingSpa.
      </p>

      {success && (
        <div className="mb-4">
          <Alert type="success" message="¡Pedido confirmado! Te esperamos para que lo recojas y pagues en el local." />
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">Productos disponibles</h2>
      {products.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-10">Todavía no hay productos disponibles.</p>
      ) : (
        <ul className="space-y-2 mb-6" aria-label="Productos disponibles">
          {products.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm"
            >
              {/* ¿Qué? CA-015.1 — nombre, precio y categoría. CA-015.2 — "Agotado" si no hay stock. */}
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">
                  {p.name}
                  {p.stock === 0 && (
                    <span className="ml-2 inline-block rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                      Agotado
                    </span>
                  )}
                </p>
                {p.category && (
                  <p className="text-xs text-gray-500 dark:text-slate-400">{p.category}</p>
                )}
                <p className="text-gray-500 dark:text-slate-400">
                  ${p.price.toLocaleString('es-CO')}
                  {p.stock > 0 ? ` — ${p.stock} disponibles` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="text-xs px-2 py-1"
                  disabled={!cart[p.id]}
                  onClick={() => setQuantity(p.id, (cart[p.id] ?? 0) - 1)}
                >
                  −
                </Button>
                <span className="w-6 text-center">{cart[p.id] ?? 0}</span>
                <Button
                  variant="secondary"
                  className="text-xs px-2 py-1"
                  disabled={(cart[p.id] ?? 0) >= p.stock}
                  onClick={() => setQuantity(p.id, (cart[p.id] ?? 0) + 1)}
                >
                  +
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {cartItems.length > 0 && (
        <div className="mb-10 rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3">
          <p className="font-medium text-gray-900 dark:text-slate-100 mb-2">Total: ${total.toLocaleString('es-CO')}</p>
          <Button isLoading={isSubmitting} onClick={handleCheckout}>Confirmar pedido</Button>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">Mis pedidos</h2>
      {orders.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Todavía no tienes pedidos.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900 dark:text-slate-100">
                  ${o.total.toLocaleString('es-CO')}
                </span>
                <StatusBadge status={o.status} />
              </div>
              <ul className="text-gray-500 dark:text-slate-400 pl-4 list-disc">
                {o.items.map((item) => (
                  <li key={item.productId}>{item.quantity}x {item.name}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
