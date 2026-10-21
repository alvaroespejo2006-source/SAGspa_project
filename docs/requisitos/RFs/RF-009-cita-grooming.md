<!--
  ¿Qué? Requisito funcional que describe el agendamiento de una cita de grooming (opción verde del semáforo).
  ¿Para qué? Definir la lógica del endpoint POST /api/v1/appointments para citas normales.
  ¿Impacto? Es el flujo principal de negocio: sin esto, un cliente no puede reservar un turno.
-->

# RF-009 — Agendamiento de Cita de Grooming (🟢)

**Historia de usuario relacionada**: HU-009

## Descripción

El sistema debe permitir a un cliente autenticado agendar una cita de grooming para una de sus
mascotas ya registradas, mediante el endpoint `POST /api/v1/appointments` con `type = 'grooming'`.
La cita queda con estado inicial `pending` hasta que el staff la confirme desde la agenda (ver RF-017).

> **Requisito previo**: la mascota debe existir en el sistema antes de poder agendar. El registro
> formal de mascotas lo hace el staff (ver RF-012) — un cliente sin mascotas registradas a su nombre
> no puede agendar una cita ni reportar un síntoma (ver RF-010) hasta que el staff registre al menos una.

---

## Flujo del proceso

| Paso | Descripción                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | El cliente autenticado envía `POST /api/v1/appointments` con `{ petId, serviceId, date, time, notes }`. |
| 2    | El middleware `authenticate` verifica el JWT y extrae `clientId` del token.                      |
| 3    | El middleware `validate` verifica el body con el schema Zod `createAppointmentSchema`.           |
| 4    | Se verifica que `petId` exista y pertenezca al `clientId` autenticado (ver RF-012).               |
| 5    | Si `petId` no existe o pertenece a otro cliente, retorna HTTP 404/403.                            |
| 6    | Si `date` es hoy o una fecha pasada **en la zona horaria del negocio**, retorna HTTP 400 `DATE_TOO_SOON` ("La cita debe ser a partir de mañana."). |
| 7    | Si `time` está fuera del horario de atención (9:00–18:00), retorna HTTP 400 `OUTSIDE_BUSINESS_HOURS`. |
| 8    | Se verifica que `serviceId` exista y esté activo en el catálogo de servicios (RF-014).            |
| 9    | Si no existe o está inactivo, retorna HTTP 404.                                                   |
| 10   | Se inserta la cita en la tabla `appointments` con `type = 'grooming'`, `status = 'pending'` y `clientId` del token. |
| 11   | Se retorna HTTP 201 con los datos de la cita creada.                                              |

---

## Reglas de Negocio

| ID     | Regla                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------ |
| RN-090 | Solo un cliente autenticado (`role = 'client'`) puede crear una cita de grooming.                |
| RN-091 | El `petId` debe existir y pertenecer al `clientId` autenticado — un cliente no puede agendar citas para mascotas de otro cliente. |
| RN-092 | La fecha de la cita debe ser, como mínimo, el día siguiente a la fecha actual **en Colombia** (`BUSINESS_TIMEZONE`, por defecto `America/Bogota`). Antes se calculaba en UTC y, desde las 7:00 p.m., se rechazaban las citas para mañana. |
| RN-093 | La hora debe estar entre las 9:00 a.m. y las 6:00 p.m. (horario de atención del local).           |
| RN-094 | El `serviceId` debe referenciar un servicio existente y activo del catálogo (RF-014).             |
| RN-095 | Toda cita nueva se crea con `status = 'pending'`.                                                 |
| RN-096 | Los estados posibles de una cita son: `pending`, `confirmed`, `completed`, `cancelled`.            |
| RN-097 | Solo el staff puede cambiar el `status` de una cita (ver RF-017) — el cliente no puede autoconfirmarse. |
| RN-098 | Al agendar, el precio se calcula según la mascota (precio base del servicio + recargo por tamaño + recargo por tipo de pelo + recargos por condición de piel, ver RF-014) y se **congela** en la cita (`totalPrice`, `priceBreakdown`). Editar el tarifario después no altera citas ya creadas. |
| RN-099 | Si la mascota tiene un factor marcado como `blocksBooking` — una condición de piel (hongos, sarna, heridas, infección) **o** el comportamiento `agresivo` — la cita **no se crea**: se responde HTTP 409 `PET_CONDITION_BLOCKS_BOOKING` y el frontend deriva al reporte de síntoma (RF-010). Super Amigos no tiene veterinario en planta y no puede manejar un animal agresivo sin evaluación previa. |
| RN-100 | `POST /api/v1/appointments/quote` devuelve el mismo desglose sin crear la cita — alimenta el estimador que ve el cliente. Con una condición que bloquea, `blocked = true` **no** es un error: se devuelve el desglose con la bandera. |

---

## Inputs / Outputs

**Input** (body JSON):
```json
{
  "petId": "uuid",
  "serviceId": "uuid",
  "date": "2026-08-26",
  "time": "10:30",
  "notes": "string (opcional)"
}
```

**Output éxito** (HTTP 201):
```json
{
  "id": "uuid",
  "type": "grooming",
  "petId": "uuid",
  "serviceId": "uuid",
  "date": "2026-08-26",
  "time": "10:30",
  "status": "pending",
  "clientId": "uuid",
  "createdAt": "timestamp"
}
```

**Output error 400** (fecha u hora fuera de las reglas de negocio):
```json
{ "success": false, "error": { "code": "DATE_TOO_SOON", "message": "La cita debe ser a partir de mañana." } }
```

| `error.code` | Mensaje |
| ------------ | ------- |
| `DATE_TOO_SOON` | La cita debe ser a partir de mañana. |
| `OUTSIDE_BUSINESS_HOURS` | La hora debe estar entre las 9:00am y las 6:00pm. |

> **Decisión del equipo:** el RF decía 422, pero estas reglas dependen de la fecha actual y del
> horario del negocio (no del formato del dato), así que responden **400**, igual que las demás
> reglas de negocio. El 422 queda para errores de formato del schema Zod.

**Output error 404 / 403** (mascota inexistente / de otro cliente):
```json
{ "success": false, "error": { "code": "FORBIDDEN", "message": "Esta mascota no pertenece a tu cuenta." } }
```

**`GET /api/v1/appointments/me`** — cada cita incluye además `pet: { id, name }` y `service: { id, name }` (HU-009, CA-009.6).

---

## Endpoint

| Método | Ruta                     | Auth requerida    | Descripción                          |
| ------ | ------------------------ | ------------------ | --------------------------------------- |
| POST   | `/api/v1/appointments`   | Sí (role: client)  | Agenda una cita de grooming             |
