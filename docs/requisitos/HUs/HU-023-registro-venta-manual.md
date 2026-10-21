<!--
  ¿Qué? Historia de usuario que describe el registro de una venta hecha en persona en el mostrador.
  ¿Para qué? Formalizar que no toda venta pasa por el carrito de la app.
  ¿Impacto? Sin esto, las ventas de mostrador quedarían fuera del control de inventario y del reporte de ventas.
-->

# HU-023 — Registrar Venta en el Mostrador

## Identificación

| Campo            | Valor                       |
| ---------------- | ------------------------------ |
| **ID**           | HU-023                           |
| **Título**       | Registrar venta en el mostrador     |
| **Módulo**       | Inventario y Proveedores               |
| **Prioridad**    | Media                                     |
| **Estado**       | Implementada                               |
| **RF asociados** | RF-023                                       |
| **Responsable**  | Juan Rodriguez                               |
| **Rama**         | `feature/HU-023-venta-manual`                |

---

## Historia

**Como** miembro del staff,
**quiero** registrar una venta de productos hecha directamente en el mostrador,
**para** que el inventario y el reporte de ventas queden correctos aunque el cliente no haya usado el carrito de la app.

---

## Criterios de Aceptación

### CA-023.1 — Registrar venta sin cuenta de cliente
- **Dado que** un cliente sin cuenta en la app compra en el mostrador,
- **cuando** registro la venta con los productos y cantidades,
- **entonces** la venta queda registrada y el stock de esos productos se descuenta de inmediato.
- Veo "Venta registrada por $X a nombre de <comprador>. El stock ya se descontó." (el nombre del comprador ocasional es opcional).

### CA-023.2 — Registrar venta a un cliente con cuenta
- **Dado que** el comprador sí tiene cuenta en el sistema,
- **cuando** lo busco y lo asocio a la venta,
- **entonces** la venta queda vinculada a su perfil.
- Si la búsqueda no encuentra a nadie (o escribí menos de 2 caracteres), la pantalla lo dice y puedo registrar la venta sin cuenta.

### CA-023.3 — Stock insuficiente
- **Dado que** intento vender más unidades de las que hay en stock,
- **cuando** registro la venta,
- **entonces** el sistema me lo impide e indica qué producto no tiene suficiente existencia ("Solo quedan 2 unidades de \"Correa\"." / "No hay existencias de \"Correa\".") y no se descuenta nada.
- La venta en curso no se pierde: se recarga el stock y se marca la línea que hay que ajustar.
- Aunque se registren varias ventas (o pedidos de la app) al mismo tiempo, nunca se vende más de lo que hay.

---

## Endpoints

| Método | Ruta                | Descripción                          |
| ------ | ------------------- | ---------------------------------------- |
| POST   | `/api/v1/sales`     | Registra una venta hecha en persona        |

---

## Notas técnicas

- Esta venta queda `completed`/`paid` de inmediato — no pasa por un estado `pending` como los pedidos de la app (RF-016).
