<!--
  ¿Qué? Requisito funcional que describe los pedidos de reabastecimiento a proveedores.
  ¿Para qué? Definir la lógica de /api/v1/supplier-orders y cómo se actualiza el inventario al recibir mercancía.
  ¿Impacto? Es el mecanismo que repone el stock de productos (RF-015) cuando se agota.
-->

# RF-021 — Pedidos a Proveedor

**Historia de usuario relacionada**: HU-021

## Descripción

El sistema debe permitir al staff crear pedidos de reabastecimiento a un proveedor y, al marcarlos
como recibidos, incrementar automáticamente el `stock` de los productos correspondientes,
mediante endpoints en `/api/v1/supplier-orders`.

---

## Flujo del proceso

| Paso | Descripción                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | El staff envía `POST /api/v1/supplier-orders` con `{ supplierId, items: [{ productId, quantity, unitCost }], expectedDate }`. |
| 2    | El middleware `authenticate` verifica que `role === 'staff'`.                                     |
| 3    | Se valida que `supplierId` y cada `productId` existan.                                            |
| 4    | Se inserta el pedido con `status = 'ordered'`.                                                    |
| 5    | Cuando llega la mercancía: el staff envía `PUT /api/v1/supplier-orders/:id` con `{ status: 'received', receivedDate }`. |
| 6    | Al marcarse `received`, el servicio incrementa el `stock` de cada producto según la `quantity` del pedido. |
| 7    | Se retorna HTTP 200 con el pedido actualizado.                                                    |

---

## Reglas de Negocio

| ID     | Regla                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------ |
| RN-210 | Solo un usuario con `role = 'staff'` puede crear o recibir pedidos a proveedor.                   |
| RN-211 | Todo pedido a proveedor se crea con `status = 'ordered'`.                                          |
| RN-212 | El `stock` de los productos solo se incrementa cuando el pedido pasa a `status = 'received'` — nunca al crearse. |
| RN-213 | Un pedido `received` no puede volver a recibirse: 400 `SUPPLIER_ORDER_ALREADY_RECEIVED`. El cambio a `received` es un `UPDATE` condicional (`status = 'ordered'`) hecho **antes** de sumar el stock: con recepciones simultáneas, el stock se suma una sola vez (antes se sumaba varias). |
| RN-214 | El costo unitario (`unitCost`) se guarda por línea, para poder calcular costos de inventario a futuro. |
| RN-215 | *(nueva)* No se puede crear un pedido a un proveedor desactivado (400 `SUPPLIER_INACTIVE`). |
| RN-216 | *(nueva)* Las líneas repetidas del mismo producto se suman. Cantidad: entero de 1 a 10.000; costo: mayor a 0 y hasta 99.999.999; máximo 50 productos distintos. |
| RN-217 | *(nueva)* Sin `receivedDate`, se usa hoy en la zona horaria del negocio (`BUSINESS_TIMEZONE`). |

---

## Inputs / Outputs

**Input** (`POST /api/v1/supplier-orders`):
```json
{
  "supplierId": "uuid",
  "expectedDate": "2026-09-01",
  "items": [ { "productId": "uuid", "quantity": 20, "unitCost": 12000 } ]
}
```

**Output éxito** (HTTP 201):
```json
{ "id": "uuid", "supplierId": "uuid", "supplierName": "string", "status": "ordered", "expectedDate": "2026-09-01", "items": [ { "productId": "uuid", "productName": "string", "quantity": 20, "unitCost": 12000 } ] }
```
`supplierName` y `productName` se incluyen para que el staff no tenga que cruzar IDs manualmente en la UI.

**Input** (`PUT /api/v1/supplier-orders/:id`):
```json
{ "status": "received", "receivedDate": "2026-09-02" }
```

---

## Endpoints

| Método | Ruta                              | Auth requerida    | Descripción                              |
| ------ | ---------------------------------- | ------------------ | -------------------------------------------- |
| GET    | `/api/v1/supplier-orders`          | Sí (role: staff)    | Lista los pedidos a proveedor                  |
| POST   | `/api/v1/supplier-orders`          | Sí (role: staff)    | Crea un pedido de reabastecimiento              |
| PUT    | `/api/v1/supplier-orders/:id`      | Sí (role: staff)    | Marca un pedido como recibido (actualiza stock)  |
