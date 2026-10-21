<!--
  ¿Qué? Historia de usuario que describe el carrito de compras y la confirmación de pedido.
  ¿Para qué? Formalizar cómo el cliente aparta productos para pagarlos y recogerlos en el local.
  ¿Impacto? Es el flujo de venta de productos de GroomingSpa.
-->

# HU-016 — Armar Carrito y Confirmar Pedido

## Identificación

| Campo            | Valor                     |
| ---------------- | ----------------------------- |
| **ID**           | HU-016                           |
| **Título**       | Armar carrito y confirmar pedido    |
| **Módulo**       | Productos                              |
| **Prioridad**    | Alta                                       |
| **Estado**       | Implementada                                |
| **RF asociados** | RF-016                                       |
| **Responsable**  | Duvan Doncel                                 |
| **Rama**         | `feature/HU-016-carrito-pedido`              |

---

## Historia

**Como** cliente,
**quiero** agregar productos a un carrito y confirmar el pedido,
**para** apartarlos y pagarlos presencialmente cuando los recoja en GroomingSpa.

---

## Criterios de Aceptación

### CA-016.1 — Agregar al carrito
- **Dado que** estoy viendo el catálogo,
- **cuando** hago clic en "Agregar al carrito" en un producto disponible,
- **entonces** se suma al carrito con cantidad 1 (o aumenta si ya estaba).
- No puedo agregar más unidades de las que hay en stock (máximo 99 por producto).

### CA-016.2 — Ver total del carrito
- **Dado que** tengo productos en el carrito,
- **cuando** lo abro,
- **entonces** veo cada línea con su cantidad, precio unitario y subtotal, y el total general.
- Desde el carrito puedo subir o bajar la cantidad o quitar el producto.

### CA-016.3 — Confirmar pedido
- **Dado que** mi carrito tiene al menos un producto,
- **cuando** confirmo el pedido,
- **entonces** veo el mensaje "¡Pedido registrado! Págalo en el local cuando lo recojas en GroomingSpa." y el carrito se vacía.

### CA-016.4 — Stock insuficiente al confirmar
- **Dado que** entre que agregué un producto y confirmé el pedido alguien más lo agotó,
- **cuando** confirmo,
- **entonces** veo un mensaje indicando qué producto ya no tiene existencias disponibles (por ejemplo "\"Correa\" se agotó…" o "Solo quedan 2 unidades de \"Correa\"…").
- El carrito **no** se vacía: el stock se recarga, la línea afectada se marca y no puedo confirmar hasta ajustarla.
- Aunque varios clientes confirmen al mismo tiempo, nunca se aparta más de lo que hay en stock.

### CA-016.5 — Ver mis pedidos
- **Dado que** ya confirmé uno o más pedidos,
- **cuando** entro a "Mis pedidos",
- **entonces** veo su estado: pendiente, completado (pagado y entregado) o cancelado.
- Los pedidos pendientes recuerdan que se pagan en el local al recogerlos.

---

## Endpoints

| Método | Ruta                     | Descripción                              |
| ------ | ------------------------ | -------------------------------------------- |
| POST   | `/api/v1/orders`         | Confirma un pedido a partir del carrito        |
| GET    | `/api/v1/orders/me`      | Lista los pedidos del cliente autenticado       |

---

## Notas técnicas

- No hay pasarela de pago en línea — el pago se registra manualmente por el staff en la agenda (RF-017) cuando el cliente paga y recoge en el local.
- El carrito en sí puede manejarse solo en el frontend (estado local) hasta el momento de confirmar el pedido.
