<!--
  ¿Qué? Historia de usuario que describe la verificación de correo tras el registro.
  ¿Para qué? Formalizar cómo el usuario activa su cuenta desde el enlace enviado por correo.
  ¿Impacto? Sin este paso, ninguna cuenta recién registrada podría iniciar sesión.
-->

# HU-003 — Verificación de Email

## Identificación

| Campo            | Valor                  |
| ---------------- | ------------------------ |
| **ID**           | HU-003                    |
| **Título**       | Verificación de email     |
| **Módulo**       | Autenticación               |
| **Prioridad**    | Alta                         |
| **Estado**       | Implementada              |
| **RF asociados** | RF-003                        |
| **Responsable**  | Juan Rodriguez            |
| **Rama**         | `feature/HU-003-verificacion-email` |

---

## Historia

**Como** usuario recién registrado,
**quiero** hacer clic en el enlace de verificación que llega a mi correo,
**para** activar mi cuenta y poder iniciar sesión.

---

## Criterios de Aceptación

### CA-003.1 — Activación exitosa
- **Dado que** hago clic en el enlace de verificación recibido por correo,
- **cuando** el token es válido (no expirado, no usado),
- **entonces** mi cuenta queda activa (`isEmailVerified = true`) y veo un mensaje de éxito con enlace al login.

### CA-003.2 — Token expirado
- **Dado que** el enlace de verificación tiene más de 24 horas,
- **cuando** hago clic en él,
- **entonces** debo ver el mensaje "El enlace de verificación ha expirado. Solicita uno nuevo." y un formulario para pedir un enlace nuevo con mi correo.

### CA-003.3 — Token ya usado
- **Dado que** ya verifiqué mi cuenta anteriormente,
- **cuando** vuelvo a hacer clic en el mismo enlace,
- **entonces** debo ver el mensaje "Este enlace ya fue utilizado. Tu cuenta ya está verificada." y un botón para iniciar sesión.

### CA-003.4 — Enlace sin token o inválido
- **Dado que** abro `/verify-email` sin token o con un token que no existe,
- **cuando** la página carga,
- **entonces** veo un mensaje de error, no se activa ninguna cuenta y puedo pedir un enlace nuevo.

### CA-003.5 — Reenvío del enlace
- **Dado que** mi enlace expiró,
- **cuando** escribo mi correo y pido un enlace nuevo,
- **entonces** veo "Si tu cuenta está pendiente de verificación, te enviamos un nuevo enlace a tu correo." y el enlace anterior deja de servir.

---

## Endpoints

| Método | Ruta                          | Descripción                          |
| ------ | ----------------------------- | --------------------------------------- |
| POST   | `/api/v1/auth/verify-email`   | Activa la cuenta con el token del email |
| POST   | `/api/v1/auth/resend-verification` | Envía un enlace nuevo si la cuenta no está verificada |

---

## Notas técnicas

- El token de verificación expira en 24 horas y es de un solo uso.
- Cada fallo devuelve un `code` distinto (`TOKEN_INVALID`, `TOKEN_ALREADY_USED`, `TOKEN_EXPIRED`) que el frontend usa para decidir qué pantalla mostrar.
