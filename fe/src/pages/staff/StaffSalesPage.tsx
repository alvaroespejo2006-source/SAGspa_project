/**
 * Archivo: pages/staff/StaffSalesPage.tsx
 * Descripción: Registro de venta de mostrador (RF-023, HU-023).
 * ¿Para qué? No toda venta pasa por el carrito de la app — un cliente puede comprar
 *   directamente en el local. A diferencia de un pedido, nace ya pagada y completada.
 * ¿Impacto? El comprador es opcional: puede ser un cliente con cuenta (buscado por
 *   nombre/email) o un comprador ocasional identificado solo por su nombre.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as productsApi from '@/api/products';
import * as staffApi from '@/api/staff';
import * as salesApi from '@/api/sales';
import { ApiError } from '@/api/axios';
import type { Product } from '@/types/products';
import type { ClientSummary } from '@/types/staff';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { Alert } from '@/components/ui/Alert';

export function StaffSalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientSummary[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);
  const [clientName, setClientName] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // ¿Qué? Aviso de la búsqueda de cliente ("escribe al menos 2…", "no se encontró…").
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProducts = () => productsApi.listProducts().then(setProducts);

  useEffect(() => {
    productsApi
      .listProducts()
      .then(setProducts)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los productos.'),
      );
  }, []);

  const setQuantity = (productId: string, quantity: number) => {
    setSuccess(null);
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchMessage(null);
    // ¿Qué? Antes, con menos de 2 letras, el botón no hacía nada y no decía por qué.
    if (query.trim().length < 2) {
      setSearchMessage('Escribe al menos 2 caracteres para buscar.');
      return;
    }
    setIsSearching(true);
    try {
      const found = await staffApi.searchClients(query.trim());
      setResults(found);
      if (found.length === 0) {
        setSearchMessage('No se encontró ningún cliente. Puedes registrar la venta sin cuenta.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo buscar el cliente.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (cartItems.length === 0) {
      setError('Agrega al menos un producto.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    const buyer = selectedClient
      ? `${selectedClient.firstName} ${selectedClient.lastName}`
      : clientName.trim();
    try {
      const sale = await salesApi.createSale({
        items: cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        clientId: selectedClient?.id,
        clientName: !selectedClient && clientName.trim() ? clientName.trim() : undefined,
      });
      // ¿Qué? CA-023.1 / CA-023.2 — total, a nombre de quién y que el stock ya se descontó.
      setSuccess(
        `Venta registrada por $${sale.total.toLocaleString('es-CO')}${
          buyer ? ` a nombre de ${buyer}` : ''
        }. El stock ya se descontó.`,
      );
      setCart({});
      setSelectedClient(null);
      setClientName('');
      setResults([]);
      setQuery('');
      loadProducts().catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la venta.');
      // ¿Qué? CA-023.3 — si un producto no alcanza, se recarga el stock; la venta NO se pierde.
      if (
        err instanceof ApiError &&
        (err.code === 'OUT_OF_STOCK' || err.code === 'PRODUCT_UNAVAILABLE')
      ) {
        loadProducts().catch(() => undefined);
      }
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
        💰 Registrar Venta de Mostrador
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

      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">
        Comprador (opcional)
      </h2>
      {selectedClient ? (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm">
          <span>
            <strong className="text-gray-900 dark:text-slate-100">
              {selectedClient.firstName} {selectedClient.lastName}
            </strong>{' '}
            — {selectedClient.email}
          </span>
          <button
            onClick={() => setSelectedClient(null)}
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            Quitar
          </button>
        </div>
      ) : (
        <div className="mb-6 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1">
              <InputField
                id="query"
                name="query"
                label="Buscar cliente con cuenta (opcional)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre, email o documento"
              />
            </div>
            <div className="pt-7">
              <Button type="submit" isLoading={isSearching}>
                Buscar
              </Button>
            </div>
          </form>
          {searchMessage && (
            <p className="text-sm text-gray-500 dark:text-slate-400">{searchMessage}</p>
          )}
          {results.length > 0 && (
            <ul className="space-y-2" aria-label="Clientes encontrados">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      setSelectedClient(c);
                      setResults([]);
                    }}
                    className="w-full text-left rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm hover:border-brand-400 dark:hover:border-brand-500"
                  >
                    {c.firstName} {c.lastName} — {c.email}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <InputField
            id="clientName"
            name="clientName"
            label="O nombre del comprador ocasional (sin cuenta)"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ej: Cliente de mostrador"
          />
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-3">Productos</h2>
      {products.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
          No hay productos disponibles.
        </p>
      ) : (
        <ul className="space-y-2 mb-6" aria-label="Productos">
          {products.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">{p.name}</p>
                <p className="text-gray-500 dark:text-slate-400">
                  ${p.price.toLocaleString('es-CO')} —{' '}
                  {p.stock > 0 ? `${p.stock} disponibles` : 'Agotado'}
                </p>
                {(cart[p.id] ?? 0) > p.stock && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Solo quedan {p.stock}: baja la cantidad.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="text-xs px-2 py-1"
                  disabled={!cart[p.id]}
                  onClick={() => setQuantity(p.id, (cart[p.id] ?? 0) - 1)}
                  aria-label={`Quitar una unidad de ${p.name}`}
                >
                  −
                </Button>
                <span className="w-6 text-center">{cart[p.id] ?? 0}</span>
                <Button
                  variant="secondary"
                  className="text-xs px-2 py-1"
                  disabled={(cart[p.id] ?? 0) >= Math.min(p.stock, 99)}
                  onClick={() => setQuantity(p.id, (cart[p.id] ?? 0) + 1)}
                  aria-label={`Agregar una unidad de ${p.name}`}
                >
                  +
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {cartItems.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3">
          <p className="font-medium text-gray-900 dark:text-slate-100 mb-2">
            Total: ${total.toLocaleString('es-CO')}
          </p>
          <Button isLoading={isSubmitting} onClick={handleSubmit}>
            Registrar venta
          </Button>
        </div>
      )}
    </div>
  );
}
