<!--
  ¿Qué? Requisito funcional que describe la gestión de proveedores.
  ¿Para qué? Definir los endpoints CRUD de /api/v1/suppliers.
  ¿Impacto? Sin proveedores registrados, no se puede generar un pedido de reabastecimiento (RF-021).
-->

# RF-020 — Gestión de Proveedores

**Historia de usuario relacionada**: HU-020

## Descripción

El sistema debe permitir al staff administrar los proveedores de productos mediante endpoints
CRUD en `/api/v1/suppliers`.

---

## Flujo del proceso

| Paso | Descripción                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | El staff autenticado envía `POST /api/v1/suppliers` con `{ name, contactName, phone, email, address }`. |
| 2    | El middleware `authenticate` verifica que `role === 'staff'`; si no, retorna HTTP 403.           |
| 3    | El middleware `validate` verifica el body con el schema Zod `supplierSchema`.                    |
| 4    | Se inserta el proveedor en la tabla `suppliers`.                                                  |
| 5    | Para editar: `PUT /api/v1/suppliers/:id`. Para eliminar: `DELETE /api/v1/suppliers/:id`.         |
| 6    | Un proveedor con pedidos asociados (RF-021) no se elimina físicamente — se marca `active = false`. |

---

## Reglas de Negocio

| ID     | Regla                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------ |
| RN-200 | Solo un usuario con `role = 'staff'` puede gestionar proveedores.                                 |
| RN-201 | El campo `name` es obligatorio: de 2 a 150 caracteres **después de quitar espacios**.             |
| RN-202 | Un proveedor con pedidos asociados se desactiva (`active = false`) en vez de eliminarse. `DELETE` responde `message` ("Proveedor eliminado." o que se desactivó). |
| RN-203 | *(nueva)* `phone`: números, espacios, `+`, `-` y paréntesis (7 a 20). `email`: se normaliza (`trim` + minúsculas) antes de validarlo. Un campo opcional vacío al crear se guarda como `null`. |
| RN-204 | *(nueva)* Al editar, enviar `""` en `contactName`, `phone`, `email` o `address` borra ese dato (`null`); no enviarlo lo deja igual. Los mensajes de validación están en español. |

---

## Inputs / Outputs

**Input** (`POST` / `PUT`):
```json
{ "name": "Distribuidora Mascotas SAS", "contactName": "string", "phone": "string", "email": "string", "address": "string" }
```

**Output éxito** (HTTP 201/200):
```json
{ "id": "uuid", "name": "string", "contactName": "string", "phone": "string", "email": "string", "address": "string", "active": true }
```

---

## Endpoints

| Método | Ruta                        | Auth requerida    | Descripción                     |
| ------ | --------------------------- | ------------------ | ------------------------------------ |
| GET    | `/api/v1/suppliers`         | Sí (role: staff)    | Lista los proveedores                 |
| POST   | `/api/v1/suppliers`         | Sí (role: staff)    | Crea un proveedor                      |
| PUT    | `/api/v1/suppliers/:id`     | Sí (role: staff)    | Edita un proveedor                      |
| DELETE | `/api/v1/suppliers/:id`     | Sí (role: staff)    | Elimina o desactiva un proveedor         |
