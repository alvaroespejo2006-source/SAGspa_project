<!--
  ¿Qué? Requisito funcional que describe la autenticación de usuarios existentes (cliente o staff).
  ¿Para qué? Definir la lógica exacta del endpoint POST /api/v1/auth/login.
  ¿Impacto? Este RF define cuándo se emiten tokens, qué verificaciones se hacen y qué vista muestra el frontend.
-->

# RF-002 — Login de Usuarios

**Historia de usuario relacionada**: HU-002

## Descripción

El sistema debe autenticar tanto a clientes como a staff mediante un único endpoint
`POST /api/v1/auth/login`, emitiendo un `accessToken` y un `refreshToken`. Antes de emitir los
tokens, verifica que el email esté confirmado. La respuesta incluye el `role` del usuario, que el
frontend usa para decidir si navega al área del cliente (`/app`) o al panel
administrativo (`/staff`).

---

## Flujo del proceso

| Paso | Descripción                                                                               |
| ---- | ------------------------------------------------------------------------------------------ |
| 1    | El usuario envía `POST /api/v1/auth/login` con `{ email, password }`.                      |
| 2    | El middleware `validate` verifica el body con el schema Zod `loginSchema`.                 |
| 3    | Si la validación falla, se retorna HTTP 422.                                               |
| 4    | El servicio consulta la BD por el email. Si no existe, retorna HTTP 401 genérico.          |
| 5    | Se verifica la contraseña con bcrypt. Si no coincide, retorna HTTP 401 genérico.           |
| 6    | Se verifica `isEmailVerified`. Si es `false`, retorna HTTP 403.                            |
| 7    | Se genera un `accessToken` (15 min) y un `refreshToken` (7 días), ambos firmados con HS256, incluyendo `{ userId, role }` en el payload. |
| 8    | Se retorna HTTP 200 con los tokens y el perfil del usuario (incluyendo `role`).             |

---

## Reglas de Negocio

| ID     | Regla                                                                                       |
| ------ | -------------------------------------------------------------------------------------------- |
| RN-020 | El sistema busca al usuario por email; si no existe, retorna HTTP 401 con mensaje genérico.  |
| RN-021 | Se verifica la contraseña con bcrypt; si no coincide, retorna HTTP 401 genérico.             |
| RN-022 | El mensaje de error de login es siempre "Credenciales inválidas." — no revela si el email existe. |
| RN-023 | Si el usuario existe y la contraseña es correcta pero `isEmailVerified = false`, retorna HTTP 403. |
| RN-024 | El `accessToken` expira en 15 minutos.                                                        |
| RN-025 | El `refreshToken` expira en 7 días.                                                            |
| RN-026 | Ambos tokens incluyen `{ userId, role }` en el payload, firmados con secrets distintos (access/refresh). |
| RN-027 | El endpoint tiene rate limiting: máximo 10 requests por IP en una ventana de 15 minutos.      |

---

## Inputs / Outputs

**Input** (body JSON):
```json
{ "email": "string", "password": "string" }
```

**Output éxito** (HTTP 200):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "tokenType": "bearer",
    "user": {
      "id": "uuid",
      "firstName": "string",
      "role": "client",
      "isEmailVerified": true
    }
  }
}
```

**Output error 401**:
```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Credenciales inválidas." } }
```

**Output error 403** (email no verificado):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada."
  }
}
```

**Output error 429** (rate limit):
```json
{
  "success": false,
  "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "Demasiados intentos. Intenta de nuevo en 15 minutos." }
}
```

---

## Endpoint

| Método | Ruta                  | Auth requerida | Descripción                              |
| ------ | --------------------- | -------------- | ------------------------------------------ |
| POST   | `/api/v1/auth/login`  | No             | Autentica y retorna accessToken + refreshToken |
