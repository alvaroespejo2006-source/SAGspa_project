<!--
  ¿Qué? Requisito funcional que describe el registro de una venta hecha completamente en persona.
  ¿Para qué? Definir el endpoint POST /api/v1/sales para ventas que no pasan por el carrito de la app.
  ¿Impacto? No todas las ventas nacen de un pedido en la app — un cliente puede llegar y comprar directamente en el mostrador.
-->

# RF-023 — Registro de Venta Manual

**Historia de usuario relacionada**: HU-023

## Descripción

El sistema debe permitir al staff registrar una venta realizada completamente en el local (sin
pasar por el carrito de la app), mediante `POST /api/v1/sales`. A diferencia de un pedido (RF-016),
una venta manual se crea directamente como pagada y completada — no tiene estado `pending`.

---

## Flujo del proceso

| Paso | Descripción                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | El staff autenticado envía `POST /api/v1/sales` con `{ items: [{ productId, quantity }], clientId (opcional), clientName (opcional) }`. |
| 2    | El middleware `authenticate` verifica que `role === 'staff'`.                                     |
| 3    | El middleware `validate` verifica el body con el schema Zod `createManualSaleSchema`.             |
| 4    | Por cada `item`, se verifica que el producto exista, esté activo y tenga `stock >= quantity`.    |
| 5    | Si algún producto no tiene stock suficiente, retorna HTTP 409.                                    |
| 6    | El precio de cada línea se toma del catálogo (`products.price`) en el momento del registro.       |
| 7    | Se descuenta el `stock` de cada producto inmediatamente.                                          |
| 8    | Se inserta la venta en la tabla `sales` con `status = 'completed'` y `paymentStatus = 'paid'`.    |
| 9    | Se retorna HTTP 201 con la venta registrada.                                                       |

---

## Reglas de Negocio

| ID     | Regla                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------ |
| RN-230 | Solo un usuario con `role = 'staff'` puede registrar una venta manual.                            |
| RN-231 | Una venta manual no requiere que el comprador tenga cuenta en el sistema — `clientId` es opcional; si no hay cuenta, se guarda `clientName` como texto libre. |
| RN-232 | El precio de cada línea se toma del catálogo — nunca se ingresa manualmente.                       |
| RN-233 | El `stock` se descuenta de inmediato al registrar la venta (no hay estado intermedio "reservado"), con un `UPDATE` **condicional y atómico** (`stock >= cantidad`), igual que los pedidos de la app (RN-163). Antes se leía y luego se descontaba, y con ventas simultáneas el stock quedaba negativo. |
| RN-234 | Toda venta manual se crea ya como `status = 'completed'` y `paymentStatus = 'paid'`.               |
| RN-235 | Las ventas manuales se incluyen en el reporte de ventas junto con los pedidos completados (RF-022). |
| RN-236 | *(nueva)* Las líneas repetidas se suman; máximo 99 unidades por producto y 50 productos distintos. Sin stock suficiente → 409 `OUT_OF_STOCK` con el nombre del producto; producto inactivo → 404 `PRODUCT_UNAVAILABLE`. |
| RN-237 | *(nueva)* Un `clientName` vacío o de espacios se guarda como `null`. |

---

## Inputs / Outputs

**Input** (body JSON):
```json
{
  "items": [ { "productId": "uuid", "quantity": 1 } ],
  "clientId": "uuid (opcional)",
  "clientName": "string (opcional, si no tiene cuenta)"
}
```

**Output éxito** (HTTP 201):
```json
{
  "id": "uuid",
  "status": "completed",
  "paymentStatus": "paid",
  "total": 25000,
  "items": [ { "productId": "uuid", "name": "Correa para perro", "quantity": 1, "unitPrice": 25000 } ],
  "createdAt": "timestamp"
}
```

**Output error 409** (stock insuficiente):
```json
{ "error": "Insufficient stock", "productId": "uuid" }
```

---

## Endpoint

| Método | Ruta                | Auth requerida    | Descripción                          |
| ------ | ------------------- | ------------------ | ---------------------------------------- |
| POST   | `/api/v1/sales`     | Sí (role: staff)    | Registra una venta hecha en persona        |
