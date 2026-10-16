<!--
  ¿Qué? Historia de usuario que describe el inicio de sesión de clientes y staff.
  ¿Para qué? Formalizar la necesidad de acceder al sistema con una cuenta ya existente.
  ¿Impacto? Sin login no hay forma de volver a entrar ni de diferenciar cliente de staff.
-->

# HU-002 — Inicio de Sesión

## Identificación

| Campo            | Valor           |
| ---------------- | ---------------- |
| **ID**           | HU-002            |
| **Título**       | Inicio de sesión  |
| **Módulo**       | Autenticación      |
| **Prioridad**    | Alta               |
| **Estado**       | Implementada       |
| **RF asociados** | RF-002             |
| **Responsable**  | Yesid Valencia     |
| **Rama**         | `feature/HU-002-inicio-sesion` |

---

## Historia

**Como** usuario registrado (cliente o staff),
**quiero** iniciar sesión con mi correo y contraseña,
**para** acceder a la vista que me corresponde (área de cliente `/app` si soy cliente, panel administrativo `/staff` si soy staff).

---

## Criterios de Aceptación

### CA-002.1 — Formulario de login
- **Dado que** estoy en la página de login,
- **cuando** veo el formulario,
- **entonces** debo encontrar campos para correo y contraseña, y un botón "Iniciar sesión". Si dejo un campo vacío o escribo un correo mal formado, veo el error junto al campo sin que se llame a la API.

### CA-002.2 — Credenciales inválidas
- **Dado que** ingreso un correo o contraseña incorrectos,
- **cuando** envío el formulario,
- **entonces** debo ver el mensaje genérico "Credenciales inválidas." (sin indicar si el correo existe o no).

### CA-002.3 — Login bloqueado por email sin verificar
- **Dado que** mis credenciales son correctas pero no he verificado mi correo,
- **cuando** intento iniciar sesión,
- **entonces** debo ver el mensaje: "Debes verificar tu email antes de iniciar sesión".

### CA-002.4 — Login exitoso como cliente
- **Dado que** mis credenciales son correctas, mi email está verificado y mi rol es `client`,
- **cuando** inicio sesión,
- **entonces** soy redirigido al área de cliente (`/app`).

### CA-002.5 — Login exitoso como staff
- **Dado que** mis credenciales son correctas y mi rol es `staff`,
- **cuando** inicio sesión,
- **entonces** soy redirigido al panel administrativo (`/staff`).

### CA-002.6 — Sesión expirada
- **Dado que** mi `accessToken` tiene más de 15 minutos,
- **cuando** intento realizar una acción que requiere autenticación,
- **entonces** el frontend usa el `refreshToken` automáticamente para obtener un nuevo `accessToken` sin pedirme volver a iniciar sesión.

### CA-002.7 — Estado de carga
- **Dado que** envié el formulario de login,
- **cuando** la solicitud está en proceso,
- **entonces** el botón "Iniciar sesión" debe estar deshabilitado y mostrar un indicador de carga.

---

## Endpoints

| Método | Ruta                  | Descripción                                     |
| ------ | --------------------- | -------------------------------------------------- |
| POST   | `/api/v1/auth/login`  | Autentica y retorna accessToken + refreshToken + rol |

---

## Notas técnicas

- El `accessToken` dura 15 minutos y el `refreshToken` 7 días; ambos incluyen `{ userId, role }`.
- El frontend guarda los tokens (ej: `localStorage`) y envía el `accessToken` en el header `Authorization: Bearer <token>` en cada petición autenticada.
- El `role` recibido determina a qué ruta navega el frontend (`/app` para `client`, `/staff` para `staff`).
- Si se superan 10 intentos en 15 minutos desde la misma IP, se muestra: "Demasiados intentos. Intenta de nuevo en 15 minutos.".
