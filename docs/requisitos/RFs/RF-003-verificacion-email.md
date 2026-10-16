<!--
  ¿Qué? Requisito funcional que describe la verificación del email tras el registro.
  ¿Para qué? Definir la lógica del endpoint POST /api/v1/auth/verify-email.
  ¿Impacto? Sin este RF, la cuenta nunca puede activarse y el usuario no podría iniciar sesión.
-->

# RF-003 — Verificación de Email

**Historia de usuario relacionada**: HU-003

## Descripción

El sistema debe validar el token de verificación de email y activar la cuenta del usuario
mediante el endpoint `POST /api/v1/auth/verify-email`.

---

## Flujo del proceso

| Paso | Descripción                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------- |
| 1    | El cliente envía `POST /api/v1/auth/verify-email` con `{ token }`.                              |
| 2    | El middleware `validate` verifica el body con el schema Zod `verifyEmailSchema`.                |
| 3    | El servicio busca el token en la tabla `email_verification_tokens`.                              |
| 4    | Si el token no existe, retorna HTTP 400 `TOKEN_INVALID`: "Token de verificación inválido."      |
| 5    | Si `used = true`, retorna HTTP 400 `TOKEN_ALREADY_USED`: "Este enlace ya fue utilizado. Tu cuenta ya está verificada, inicia sesión." (se evalúa antes que la expiración). |
| 6    | Si `expiresAt <= NOW()`, retorna HTTP 400 `TOKEN_EXPIRED`: "El enlace de verificación ha expirado. Solicita uno nuevo." |
| 7    | En una sola transacción: `users.isEmailVerified = true` y el token se marca `used = true`.      |
| 8    | Se registra el evento en el log de auditoría (`logEmailVerified`).                               |
| 9    | Se retorna HTTP 200 con mensaje de confirmación.                                                 |

---

## Reglas de Negocio

| ID     | Regla                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------- |
| RN-040 | El token debe existir en la tabla `email_verification_tokens`.                                 |
| RN-041 | El token no debe estar expirado (`expiresAt >= NOW()`).                                        |
| RN-042 | El token no debe haber sido usado previamente (`used = false`).                                |
| RN-043 | Tras la verificación exitosa, `users.isEmailVerified` se establece en `true`.                  |
| RN-044 | Tras la verificación exitosa, el token se marca como `used = true` — es de un solo uso.        |
| RN-045 | Si el enlace expiró, el usuario puede pedir uno nuevo con `POST /api/v1/auth/resend-verification`; los enlaces pendientes anteriores quedan invalidados. |
| RN-046 | El reenvío responde siempre el mismo mensaje (exista o no la cuenta, esté o no verificada) para no revelar qué correos están registrados. |

---

## Inputs / Outputs

**Input** (body JSON):
```json
{ "token": "string" }
```

**Output éxito** (HTTP 200):
```json
{ "success": true, "message": "Email verificado correctamente. Ya puedes iniciar sesión." }
```

**Output error 400** (un `code` distinto por caso: `TOKEN_INVALID`, `TOKEN_ALREADY_USED`, `TOKEN_EXPIRED`):
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "El enlace de verificación ha expirado. Solicita uno nuevo."
  }
}
```

### Reenvío del enlace

**Input** (body JSON):
```json
{ "email": "string" }
```

**Output** (HTTP 200, siempre igual):
```json
{
  "success": true,
  "message": "Si tu cuenta está pendiente de verificación, te enviamos un nuevo enlace a tu correo."
}
```

---

## Endpoint

| Método | Ruta                           | Auth requerida | Descripción                         |
| ------ | ------------------------------ | -------------- | ------------------------------------ |
| POST   | `/api/v1/auth/verify-email`    | No             | Valida el token y activa la cuenta   |
| POST   | `/api/v1/auth/resend-verification` | No         | Envía un enlace de verificación nuevo |
