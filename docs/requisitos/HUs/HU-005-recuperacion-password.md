<!--
  ¿Qué? Historia de usuario que describe la recuperación de contraseña olvidada por correo.
  ¿Para qué? Formalizar cómo un usuario recupera el acceso a su cuenta sin ayuda del staff.
  ¿Impacto? Sin esto, olvidar la contraseña significaría perder el acceso a la cuenta para siempre.
-->

# HU-005 — Recuperación de Contraseña

## Identificación

| Campo            | Valor                      |
| ---------------- | ---------------------------- |
| **ID**           | HU-005                        |
| **Título**       | Recuperación de contraseña      |
| **Módulo**       | Autenticación                    |
| **Prioridad**    | Media                              |
| **Estado**       | Implementada                       |
| **RF asociados** | RF-005                              |
| **Responsable**  | Alvaro Espejo                       |
| **Rama**         | `feature/HU-005-recuperacion-password` |

---

## Historia

**Como** usuario que olvidó su contraseña,
**quiero** solicitar un enlace de recuperación a mi correo y definir una nueva contraseña,
**para** recuperar el acceso a mi cuenta sin depender del staff.

---

## Criterios de Aceptación

### CA-005.1 — Solicitud de recuperación
- **Dado que** estoy en la página de login,
- **cuando** hago clic en "¿Olvidaste tu contraseña?" e ingreso mi correo,
- **entonces** veo el mensaje: "Si el correo está registrado, recibirás un enlace de recuperación." (sin importar si el correo existe).

### CA-005.2 — Enlace expirado
- **Dado que** el enlace de recuperación tiene más de 1 hora,
- **cuando** hago clic en él,
- **entonces** debo ver el mensaje "El enlace de recuperación expiró. Solicita uno nuevo." y un botón para pedir otro enlace, sin que aparezca el formulario.

### CA-005.3 — Restablecimiento exitoso
- **Dado que** el enlace es válido y defino una nueva contraseña que cumple los requisitos,
- **cuando** envío el formulario,
- **entonces** mi contraseña queda actualizada y soy redirigido al login con el mensaje "Contraseña restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.".

### CA-005.4 — Enlace ya utilizado *(nuevo)*
- **Dado que** ya restablecí mi contraseña con un enlace (o pedí uno más reciente),
- **cuando** vuelvo a abrir ese enlace,
- **entonces** veo que ya fue utilizado y puedo solicitar uno nuevo.

---

## Endpoints

| Método | Ruta                            | Descripción                                  |
| ------ | -------------------------------- | ----------------------------------------------- |
| POST   | `/api/v1/auth/forgot-password`   | Genera el token y envía el correo de recuperación |
| POST   | `/api/v1/auth/reset-password`    | Valida el token y actualiza la contraseña        |
| POST   | `/api/v1/auth/reset-password/validate` | Indica si el enlace sigue vigente (no cambia nada) |

---

## Notas técnicas

- El token de recuperación expira en 1 hora y es de un solo uso.
- Al pedir un enlace nuevo, los anteriores que no se usaron dejan de servir.
- Cada fallo del enlace tiene su código: `TOKEN_INVALID`, `TOKEN_ALREADY_USED`, `TOKEN_EXPIRED`.
- Restablecer la contraseña cierra las demás sesiones abiertas (RN-035, HU-004).
