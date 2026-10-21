<!--
  ¿Qué? Historia de usuario que describe el reporte de ventas.
  ¿Para qué? Formalizar cómo el staff conoce cuánto ha vendido en un período.
  ¿Impacto? Sin esto, no habría forma de saber el desempeño de ventas dentro de la misma app.
-->

# HU-022 — Consultar Reporte de Ventas

## Identificación

| Campo            | Valor                  |
| ---------------- | -------------------------- |
| **ID**           | HU-022                        |
| **Título**       | Consultar reporte de ventas      |
| **Módulo**       | Inventario y Proveedores            |
| **Prioridad**    | Baja                                   |
| **Estado**       | Implementada                            |
| **RF asociados** | RF-022, RF-023                              |
| **Responsable**  | Yesid Valencia                              |
| **Rama**         | `feature/HU-022-reporte-ventas`             |

---

## Historia

**Como** miembro del staff,
**quiero** ver cuánto se ha vendido en productos en un rango de fechas,
**para** conocer el desempeño del negocio sin llevar cuentas aparte.

---

## Criterios de Aceptación

### CA-022.1 — Consultar reporte por rango de fechas
- **Dado que** inicié sesión como staff,
- **cuando** elijo un rango de fechas y consulto el reporte,
- **entonces** veo el total vendido, la cantidad de pedidos y el detalle por producto (ordenado del que más vendió al que menos).
- Los días del rango son los de Colombia: lo vendido a las 8:00 p.m. del día 10 cuenta en el día 10.
- Un pedido de la app cuenta el día en que se pagó (cuando el staff lo completa), no el día en que se hizo.
- Al abrir la pantalla se consulta el mes en curso; si la fecha inicial es posterior a la final, la pantalla lo avisa.

### CA-022.2 — Pedidos cancelados no cuentan
- **Dado que** hay pedidos cancelados en el rango consultado,
- **cuando** veo el reporte,
- **entonces** esos pedidos no se incluyen en el total vendido.

### CA-022.3 — Incluye ventas del mostrador
- **Dado que** en el rango consultado hubo tanto pedidos hechos desde la app como ventas registradas directamente en el mostrador,
- **cuando** veo el reporte,
- **entonces** el total vendido incluye ambos tipos de venta sumados, y veo cuántas transacciones fueron de la app y cuántas de mostrador.

---

## Endpoints

| Método | Ruta                              | Descripción                                       |
| ------ | ---------------------------------- | ------------------------------------------------------ |
| GET    | `/api/v1/staff/sales-report`       | Retorna el reporte de ventas por rango de fechas          |
