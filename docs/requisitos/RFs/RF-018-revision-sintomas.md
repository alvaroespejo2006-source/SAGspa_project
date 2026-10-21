<!--
  ¿Qué? Requisito funcional que describe cómo el staff revisa los reportes de síntomas leves.
  ¿Para qué? Definir el endpoint PUT /api/v1/staff/symptom-reports/:id, contraparte de RF-010.
  ¿Impacto? Sin esto, los reportes de síntomas enviados por clientes quedarían sin respuesta.
-->

# RF-018 — Revisión de Reportes de Síntomas

**Historia de usuario relacionada**: HU-018

## Descripción

El sistema debe permitir al staff ver los reportes de síntomas pendientes y dejar una
recomendación, mediante `GET /api/v1/staff/symptom-reports` y
`PUT /api/v1/staff/symptom-reports/:id`.

---

## Flujo del proceso

| Paso | Descripción                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | El staff autenticado envía `GET /api/v1/staff/symptom-reports` (siempre retorna solo los pendientes). |
| 2    | El servicio retorna los reportes con `status = 'pending'`, ordenados del más antiguo al más reciente, cada uno con los datos de la mascota y del cliente (nombre, teléfono) para que el staff no tenga que consultarlos aparte. |
| 3    | El staff (la auxiliar en veterinaria) revisa un reporte y envía `PUT /api/v1/staff/symptom-reports/:id` con `{ recommendation }`. |
| 4    | Se valida que `recommendation` no esté vacío.                                                    |
| 5    | Se actualiza el reporte (`status` pasa a `reviewed` automáticamente) y se retorna HTTP 200.       |

---

## Reglas de Negocio

| ID     | Regla                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------ |
| RN-180 | Solo un usuario con `role = 'staff'` puede ver y responder reportes de síntomas.                  |
| RN-181 | El campo `recommendation` es obligatorio para poder marcar un reporte como `reviewed`.            |
| RN-182 | No se permite registrar diagnóstico, medicamento ni dosis — solo texto de recomendación (ver límite de alcance en RF-010). |
| RN-183 | *(nueva)* La recomendación es obligatoria **después de quitar espacios** (1 a 1000 caracteres). |
| RN-184 | *(nueva)* La revisión es un `UPDATE` condicional (`status = 'pending'`): si dos personas responden a la vez, solo se guarda una; la otra recibe 400 `REPORT_ALREADY_REVIEWED`. |

---

## Inputs / Outputs

**Input** (`PUT /api/v1/staff/symptom-reports/:id`):
```json
{ "status": "reviewed", "recommendation": "Tráela mañana para revisarla en persona." }
```

**Output éxito** (HTTP 200):
```json
{ "id": "uuid", "status": "reviewed", "recommendation": "string", "reviewedAt": "timestamp" }
```

---

## Endpoints

| Método | Ruta                                    | Auth requerida    | Descripción                              |
| ------ | ---------------------------------------- | ------------------ | -------------------------------------------- |
| GET    | `/api/v1/staff/symptom-reports`          | Sí (role: staff)    | Lista los reportes de síntomas pendientes, con mascota y cliente |
| PUT    | `/api/v1/staff/symptom-reports/:id`      | Sí (role: staff)    | Marca un reporte como revisado con recomendación |
