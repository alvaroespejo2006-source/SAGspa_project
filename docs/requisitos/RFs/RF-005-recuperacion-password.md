<!--
  ¿Qué? Requisito funcional que describe la recuperación de contraseña por email.
  ¿Para qué? Definir la lógica de los endpoints forgot-password y reset-password.
  ¿Impacto? Sin este flujo, una contraseña olvidada implica pérdida permanente de acceso a la cuenta.
-->

# RF-005 — Recuperación de Contraseña por Email

**Historia de usuario relacionada**: HU-005

## Descripción

El sistema debe permitir recuperar el acceso a la cuenta mediante tres endpoints:
1. `POST /api/v1/auth/forgot-password` — solicita el envío del email de recuperación.
2. `POST /api/v1/auth/reset-password/validate` — indica si el enlace sigue vigente (la página lo consulta al abrirse).
3. `POST /api/v1/auth/reset-password` — valida el token y cambia la contraseña.

---

## Flujo del proceso — Forgot Password

| Paso | Descripción                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------- |
| 1    | El cliente envía `POST /api/v1/auth/forgot-password` con `{ email }`.                           |
| 2    | El servicio busca al usuario por email en la BD.                                                |
| 3    | **Independientemente** de si el email existe o no, retorna HTTP 200 con mensaje genérico.       |
| 4    | Si el email SÍ existe: genera un token con `crypto.randomBytes(32)` (256 bits).                 |
| 5    | Marca como usados los tokens anteriores sin usar y guarda el nuevo en `password_reset_tokens` con expiración de 1 hora (en una transacción). |
| 6    | Envía el email con el enlace: `{FRONTEND_URL}/reset-password?token={token}`.                     |

## Flujo del proceso — Reset Password

| Paso | Descripción                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------- |
| 1    | El cliente envía `POST /api/v1/auth/reset-password` con `{ token, newPassword }`.               |
| 2    | El middleware `validate` verifica el body con `resetPasswordSchema`.                             |
| 3    | El servicio busca el token en `password_reset_tokens`.                                           |
| 4    | Si el token no existe, retorna HTTP 400 con código `TOKEN_INVALID`.                              |
| 5    | Si `used = true`, retorna HTTP 400 con código `TOKEN_ALREADY_USED` (se revisa antes que la expiración). |
| 6    | Si `expiresAt <= NOW()`, retorna HTTP 400 con código `TOKEN_EXPIRED`.                            |
| 7    | Se genera el hash bcrypt de `newPassword` (salt rounds = 12).                                    |
| 8    | Se actualiza `hashedPassword` y `passwordChangedAt` del usuario en `users` (cierra las demás sesiones). |
| 9    | Se marca el token como `used = true` en `password_reset_tokens`.                                 |
| 10   | Se retorna HTTP 200 con mensaje de confirmación.                                                 |

---

## Reglas de Negocio

| ID     | Regla                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------- |
| RN-050 | La respuesta de `forgot-password` es siempre HTTP 200 — no revela si el email existe.          |
| RN-051 | El token de reset expira en 1 hora desde su creación.                                          |
| RN-052 | El token de reset es de un solo uso — se marca `used = true` al cambiar la contraseña.         |
| RN-053 | La nueva contraseña debe cumplir los requisitos de fortaleza del sistema.                       |
| RN-054 | El token se genera con `crypto.randomBytes(32)` — 256 bits de entropía.                        |
| RN-055 | Todos los endpoints tienen rate limiting para prevenir abuso.                                   |
| RN-056 | *(nueva)* Al pedir un enlace nuevo, los anteriores sin usar dejan de servir.                     |
| RN-057 | *(nueva)* Cada fallo del enlace responde un código propio: `TOKEN_INVALID`, `TOKEN_ALREADY_USED`, `TOKEN_EXPIRED`. |

---

## Inputs / Outputs

**forgot-password — Input:**
```json
{ "email": "string" }
```

**forgot-password — Output (siempre HTTP 200):**
```json
{ "success": true, "message": "Si el correo está registrado, recibirás un enlace de recuperación." }
```

**reset-password/validate — Input:**
```json
{ "token": "string" }
```

**reset-password/validate — Output (HTTP 200):**
```json
{ "success": true, "message": "El enlace de recuperación es válido." }
```

**reset-password — Input:**
```json
{ "token": "string", "newPassword": "string" }
```

**reset-password — Output éxito (HTTP 200):**
```json
{ "success": true, "message": "Contraseña restablecida correctamente." }
```

**reset-password y reset-password/validate — Output error 400:**
```json
{ "success": false, "error": { "code": "TOKEN_EXPIRED", "message": "El enlace de recuperación expiró. Solicita uno nuevo." } }
```

| `error.code` | Mensaje |
| ------------ | ------- |
| `TOKEN_INVALID` | El enlace de recuperación no es válido. |
| `TOKEN_ALREADY_USED` | Este enlace ya fue utilizado. Solicita uno nuevo si aún necesitas cambiar tu contraseña. |
| `TOKEN_EXPIRED` | El enlace de recuperación expiró. Solicita uno nuevo. |

---

## Endpoints

| Método | Ruta                            | Auth requerida | Descripción                                  |
| ------ | -------------------------------- | -------------- | --------------------------------------------- |
| POST   | `/api/v1/auth/forgot-password`   | No             | Genera token y envía email de recuperación    |
| POST   | `/api/v1/auth/reset-password/validate` | No       | Indica si el enlace sigue vigente             |
| POST   | `/api/v1/auth/reset-password`    | No             | Valida token y actualiza la contraseña        |
