/**
 * Archivo: pages/client/ShopPage.tsx
 * Descripción: Tienda de productos — catálogo (RF-015, HU-015), carrito y pedido (RF-016, HU-016).
 * ¿Para qué? No hay pago en línea — el cliente arma el carrito, confirma el pedido y
 *   paga presencialmente en el local al recogerlo (auto-servicio de apartado).
 * ¿Impacto? El precio y el stock disponible se validan siempre en el servidor al
 *   confirmar — el total que se muestra aquí es solo referencial.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as productsApi from '@/api/products';
import * as ordersApi from '@/api/orders';
import { ApiError } from '@/api/axios';
import type { Product } from '@/types/products';
import type { Order } from '@/types/orders';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { StatusBadge } from '@/components/ui/StatusBadge';

// ¿Qué? Máximo por producto — el mismo tope del backend (createOrderSchema).
const MAX_PER_PRODUCT = 99;

// ¿Qué? Estados del pedido como los nombra CA-016.5 (un pedido es masculino).
const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const formatCOP = (value: number) => `$${value.toLocaleString('es-CO')}`;

export function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProducts = () => productsApi.listProducts().then(setProducts);
  const loadOrders = () => ordersApi.listMyOrders().then(setOrders);

  // ¿Qué? Si el catálogo no carga, se avisa en vez de decir "no hay productos" (HU-015).
  useEffect(() => {
    productsApi
      .listProducts()
      .then(setProducts)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo.');
      });
    ordersApi
      .listMyOrders()
      .then(setOrders)
      .catch(() => undefined);
  }, []);

  const setQuantity = (productId: string, quantity: number) => {
    setSuccess(false);
    setCart((prev) => {
      const next = { ...prev };
      if (quantity <= 0) delete next[productId];
      else next[productId] = Math.min(quantity, MAX_PER_PRODUCT);
      return next;
    });
  };

  // ¿Qué? CA-016.1 — agrega con cantidad 1 o suma 1 si ya estaba.
  const addToCart = (product: Product) => setQuantity(product.id, (cart[product.id] ?? 0) + 1);

  const cartItems = Object.entries(cart)
    .map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId);
      return product ? { product, quantity } : null;
    })
    .filter((item): item is { product: Product; quantity: number } => item !== null);

  const total = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  // ¿Qué? Líneas que piden más de lo que queda (p. ej. después de recargar el stock).
  const hasShortage = cartItems.some((item) => item.quantity > item.product.stock);

  const handleCheckout = async () => {
    if (cartItems.length === 0 || hasShortage) return;
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await ordersApi.createOrder({
        items: cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      });
      setSuccess(true);
      setCart({});
      await Promise.all([loadProducts(), loadOrders()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar el pedido.');
      // ¿Qué? CA-016.4 — si alguien más se llevó el producto, se recarga el stock para que el
      //   carrito marque qué línea hay que ajustar. El carrito NO se vacía.
      if (
        err instanceof ApiError &&
        (err.code === 'OUT_OF_STOCK' || err.code === 'PRODUCT_UNAVAILABLE')
      ) {
        await loadProducts().catch(() => undefined);
      }
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

      {/* ¿Qué? CA-016.3 — el pedido quedó registrado y se paga en el local al recogerlo. */}
      {success && (
        <div className="mb-4">
          <Alert
            type="success"
            message="¡Pedido registrado! Págalo en el local cuando lo recojas en GroomingSpa."
          />
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Alert type="error" message={error} />
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
        Productos disponibles
      </h2>
      {products.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-10">
          Todavía no hay productos disponibles.
        </p>
      ) : (
        <ul className="space-y-2 mb-8" aria-label="Productos disponibles">
          {products.map((p) => {
            const inCart = cart[p.id] ?? 0;
            const canAdd = p.stock > 0 && inCart < Math.min(p.stock, MAX_PER_PRODUCT);
            return (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm"
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
                    {formatCOP(p.price)}
                    {p.stock > 0 ? ` — ${p.stock} disponibles` : ''}
                    {inCart > 0 ? ` · En tu carrito: ${inCart}` : ''}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="shrink-0 text-xs px-3 py-1.5"
                  disabled={!canAdd}
                  onClick={() => addToCart(p)}
                  aria-label={`Agregar ${p.name} al carrito`}
                >
                  Agregar al carrito
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {/* ¿Qué? CA-016.2 — cada línea con cantidad, precio unitario y subtotal, y el total. */}
      {cartItems.length > 0 && (
        <section
          className="mb-10 rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3"
          aria-labelledby="cart-title"
        >
          <h2 id="cart-title" className="font-semibold text-gray-900 dark:text-slate-100 mb-3">
            🛒 Tu carrito
          </h2>
          <ul className="space-y-3 mb-3" aria-label="Productos en el carrito">
            {cartItems.map(({ product, quantity }) => (
              <li key={product.id} className="text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-900 dark:text-slate-100">
                    {product.name}{' '}
                    <span className="text-gray-500 dark:text-slate-400">
                      ({formatCOP(product.price)} c/u)
                    </span>
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatCOP(product.price * quantity)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Button
                    variant="secondary"
                    className="text-xs px-2 py-1"
                    onClick={() => setQuantity(product.id, quantity - 1)}
                    aria-label={`Quitar una unidad de ${product.name}`}
                  >
                    −
                  </Button>
                  <span className="w-6 text-center" aria-label={`Cantidad de ${product.name}`}>
                    {quantity}
                  </span>
                  <Button
                    variant="secondary"
                    className="text-xs px-2 py-1"
                    disabled={quantity >= Math.min(product.stock, MAX_PER_PRODUCT)}
                    onClick={() => setQuantity(product.id, quantity + 1)}
                    aria-label={`Agregar una unidad de ${product.name}`}
                  >
                    +
                  </Button>
                  <button
                    type="button"
                    onClick={() => setQuantity(product.id, 0)}
                    className="ml-2 text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
                {quantity > product.stock && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {product.stock === 0
                      ? 'Este producto se agotó: quítalo para continuar.'
                      : `Solo quedan ${product.stock}: baja la cantidad para continuar.`}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-slate-700 pt-3">
            <p className="font-semibold text-gray-900 dark:text-slate-100">
              Total: {formatCOP(total)}
            </p>
            <Button isLoading={isSubmitting} disabled={hasShortage} onClick={handleCheckout}>
              Confirmar pedido
            </Button>
          </div>
        </section>
      )}

      {/* ¿Qué? CA-016.5 — estado de cada pedido: pendiente, completado o cancelado. */}
      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">Mis pedidos</h2>
      {orders.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Todavía no tienes pedidos.</p>
      ) : (
        <ul className="space-y-3" aria-label="Mis pedidos">
          {orders.map((o) => (
            <li
              key={o.id}
              className="rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-900 dark:text-slate-100">
                  {formatCOP(o.total)}
                </span>
                <StatusBadge status={o.status} label={ORDER_STATUS_LABELS[o.status]} />
              </div>
              <ul className="text-gray-500 dark:text-slate-400 pl-4 list-disc">
                {o.items.map((item) => (
                  <li key={item.productId}>
                    {item.quantity}x {item.name}
                  </li>
                ))}
              </ul>
              {o.status === 'pending' && (
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Págalo en el local cuando lo recojas.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
