<!--
  ¿Qué? Requisito funcional que describe el cambio de contraseña de un usuario autenticado.
  ¿Para qué? Definir la lógica del endpoint POST /api/v1/auth/change-password.
  ¿Impacto? Sin verificar la contraseña actual, un token comprometido permitiría tomar
    control de la cuenta cambiando la contraseña sin saberla.
-->

# RF-004 — Cambio de Contraseña

**Historia de usuario relacionada**: HU-004

## Descripción

El sistema debe permitir a un usuario autenticado (cliente o staff) cambiar su contraseña,
verificando primero la contraseña actual, mediante el endpoint `POST /api/v1/auth/change-password`.

---

## Flujo del proceso

| Paso | Descripción                                                                              |
| ---- | ------------------------------------------------------------------------------------------ |
| 1    | El cliente envía `POST /api/v1/auth/change-password` con `{ currentPassword, newPassword }` y el header `Authorization: Bearer <accessToken>`. |
| 2    | El middleware `authenticate` verifica y decodifica el JWT.                               |
| 3    | El middleware `validate` verifica el body con `changePasswordSchema` (fortaleza y `newPassword !== currentPassword`). Si falla, retorna HTTP 422. |
| 4    | El servicio busca al usuario por el `id` del JWT en la BD.                               |
| 5    | Se verifica `currentPassword` con bcrypt contra `hashedPassword`. Si no coincide, retorna HTTP 400 `INVALID_CURRENT_PASSWORD`. |
| 6    | Se genera el hash bcrypt de `newPassword` (salt rounds = 12).                             |
| 7    | Se actualizan `hashedPassword` y `passwordChangedAt` en la tabla `users`.                 |
| 8    | Se generan un `accessToken` y un `refreshToken` nuevos para la sesión actual.             |
| 9    | Se retorna HTTP 200 con mensaje de confirmación y los tokens nuevos.                       |

---

## Reglas de Negocio

| ID     | Regla                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------ |
| RN-030 | Requiere access token válido — el `userId` lo provee el middleware JWT exclusivamente.          |
| RN-031 | La contraseña actual (`currentPassword`) debe coincidir con el hash almacenado en la BD.         |
| RN-032 | La nueva contraseña debe cumplir los mismos requisitos de fortaleza que en el registro.           |
| RN-033 | La nueva contraseña no puede ser igual a la contraseña actual.                                    |
| RN-034 | La nueva contraseña se guarda como hash bcrypt (salt rounds = 12).                                |
| RN-035 | Al cambiar (o restablecer) la contraseña, los refresh tokens emitidos antes dejan de servir: `/auth/refresh` responde 401 "Tu contraseña cambió. Inicia sesión de nuevo.". Los access tokens ya emitidos siguen valiendo hasta que expiran (máx. 15 min). |
| RN-036 | Una contraseña actual incorrecta responde **400**, no 401: el 401 hace que el frontend intente renovar la sesión, y aquí la sesión es válida. |

---

## Inputs / Outputs

**Input** (body JSON):
```json
{ "currentPassword": "string", "newPassword": "string" }
```

**Output éxito** (HTTP 200):
```json
{
  "success": true,
  "message": "Contraseña actualizada correctamente.",
  "data": { "accessToken": "eyJ...", "refreshToken": "eyJ...", "tokenType": "bearer" }
}
```

**Output error 400** (contraseña actual incorrecta):
```json
{
  "success": false,
  "error": { "code": "INVALID_CURRENT_PASSWORD", "message": "La contraseña actual es incorrecta." }
}
```

**Output error 422** (nueva = actual, o nueva débil):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "[{\"field\":\"newPassword\",\"message\":\"La nueva contraseña debe ser diferente a la actual.\"}]"
  }
}
```

**Output error 401**: falta el header `Authorization` o el token es inválido / expiró.

---

## Endpoint

| Método | Ruta                            | Auth requerida | Descripción                       |
| ------ | -------------------------------- | -------------- | ----------------------------------- |
| POST   | `/api/v1/auth/change-password`   | Sí             | Cambia la contraseña del usuario    |
