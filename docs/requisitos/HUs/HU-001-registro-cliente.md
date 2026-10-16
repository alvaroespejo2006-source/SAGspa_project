<!--
  ¿Qué? Historia de usuario que describe el registro de un nuevo cliente en GroomingSpa.
  ¿Para qué? Formalizar la necesidad del cliente de crear una cuenta para agendar citas y comprar productos.
  ¿Impacto? Es la puerta de entrada al sistema para cualquier dueño de mascota.
-->

# HU-001 — Registro de Cliente

## Identificación

| Campo            | Valor              |
| ---------------- | ------------------- |
| **ID**           | HU-001               |
| **Título**       | Registro de cliente  |
| **Módulo**       | Autenticación         |
| **Prioridad**    | Alta                  |
| **Estado**       | Implementada          |
| **RF asociados** | RF-001                |
| **Responsable**  | Alvaro Espejo         |
| **Rama**         | `feature/HU-001-registro-cliente` |

---

## Historia

**Como** dueño de una mascota,
**quiero** crear una cuenta con mi documento, nombre, teléfono, correo y contraseña,
**para** poder agendar citas, reportar síntomas de mi mascota y comprar productos en GroomingSpa.

---

## Criterios de Aceptación

### CA-001.1 — Formulario de registro completo
- **Dado que** estoy en la página de registro,
- **cuando** veo el formulario,
- **entonces** debo encontrar campos para documento, nombre, apellido, teléfono, correo, contraseña y confirmación de contraseña.

### CA-001.2 — Teléfono obligatorio
- **Dado que** estoy completando el formulario de registro,
- **cuando** dejo el campo de teléfono vacío y envío el formulario,
- **entonces** debo ver un mensaje de error: "El teléfono es obligatorio.".

### CA-001.3 — Validación de contraseña débil
- **Dado que** estoy completando el formulario de registro,
- **cuando** ingreso una contraseña que no cumple los requisitos mínimos,
- **entonces** debo ver un mensaje de error indicando qué requisito falta (≥8 caracteres, mayúscula, minúscula, número), por ejemplo: "A la contraseña le falta: una mayúscula, un número.".

### CA-001.4 — Confirmación de contraseña
- **Dado que** estoy completando el formulario de registro,
- **cuando** la contraseña y su confirmación no coinciden,
- **entonces** debo ver el mensaje: "Las contraseñas no coinciden".

### CA-001.5 — Registro exitoso con confirmación de email
- **Dado que** completé todos los campos correctamente,
- **cuando** envío el formulario,
- **entonces** mi cuenta se crea con rol `client` y se me muestra un mensaje indicando que debo revisar mi correo para verificar la cuenta.

### CA-001.6 — Correo o documento duplicados
- **Dado que** intento registrarme con un correo o documento que ya existen en el sistema,
- **cuando** envío el formulario,
- **entonces** debo ver el mensaje: "El email o el documento ya están registrados.".

### CA-001.7 — Bloqueo de login hasta verificar email
- **Dado que** me registré pero aún no hice clic en el enlace de verificación,
- **cuando** intento iniciar sesión con mis credenciales,
- **entonces** debo ver el mensaje: "Debes verificar tu email antes de iniciar sesión".

### CA-001.8 — Activación exitosa desde el enlace del correo
- **Dado que** hice clic en el enlace de verificación del correo,
- **cuando** el token es válido (no expirado, no usado),
- **entonces** mi cuenta queda activa y soy redirigido al login con un mensaje de éxito.

### CA-001.9 — Estado de carga
- **Dado que** envié el formulario de registro,
- **cuando** la solicitud está en proceso,
- **entonces** el botón "Crear cuenta" debe estar deshabilitado y mostrar un indicador de carga.

---

## Endpoints

| Método | Ruta                        | Descripción                                    |
| ------ | --------------------------- | ------------------------------------------------ |
| POST   | `/api/v1/auth/register`     | Crea la cuenta y envía email de verificación     |
| POST   | `/api/v1/auth/verify-email` | Activa la cuenta con el token del email          |

---

## Notas técnicas

- La contraseña se almacena como hash bcrypt (salt rounds = 12) — nunca en texto plano.
- El usuario creado por este flujo siempre queda con `role = 'client'`.
- El campo `isEmailVerified` se establece en `false` al registrarse; el login retorna `403` hasta que sea `true`.
- El token de verificación expira en 24 horas y es de un solo uso.
