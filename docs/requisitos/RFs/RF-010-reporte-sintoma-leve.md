<!--
  ¿Qué? Requisito funcional que describe el reporte de un síntoma leve (opción amarilla del semáforo).
  ¿Para qué? Definir la lógica del endpoint POST /api/v1/symptom-reports y su revisión por la auxiliar veterinaria.
  ¿Impacto? Sin esto, un cliente no tendría forma de alertar sobre una mascota que no está grave pero necesita atención.
-->

# RF-010 — Reporte de Síntoma Leve (🟡)

**Historia de usuario relacionada**: HU-010

## Descripción

El sistema debe permitir a un cliente autenticado reportar síntomas leves de su mascota mediante
`POST /api/v1/symptom-reports`. El reporte lo revisa después la persona del staff encargada
(auxiliar en veterinaria), quien deja una recomendación.

> **Importante — límite de alcance**: GroomingSpa **no** cuenta con un veterinario profesional en
> planta. Por eso este flujo **no** genera un diagnóstico médico ni una historia clínica formal —
> solo registra el síntoma y permite que el staff deje una recomendación simple (por ejemplo,
> "tráelo para revisión" o "te recomendamos llevarlo a un veterinario externo").

---

## Flujo del proceso

| Paso | Descripción                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | El cliente autenticado envía `POST /api/v1/symptom-reports` con `{ petId, symptom, daysWithSymptom, notes }`. |
| 2    | El middleware `authenticate` verifica el JWT y extrae `clientId` del token.                      |
| 3    | El middleware `validate` verifica el body con el schema Zod `createSymptomReportSchema`.         |
| 4    | Se verifica que `petId` exista y pertenezca al `clientId` autenticado (ver RF-012).               |
| 5    | Si `petId` no existe o pertenece a otro cliente, retorna HTTP 404/403.                            |
| 6    | Se inserta el reporte en la tabla `symptom_reports` con `status = 'pending'` y `clientId` del token. |
| 7    | Se retorna HTTP 201 con los datos del reporte creado.                                            |
| 8    | *(Flujo posterior, ver RF-017)* Un miembro del staff revisa el reporte, escribe una `recommendation` y marca `status = 'reviewed'`. |

---

## Reglas de Negocio

| ID     | Regla                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------ |
| RN-100 | Solo un cliente autenticado puede crear un reporte de síntoma.                                    |
| RN-101 | El `petId` debe existir y pertenecer al `clientId` autenticado.                                    |
| RN-102 | El campo `symptom` es obligatorio, de 3 a 500 caracteres **después de quitar los espacios** (un texto de solo espacios se rechaza). |
| RN-103 | El campo `daysWithSymptom` es un número entero entre 1 y 365.                                      |
| RN-104 | Todo reporte nuevo se crea con `status = 'pending'`.                                               |
| RN-105 | El reporte **no** incluye campos de diagnóstico, tratamiento o medicamento — solo síntoma y recomendación de texto libre. |
| RN-106 | Solo el staff puede cambiar `status` a `'reviewed'` y completar el campo `recommendation`.          |
| RN-107 | *(nueva)* `GET /api/v1/symptom-reports/me` incluye `pet: { id, name }` en cada reporte.          |
| RN-108 | *(nueva)* Los errores 422 de este endpoint están en español (por ejemplo, "Describe el síntoma de tu mascota."). |

---

## Inputs / Outputs

**Input** (body JSON):
```json
{
  "petId": "uuid",
  "symptom": "string",
  "daysWithSymptom": 2,
  "notes": "string (opcional)"
}
```

**Output éxito** (HTTP 201):
```json
{
  "id": "uuid",
  "petId": "uuid",
  "symptom": "string",
  "daysWithSymptom": 2,
  "status": "pending",
  "recommendation": null,
  "clientId": "uuid",
  "createdAt": "timestamp"
}
```

---

## Endpoint

| Método | Ruta                        | Auth requerida    | Descripción                          |
| ------ | --------------------------- | ------------------ | --------------------------------------- |
| POST   | `/api/v1/symptom-reports`   | Sí (role: client)  | Registra un reporte de síntoma leve     |
