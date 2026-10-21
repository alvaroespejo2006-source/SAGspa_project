<!--
  ¿Qué? Requisito funcional que describe el carrito de compras y la confirmación de un pedido para pago en tienda.
  ¿Para qué? Definir la lógica del endpoint POST /api/v1/orders y su flujo de estados.
  ¿Impacto? Es el flujo de venta de productos — sin esto, el catálogo (RF-015) no serviría de nada.
-->

# RF-016 — Carrito y Confirmación de Pedido

**Historia de usuario relacionada**: HU-016

## Descripción

El sistema debe permitir a un cliente autenticado armar un carrito con productos del catálogo y
confirmarlo como un pedido, mediante `POST /api/v1/orders`. El pedido **no incluye pago en línea**:
al confirmarse, la información llega al staff y el cliente paga presencialmente en el local al
recoger (auto-servicio de apartado).

---

## Flujo del proceso

| Paso | Descripción                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | El cliente autenticado envía `POST /api/v1/orders` con `{ items: [{ productId, quantity }] }`.   |
| 2    | El middleware `authenticate` verifica el JWT y extrae `clientId`.                                |
| 3    | El middleware `validate` verifica el body con el schema Zod `createOrderSchema`.                 |
| 4    | Por cada `item`, el servicio verifica que el producto exista, esté activo y tenga `stock >= quantity`. |
| 5    | Si algún producto no tiene stock suficiente, retorna HTTP 409 indicando cuál.                     |
| 6    | El precio de cada línea se calcula en el servidor a partir del precio actual del producto — nunca se confía en un precio enviado por el cliente. |
| 7    | Se descuenta el `stock` reservado de cada producto (evita sobreventa mientras el pedido está pendiente). |
| 8    | Se inserta el pedido en la tabla `orders` con `status = 'pending'` y `paymentStatus = 'unpaid'`.  |
| 9    | Se retorna HTTP 201 con el pedido creado, su total y sus líneas.                                  |
| 10   | *(Flujo posterior, ver RF-017)* El staff ve el pedido en su panel; cuando el cliente paga y recoge en el local, el staff marca `status = 'completed'` y `paymentStatus = 'paid'`. |
| 11   | Si el cliente no recoge el pedido, el staff puede marcarlo `status = 'cancelled'`, lo que restaura el `stock` reservado. |

---

## Reglas de Negocio

| ID     | Regla                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------ |
| RN-160 | Solo un cliente autenticado puede crear un pedido.                                                |
| RN-161 | El precio de cada línea se toma del catálogo en el servidor — nunca del payload del cliente.      |
| RN-162 | No se puede confirmar un pedido si algún producto no tiene `stock` suficiente.                    |
| RN-163 | El `stock` del producto se reserva (descuenta) al crear el pedido, evitando sobreventa. El descuento es **condicional y atómico** (`UPDATE … WHERE stock >= cantidad`): antes se leía y luego se descontaba, y con pedidos simultáneos el stock quedaba negativo. |
| RN-164 | Todo pedido nuevo se crea con `status = 'pending'` y `paymentStatus = 'unpaid'`.                   |
| RN-165 | El pago se registra manualmente por el staff al momento de la entrega — no existe pasarela de pago en línea en este alcance. |
| RN-166 | Si un pedido se cancela, el `stock` reservado se restaura a los productos correspondientes.        |
| RN-167 | *(nueva)* Las líneas repetidas del mismo producto se suman antes de validar el stock.              |
| RN-168 | *(nueva)* Sin stock suficiente → 409 `OUT_OF_STOCK` con el nombre del producto y las unidades que quedan; producto inactivo → 404 `PRODUCT_UNAVAILABLE` con su nombre. |
| RN-169 | *(nueva)* Máximo 99 unidades por producto y 50 productos distintos por pedido.                     |

---

## Inputs / Outputs

**Input** (body JSON):
```json
{
  "items": [
    { "productId": "uuid", "quantity": 2 },
    { "productId": "uuid", "quantity": 1 }
  ]
}
```

**Output éxito** (HTTP 201):
```json
{
  "id": "uuid",
  "clientId": "uuid",
  "status": "pending",
  "paymentStatus": "unpaid",
  "total": 95000,
  "items": [
    { "productId": "uuid", "name": "Correa para perro", "quantity": 2, "unitPrice": 25000 },
    { "productId": "uuid", "name": "Juguete mordedor", "quantity": 1, "unitPrice": 45000 }
  ],
  "createdAt": "timestamp"
}
```

**Output error 409** (stock insuficiente):
```json
{ "error": "Insufficient stock", "productId": "uuid" }
```

---

## Endpoints

| Método | Ruta                     | Auth requerida    | Descripción                              |
| ------ | ------------------------ | ------------------ | -------------------------------------------- |
| POST   | `/api/v1/orders`         | Sí (role: client)  | Confirma un pedido a partir del carrito        |
| GET    | `/api/v1/orders/me`      | Sí (role: client)  | Lista los pedidos del cliente autenticado       |
