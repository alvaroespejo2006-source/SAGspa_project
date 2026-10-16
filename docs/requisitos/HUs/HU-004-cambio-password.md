<!--
  ¿Qué? Historia de usuario que describe el cambio de contraseña de un usuario ya autenticado.
  ¿Para qué? Formalizar la necesidad de actualizar la contraseña sin cerrar sesión.
  ¿Impacto? Sin esto, un usuario que quiera reforzar su seguridad tendría que usar la recuperación por correo.
-->

# HU-004 — Cambio de Contraseña

## Identificación

| Campo            | Valor                    |
| ---------------- | -------------------------- |
| **ID**           | HU-004                      |
| **Título**       | Cambio de contraseña         |
| **Módulo**       | Autenticación                 |
| **Prioridad**    | Media                          |
| **Estado**       | Implementada                |
| **RF asociados** | RF-004                          |
| **Responsable**  | Duvan Doncel                |
| **Rama**         | `feature/HU-004-cambio-password` |

---

## Historia

**Como** usuario autenticado (cliente o staff),
**quiero** cambiar mi contraseña ingresando la actual y la nueva,
**para** mantener mi cuenta segura sin tener que cerrar sesión.

---

## Criterios de Aceptación

### CA-004.1 — Contraseña actual incorrecta
- **Dado que** ingreso mal mi contraseña actual,
- **cuando** envío el formulario,
- **entonces** debo ver el mensaje: "La contraseña actual es incorrecta." y sigo con mi sesión abierta.

### CA-004.2 — Nueva contraseña igual a la actual
- **Dado que** ingreso la misma contraseña actual como nueva contraseña,
- **cuando** envío el formulario,
- **entonces** debo ver el mensaje: "La nueva contraseña debe ser diferente a la actual.".

### CA-004.3 — Cambio exitoso
- **Dado que** ingreso correctamente mi contraseña actual y una nueva válida,
- **cuando** envío el formulario,
- **entonces** mi contraseña queda actualizada, veo un mensaje de confirmación y sigo conectado en este dispositivo.

### CA-004.4 — Nueva contraseña débil
- **Dado que** la nueva contraseña no cumple los requisitos (≥8 caracteres, mayúscula, minúscula, número),
- **cuando** envío el formulario,
- **entonces** veo el requisito que falta.

### CA-004.5 — Cierre de las demás sesiones
- **Dado que** tengo sesiones abiertas en otros dispositivos,
- **cuando** cambio mi contraseña,
- **entonces** esas sesiones dejan de poder renovarse y deben iniciar sesión de nuevo (a más tardar en 15 minutos).

---

## Endpoints

| Método | Ruta                             | Descripción                       |
| ------ | --------------------------------- | ------------------------------------ |
| POST   | `/api/v1/auth/change-password`    | Cambia la contraseña del usuario     |

---

## Notas técnicas

- Requiere `accessToken` válido en el header `Authorization`.
- La contraseña actual incorrecta responde **400** `INVALID_CURRENT_PASSWORD` (no 401) para que el frontend no lo confunda con una sesión expirada.
- La respuesta trae tokens nuevos; el frontend los guarda. Los refresh tokens anteriores quedan inválidos (columna `users.password_changed_at`).
