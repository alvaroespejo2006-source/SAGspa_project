<!--
  ¿Qué? Requisito funcional que describe la agenda virtual del staff (calendario del día).
  ¿Para qué? Definir el endpoint GET /api/v1/staff/agenda y cómo el staff cambia el estado de una cita.
  ¿Impacto? Es la herramienta principal del staff para organizar su día de trabajo.
-->

# RF-017 — Agenda de Citas del Staff

**Historia de usuario relacionada**: HU-017

## Descripción

El sistema debe mostrarle al staff un calendario con las citas de grooming de un día específico,
mediante `GET /api/v1/staff/agenda?date=YYYY-MM-DD`, y permitirle cambiar el estado de cada cita
mediante `PUT /api/v1/appointments/:id`.

---

## Flujo del proceso

| Paso | Descripción                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | El staff autenticado envía `GET /api/v1/staff/agenda?date=2026-08-26`.                           |
| 2    | El middleware `authenticate` verifica que `role === 'staff'`; si no, retorna HTTP 403.           |
| 3    | El servicio consulta `appointments` filtrando por `date` y ordena por `time` ascendente.         |
| 4    | Se retorna HTTP 200 con la lista de citas del día, incluyendo mascota, cliente, servicio y estado. |
| 5    | Para actualizar una cita: el staff envía `PUT /api/v1/appointments/:id` con `{ status }`.        |
| 6    | Se valida que `status` sea uno de: `confirmed`, `completed`, `cancelled`.                         |
| 7    | Se actualiza la cita y se retorna HTTP 200 con los datos actualizados.                            |

---

## Reglas de Negocio

| ID     | Regla                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------ |
| RN-170 | Solo un usuario con `role = 'staff'` puede consultar la agenda o cambiar el estado de una cita.   |
| RN-171 | La agenda se filtra siempre por una fecha específica — no se listan todas las citas de golpe. Sin `?date=`, se usa **hoy en la zona horaria del negocio** (`BUSINESS_TIMEZONE`). |
| RN-172 | Los únicos estados a los que el staff puede mover una cita son: `confirmed`, `completed`, `cancelled`. |
| RN-173 | Una cita en estado `completed` o `cancelled` no puede moverse a ningún otro estado: 400 `APPOINTMENT_FINAL_STATE` ("Esta cita ya está atendida/cancelada y no se puede modificar."). |
| RN-174 | Cada cita en la respuesta incluye el tipo (`grooming`) para que el frontend la pinte con el color verde del semáforo. |

---

## Inputs / Outputs

**Output** (`GET /api/v1/staff/agenda?date=2026-08-26`, HTTP 200):
```json
[
  {
    "id": "uuid",
    "time": "10:30",
    "status": "pending",
    "pet": { "id": "uuid", "name": "Firulais" },
    "client": { "id": "uuid", "firstName": "Juan", "phone": "3001234567" },
    "service": { "id": "uuid", "name": "Baño y corte", "durationMinutes": 60 }
  }
]
```

**Input** (`PUT /api/v1/appointments/:id`):
```json
{ "status": "confirmed" }
```

---

## Endpoints

| Método | Ruta                          | Auth requerida    | Descripción                                 |
| ------ | ----------------------------- | ------------------ | ----------------------------------------------- |
| GET    | `/api/v1/staff/agenda`        | Sí (role: staff)    | Lista las citas de un día específico             |
| PUT    | `/api/v1/appointments/:id`    | Sí (role: staff)    | Cambia el estado de una cita                      |
