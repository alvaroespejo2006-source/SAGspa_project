<!--
  ¿Qué? Historia de usuario que describe el reabastecimiento de productos vía pedidos a proveedor.
  ¿Para qué? Formalizar cómo el stock vuelve a subir cuando se agota.
  ¿Impacto? Sin esto, un producto agotado (RF-015) se quedaría agotado para siempre en el sistema.
-->

# HU-021 — Reabastecer Productos con Pedido a Proveedor

## Identificación

| Campo            | Valor                          |
| ---------------- | ---------------------------------- |
| **ID**           | HU-021                                |
| **Título**       | Reabastecer productos con pedido a proveedor |
| **Módulo**       | Inventario y Proveedores                       |
| **Prioridad**    | Media                                             |
| **Estado**       | Implementada                                       |
| **RF asociados** | RF-021                                               |
| **Responsable**  | Alvaro Espejo                                        |
| **Rama**         | `feature/HU-021-pedidos-proveedor`                   |

---

## Historia

**Como** miembro del staff,
**quiero** crear un pedido a un proveedor y marcarlo como recibido cuando llegue la mercancía,
**para** que el stock de esos productos se actualice automáticamente.

---

## Criterios de Aceptación

### CA-021.1 — Crear pedido a proveedor
- **Dado que** un producto está por agotarse,
- **cuando** creo un pedido a un proveedor indicando productos y cantidades,
- **entonces** el pedido queda registrado con estado "pedido" (`ordered`) y el stock todavía no cambia.
- Solo puedo elegir proveedores activos. Si una fila está incompleta, la pantalla dice cuál (antes se descartaba en silencio).

### CA-021.2 — Marcar como recibido
- **Dado que** la mercancía del pedido llegó al local,
- **cuando** marco el pedido como recibido,
- **entonces** el stock de cada producto del pedido aumenta según la cantidad recibida.
- Antes de recibirlo, la pantalla pide confirmación y después dice cuánto se sumó ("Stock actualizado: +10 Pelota").
- La fecha de recepción, si no la indico, es hoy en Colombia.

### CA-021.3 — No se puede recibir dos veces
- **Dado que** un pedido ya fue marcado como recibido,
- **cuando** intento marcarlo como recibido otra vez,
- **entonces** el sistema lo impide (para no duplicar el aumento de stock): "Este pedido ya fue marcado como recibido: el stock ya se sumó."
- Esto se cumple aunque dos personas lo marquen como recibido al mismo tiempo.

---

## Endpoints

| Método | Ruta                              | Descripción                              |
| ------ | ---------------------------------- | -------------------------------------------- |
| GET    | `/api/v1/supplier-orders`          | Lista los pedidos a proveedor                  |
| POST   | `/api/v1/supplier-orders`          | Crea un pedido de reabastecimiento              |
| PUT    | `/api/v1/supplier-orders/:id`      | Marca un pedido como recibido (actualiza stock)  |
