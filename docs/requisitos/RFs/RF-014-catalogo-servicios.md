<!--
  ¿Qué? Requisito funcional que describe la gestión del catálogo de servicios de grooming.
  ¿Para qué? Definir los endpoints CRUD de /api/v1/services, usados tanto por el admin como por el cliente al agendar.
  ¿Impacto? Sin esto, no habría forma de ajustar precios (que cambian cada año) sin modificar código.
-->

# RF-014 — Catálogo de Servicios

**Historia de usuario relacionada**: HU-014

## Descripción

El sistema debe permitir al staff administrar el catálogo de servicios de grooming (nombre,
descripción, precio, duración) mediante endpoints CRUD en `/api/v1/services`. El catálogo de
servicios **activos** también debe poder consultarse públicamente, ya que el cliente lo necesita
para elegir un servicio al agendar una cita (RF-009).

---

## Flujo del proceso

| Paso | Descripción                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | El staff autenticado envía `POST /api/v1/services` con `{ name, description, price, durationMinutes }` para crear un servicio. |
| 2    | El middleware `authenticate` verifica que `role === 'staff'`; si no, retorna HTTP 403.           |
| 3    | El middleware `validate` verifica el body con el schema Zod `serviceSchema`.                     |
| 4    | Se inserta el servicio en la tabla `services` con `active = true`.                                |
| 5    | Para editar: `PUT /api/v1/services/:id` con los campos a actualizar (incluye `active` para activar/desactivar). |
| 6    | Para eliminar: `DELETE /api/v1/services/:id` — si el servicio tiene citas asociadas, en vez de borrarlo se marca `active = false` (soft delete). |
| 7    | Cualquier persona (autenticada o no) puede consultar `GET /api/v1/services?active=true` para ver el catálogo vigente. |

---

## Reglas de Negocio

| ID     | Regla                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------ |
| RN-140 | Solo un usuario con `role = 'staff'` puede crear, editar o desactivar servicios.                  |
| RN-141 | El campo `price` debe ser un número mayor a 0 y como máximo 99.999.999 (la columna es `Decimal(10, 2)`; antes un valor mayor respondía 500). |
| RN-142 | El campo `durationMinutes` debe ser un número entero de 1 a 480.                                  |
| RN-143 | Un servicio con citas asociadas no se elimina físicamente — se desactiva (`active = false`).      |
| RN-144 | El endpoint público `GET /api/v1/services` solo retorna servicios con `active = true` por defecto. |
| RN-145 | El staff puede consultar también los servicios inactivos con `GET /api/v1/services/staff?active=false`. |
| RN-146 | El `price` de un servicio es su **precio base**: mascota de tamaño `pequeno`, pelo `corto` y sin condiciones de piel. El precio final = base + recargo por tamaño + recargo por tipo de pelo + recargos por condición de piel. |
| RN-147 | Los recargos por tamaño y pelo se guardan por servicio (`PUT /api/v1/services/:id/modifiers`); las reglas por condición de piel (`amount`, `blocksBooking`) y los tramos de peso son globales (`PUT /api/v1/pricing/skin-rules`, `PUT /api/v1/pricing/size-tiers`). Todo editable solo por staff, sin tocar código. |
| RN-148 | Si no existe un modificador para un par (servicio, tamaño) o (servicio, pelo), el recargo es 0. Un servicio puede así no variar por tamaño ni por pelo. |
| RN-149 | Todos los recargos son ≥ 0; el precio base es > 0. |
| RN-149.1 | *(nueva)* `name` tiene de 2 a 150 caracteres **después de quitar espacios**; crear y editar usan las mismas reglas y mensajes en español. |
| RN-149.2 | *(nueva)* `DELETE /api/v1/services/:id` responde `message` ("Servicio eliminado." o que se desactivó por tener citas) además de `data.softDeleted`. |
| RN-150 | `GET /api/v1/pricing/public` expone el tarifario completo sin autenticación, para la página "Cómo calculamos el precio". |
| RN-151 | La talla de la mascota (`Pet.size`) se sugiere desde `Pet.weight` según la tabla `size_tiers`, pero el staff puede fijarla a mano (RF-012). El tramo mayor (`gigante`) no tiene tope de peso. |
| RN-152 | Los tramos de peso (`size_tiers`) y los recargos por tamaño/pelo de cada servicio son **propios por especie** (`canina` / `felina`): un gato de 6 kg es "grande" pero un perro de 6 kg es "pequeño", y "gato grande" puede recargar distinto que "perro grande". Las reglas de piel y de comportamiento son globales. |
| RN-153 | El comportamiento de la mascota (`Pet.behavior`: `tranquilo` / `nervioso` / `agresivo`) es un factor de precio con regla global editable (`behavior_rules`: `amount`, `blocksBooking`) vía `PUT /api/v1/pricing/behavior-rules`. Por defecto `agresivo` tiene `blocksBooking = true` — impide agendar y deriva a evaluación en persona (RF-009 RN-099). |

---

## Inputs / Outputs

**Input** (`POST` / `PUT`):
```json
{ "name": "Baño y corte", "description": "string (opcional)", "price": 45000, "durationMinutes": 60 }
```

**Output éxito** (HTTP 201/200):
```json
{
  "id": "uuid",
  "name": "Baño y corte",
  "description": "string",
  "price": 45000,
  "durationMinutes": 60,
  "active": true,
  "createdAt": "timestamp"
}
```

**Output error 403**:
```json
{ "error": "Forbidden — staff role required" }
```

---

## Endpoints

| Método | Ruta                       | Auth requerida    | Descripción                              |
| ------ | -------------------------- | ------------------ | ------------------------------------------- |
| GET    | `/api/v1/services`         | No                  | Lista los servicios (activos por defecto)   |
| POST   | `/api/v1/services`         | Sí (role: staff)    | Crea un nuevo servicio                       |
| PUT    | `/api/v1/services/:id`     | Sí (role: staff)    | Edita un servicio (incluye precio y activo)  |
| DELETE | `/api/v1/services/:id`     | Sí (role: staff)    | Elimina o desactiva un servicio              |
