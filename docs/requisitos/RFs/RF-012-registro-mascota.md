<!--
  ¿Qué? Requisito funcional que describe el registro de una mascota por parte del staff.
  ¿Para qué? Definir la lógica del endpoint POST /api/v1/pets.
  ¿Impacto? Sin esto, un cliente nunca podría agendar citas ni reportar síntomas (ver RF-009, RF-010).
-->

# RF-012 — Registro de Mascota

**Historia de usuario relacionada**: HU-012

## Descripción

El sistema debe permitir que un miembro del staff registre una mascota y la asocie a un cliente
existente, mediante el endpoint `POST /api/v1/pets`. Este registro es requisito previo para que
el cliente pueda usar las opciones 🟢 y 🟡 del semáforo (RF-009, RF-010).

---

## Flujo del proceso

| Paso | Descripción                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | El staff autenticado envía `POST /api/v1/pets` con `{ clientId, name, species, breed, gender, age, weight, color, pathology }`. |
| 2    | El middleware `authenticate` verifica el JWT y que `role === 'staff'`; si no, retorna HTTP 403.  |
| 3    | El middleware `validate` verifica el body con el schema Zod `createPetSchema`.                   |
| 4    | Se verifica que `clientId` exista y tenga `role = 'client'`.                                     |
| 5    | Si no existe, retorna HTTP 404.                                                                  |
| 6    | Se inserta la mascota en la tabla `pets` asociada al `clientId`.                                  |
| 7    | Se retorna HTTP 201 con los datos de la mascota creada.                                          |

---

## Reglas de Negocio

| ID     | Regla                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------ |
| RN-120 | Solo un usuario con `role = 'staff'` puede registrar mascotas.                                    |
| RN-121 | `clientId` debe referenciar un usuario existente con `role = 'client'`.                            |
| RN-122 | El campo `name` de la mascota es obligatorio y se valida **después de quitar los espacios** (un nombre de solo espacios se rechaza). |
| RN-123 | El campo `species` es obligatorio y debe ser uno de un conjunto cerrado de valores — no texto libre. |
| RN-124 | Una mascota siempre pertenece a exactamente un cliente (no se comparte entre varios).              |
| RN-125 | El campo `pathology` (patología o condición médica preexistente) siempre tiene un valor explícito — si la mascota no tiene ninguna, se guarda el texto "No aplica" en vez de dejarlo vacío. |
| RN-126 | `species` solo acepta: `canina`, `felina`. En la interfaz del staff se elige de una lista, nunca se escribe a mano. |
| RN-127 | Solo el staff puede editar una mascota (`PUT /api/v1/pets/:id`) — el cliente nunca modifica los datos de precio de su mascota. |
| RN-128 | `size` acepta: `pequeno`, `mediano`, `grande`, `gigante`. Si no se envía y hay `weight`, se deduce de la tabla `size_tiers` (RF-014). Si se cambia el `weight` y no se envía `size`, la talla se recalcula. |
| RN-129 | `coatType` acepta: `corto`, `largo`. |
| RN-130 | *(nueva)* `gender` es opcional y solo acepta `macho` o `hembra` (sin importar mayúsculas; vacío = sin especificar). |
| RN-131 | *(nueva)* `age` es un entero de 0 a 40 y `weight` un número mayor a 0; los errores de validación están en español. |
| RN-130 | Las condiciones de piel (`skinConditions`) son etiquetas de un conjunto cerrado: `pulgas`, `garrapatas`, `piel_irritada`, `alergia`, `piel_sensible`, `nudos` (suman recargo) y `hongos`, `sarna`, `heridas`, `infeccion` (bloquean el agendamiento, ver RF-009 RN-099). Al editar, la lista enviada reemplaza por completo la anterior. |
| RN-131 | `pathology` (texto libre) se conserva como nota de historial; los recargos de precio se calculan solo desde `skinConditions`, no desde este campo. |
| RN-132 | `behavior` acepta: `tranquilo`, `nervioso`, `agresivo`. Es factor de precio del grooming (RF-014 RN-153) y aplica a perros y gatos. |
| RN-133 | La talla se deduce del peso usando los tramos de **la especie de la mascota** (RF-014 RN-152). |

---

## Inputs / Outputs

**Input** (body JSON):
```json
{
  "clientId": "uuid",
  "name": "string",
  "species": "canina",
  "breed": "string (opcional)",
  "gender": "string (opcional)",
  "age": 3,
  "weight": 8.5,
  "color": "string (opcional)",
  "pathology": "string (opcional, por defecto \"No aplica\")"
}
```

**Output éxito** (HTTP 201):
```json
{
  "id": "uuid",
  "clientId": "uuid",
  "name": "string",
  "species": "canina",
  "breed": "string",
  "gender": "string",
  "age": 3,
  "weight": 8.5,
  "color": "string",
  "pathology": "No aplica",
  "createdAt": "timestamp"
}
```

**Output error 403** (quien llama no es staff):
```json
{ "error": "Forbidden — staff role required" }
```

---

## Endpoint

| Método | Ruta            | Auth requerida    | Descripción                    |
| ------ | --------------- | ------------------ | ---------------------------------- |
| POST   | `/api/v1/pets`  | Sí (role: staff)   | Registra una mascota para un cliente |
| GET    | `/api/v1/staff/clients?q=` | Sí (role: staff) | Soporte técnico: busca clientes por nombre, email o documento, para que el staff ubique el `clientId` antes de registrar la mascota (no se espera que lo conozca de memoria). |
