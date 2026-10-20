<!--
  ¿Qué? Requisito funcional que describe cómo se crean nuevas cuentas de staff/admin.
  ¿Para qué? Definir el endpoint POST /api/v1/staff y quién tiene permiso de usarlo.
  ¿Impacto? Sin esto no habría forma de dar de alta a nuevo personal sin acceso directo a la base de datos.
-->

# RF-008 — Creación de Cuenta de Staff

**Historia de usuario relacionada**: HU-008

## Descripción

No existe registro público para cuentas de staff. Solo un usuario que ya tiene `role = 'staff'`
autenticado puede crear otra cuenta de staff, mediante `POST /api/v1/staff`. La primera cuenta de
staff del sistema se crea directamente en la base de datos (seed inicial) al desplegar el proyecto.

---

## Flujo del proceso

| Paso | Descripción                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | Un usuario con `role = 'staff'` autenticado envía `POST /api/v1/staff` con `{ firstName, lastName, email, password }`. |
| 2    | El middleware `authMiddleware` verifica el JWT y que `role === 'staff'`; si no, retorna HTTP 403. |
| 3    | El middleware `validate` verifica el body con el schema Zod `createStaffSchema`.                |
| 4    | El servicio verifica que el email no exista ya en la tabla `users`.                              |
| 5    | Si existe, se retorna HTTP 409.                                                                  |
| 6    | Se hashea la contraseña con bcrypt (salt rounds = 12).                                           |
| 7    | Se inserta el nuevo usuario con `role = 'staff'`.                                                |
| 8    | Se crea el token de verificación de email y se envía el correo de activación.                   |
| 9    | Se retorna HTTP 201 con los datos del nuevo staff creado (sin `hashedPassword`).                  |

---

## Reglas de Negocio

| ID     | Regla                                                                                       |
| ------ | -------------------------------------------------------------------------------------------- |
| RN-001 | Solo un usuario autenticado con `role = 'staff'` puede crear otra cuenta de staff.           |
| RN-002 | Un cliente (`role = 'client'`) que intente llamar este endpoint recibe HTTP 403.             |
| RN-003 | El email debe ser único en el sistema (compartido entre clientes y staff).                   |
| RN-004 | La contraseña sigue las mismas reglas de fortaleza que en RF-001 (RN-004).                   |
| RN-005 | *(nueva)* El correo se normaliza (`trim` + minúsculas) antes de validarlo y de buscar duplicados. |
| RN-006 | *(nueva)* La cuenta nueva debe verificar su correo antes de iniciar sesión (igual que un cliente). |
| RN-007 | *(nueva)* `GET /api/v1/staff` lista solo cuentas con `role = 'staff'`, sin `hashedPassword`, la más reciente primero. |

---

## Inputs / Outputs

**Input** (body JSON):
```json
{ "firstName": "string", "lastName": "string", "email": "string", "password": "string" }
```

**Output éxito** (HTTP 201) — dentro de `{ "success": true, "data": { ... } }`:
```json
{ "id": "uuid", "documentId": null, "firstName": "string", "lastName": "string", "phone": null, "email": "string", "role": "staff", "isEmailVerified": false, "createdAt": "timestamp" }
```

**Output error 403** (quien llama no es staff):
```json
{ "success": false, "error": { "code": "FORBIDDEN", "message": "No tienes permiso para realizar esta acción." } }
```

**Output error 409** (correo ya registrado):
```json
{ "success": false, "error": { "code": "CONFLICT", "message": "El email ya está registrado." } }
```

**Listado — `GET /api/v1/staff`** (HTTP 200):
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "firstName": "Laura", "lastName": "Gómez", "email": "laura@groomingspa.com", "isEmailVerified": false, "createdAt": "timestamp" }
  ]
}
```

---

## Endpoint

| Método | Ruta              | Auth requerida    | Descripción                        |
| ------ | ----------------- | ----------------- | ------------------------------------ |
| POST   | `/api/v1/staff`   | Sí (role: staff)  | Crea una nueva cuenta de staff       |
| GET    | `/api/v1/staff`   | Sí (role: staff)  | Lista las cuentas de staff           |
