<!--
  ¿Qué? Historia de usuario que describe la gestión de pedidos de productos por el staff.
  ¿Para qué? Formalizar cómo el staff cierra el ciclo de venta iniciado en HU-016.
  ¿Impacto? Sin esto, un pedido confirmado por el cliente nunca se marcaría como entregado.
-->

# HU-019 — Gestionar Pedidos de Productos

## Identificación

| Campo            | Valor                  |
| ---------------- | -------------------------- |
| **ID**           | HU-019                        |
| **Título**       | Gestionar pedidos de productos   |
| **Módulo**       | Agenda del staff                    |
| **Prioridad**    | Media                                  |
| **Estado**       | Implementada                            |
| **Responsable**  | Juan Rodriguez                          |
| **Rama**         | `feature/HU-019-gestion-pedidos`        |
| **RF asociados** | RF-019                                    |

---

## Historia

**Como** miembro del staff,
**quiero** ver los pedidos de productos pendientes de recoger y marcarlos como pagados/entregados,
**para** llevar el control de qué se apartó y qué ya se cobró.

---

## Criterios de Aceptación

### CA-019.1 — Lista de pedidos pendientes
- **Dado que** inicié sesión como staff,
- **cuando** abro "Pedidos pendientes",
- **entonces** veo los pedidos sin completar, con cliente, productos, cantidades y total, la fecha del pedido y si está pagado.
- Con las pestañas "Completados" y "Cancelados" también puedo consultar los pedidos ya cerrados (sin botones).

### CA-019.2 — Marcar como pagado y entregado
- **Dado que** el cliente llega, paga y se lleva su pedido,
- **cuando** lo marco como completado,
- **entonces** el pedido pasa a estado "completado" con el pago registrado y veo "Pedido de <cliente> marcado como pagado y entregado."

### CA-019.3 — Cancelar pedido no recogido
- **Dado que** un cliente no recogió su pedido,
- **cuando** lo cancelo,
- **entonces** el pedido pasa a "cancelado" y el stock reservado de esos productos vuelve a estar disponible.
- Antes de cancelar, la pantalla pide confirmación.
- Aunque dos personas lo cancelen al mismo tiempo, el stock se devuelve una sola vez; la segunda ve "Este pedido ya está cancelado y no se puede modificar."

---

## Endpoints

| Método | Ruta                        | Descripción                              |
| ------ | --------------------------- | ---------------------------------------------- |
| GET    | `/api/v1/staff/orders?status=` | Lista los pedidos por estado (`pending` por defecto, `completed`, `cancelled`) |
| PUT    | `/api/v1/staff/orders/:id`  | Marca un pedido como completado o cancelado       |
