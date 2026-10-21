<!--
  ¿Qué? Requisito funcional que describe el registro de nuevos clientes en GroomingSpa.
  ¿Para qué? Definir la lógica exacta que debe implementar el endpoint POST /api/v1/auth/register.
  ¿Impacto? Este RF define qué datos se crean, qué reglas se aplican y qué ocurre con la verificación de email.
-->

# RF-001 — Registro de Clientes

**Historia de usuario relacionada**: HU-001

## Descripción

El sistema debe permitir que cualquier persona se registre como **cliente** de GroomingSpa mediante el
endpoint `POST /api/v1/auth/register`. Tras el registro, el cliente recibe un email de verificación y
no puede iniciar sesión hasta confirmar su dirección de correo (mismo patrón que el resto del sistema
de autenticación).

---

## Flujo del proceso

| Paso | Descripción                                                                                     |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | El cliente envía `POST /api/v1/auth/register` con `{ documentId, firstName, lastName, phone, email, password }`. |
| 2    | El middleware `validate` verifica el body con el schema Zod `registerClientSchema`.              |
| 3    | Si la validación falla, se retorna HTTP 422 con los errores detallados.                          |
| 4    | El servicio `auth.service.ts` consulta la BD para verificar si el `email` o el `documentId` ya existen. |
| 5    | Si alguno ya existe, se retorna HTTP 409 con mensaje genérico.                                    |
| 6    | Se genera el hash bcrypt de la contraseña (salt rounds = 12).                                     |
| 7    | Se inserta el nuevo usuario en la tabla `users` con `role = 'client'` e `isEmailVerified = false`. |
| 8    | Se genera un token de verificación con `crypto.randomBytes(32)`.                                  |
| 9    | Se guarda el token en la tabla `email_verification_tokens` con expiración de 24 horas.            |
| 10   | Se envía el email de verificación con el enlace: `{FRONTEND_URL}/verify-email?token={token}`.     |
| 11   | Se retorna HTTP 201 con los datos del usuario creado (sin `hashedPassword`).                       |

---

## Reglas de Negocio

| ID     | Regla                                                                                       |
| ------ | -------------------------------------------------------------------------------------------- |
| RN-001 | El campo `email` debe tener formato válido y ser único en el sistema.                       |
| RN-002 | El campo `documentId` (cédula) debe ser único en el sistema.                                 |
| RN-003 | El campo `phone` es obligatorio — es el canal principal de contacto para confirmar citas.    |
| RN-004 | Los campos `firstName` y `lastName` deben tener entre 2 y 100 caracteres.                    |
| RN-005 | El campo `password` debe tener mínimo 8 caracteres, con al menos 1 mayúscula, 1 minúscula y 1 número. |
| RN-006 | La contraseña se almacena como hash bcrypt (salt rounds = 12) — nunca en texto plano.        |
| RN-007 | El usuario registrado por este endpoint siempre recibe `role = 'client'` — no puede autoasignarse `role = 'staff'`. |
| RN-008 | El nuevo usuario se crea con `isEmailVerified = false` hasta completar la verificación.       |
| RN-009 | El token de verificación de email expira en 24 horas desde su creación.                      |
| RN-010 | El token de verificación es de un solo uso — se marca `used = true` al activar la cuenta.     |
| RN-011 | La respuesta de éxito (HTTP 201) no debe incluir el campo `hashedPassword`.                   |

---

## Inputs / Outputs

**Input** (body JSON):
```json
{
  "documentId": "string",
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "email": "string",
  "password": "string"
}
```

**Output éxito** (HTTP 201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "documentId": "string",
    "firstName": "string",
    "lastName": "string",
    "phone": "string",
    "email": "string",
    "role": "client",
    "isEmailVerified": false,
    "createdAt": "timestamp"
  }
}
```

**Output error 422** (validación fallida):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "[{\"field\":\"phone\",\"message\":\"El teléfono es obligatorio.\"}]"
  }
}
```

**Output error 409** (email o documento ya registrados):
```json
{
  "success": false,
  "error": { "code": "CONFLICT", "message": "El email o el documento ya están registrados." }
}
```

---

## Endpoint

| Método | Ruta                     | Auth requerida | Descripción                    |
| ------ | ------------------------ | -------------- | ------------------------------- |
| POST   | `/api/v1/auth/register`  | No             | Registra un nuevo cliente       |
| POST   | `/api/v1/auth/verify-email` | No         | Activa la cuenta del cliente    |
