<!--
  ¿Qué? Historia de usuario que describe cómo un miembro del staff crea otra cuenta de staff.
  ¿Para qué? Formalizar la gestión de personal interno sin exponer un registro público.
  ¿Impacto? Sin esto, dar de alta a un nuevo empleado requeriría tocar la base de datos directamente.
-->

# HU-008 — Creación de Cuenta de Staff

## Identificación

| Campo            | Valor                        |
| ---------------- | ------------------------------ |
| **ID**           | HU-008                          |
| **Título**       | Creación de cuenta de staff     |
| **Módulo**       | Autenticación                    |
| **Prioridad**    | Media                             |
| **Estado**       | Implementada                     |
| **RF asociados** | RF-008                            |
| **Responsable**  | Duvan Doncel                      |
| **Rama**         | `feature/HU-008-creacion-cuenta-staff` |

---

## Historia

**Como** miembro del staff ya autenticado,
**quiero** crear una cuenta para un nuevo compañero de trabajo,
**para** que también pueda usar el panel administrativo sin que yo tenga que tocar la base de datos.

---

## Criterios de Aceptación

### CA-008.1 — Acceso restringido
- **Dado que** inicié sesión como cliente,
- **cuando** intento acceder a la pantalla de creación de staff,
- **entonces** el sistema me lo impide (HTTP 403, "No tienes permiso para realizar esta acción.") y no veo esa opción en el menú.
- Si escribo la URL `/staff/nueva-cuenta`, la app me devuelve a mi zona de cliente (`/app`).

### CA-008.2 — Formulario de creación de staff
- **Dado que** inicié sesión como staff,
- **cuando** abro la pantalla "Crear cuenta de staff",
- **entonces** veo campos para nombre, apellido, correo y contraseña.
- Si un campo no es válido, veo el error debajo de ese campo antes de enviar (por ejemplo "A la contraseña le falta: una mayúscula.").

### CA-008.3 — Correo duplicado
- **Dado que** intento crear un staff con un correo que ya existe en el sistema,
- **cuando** envío el formulario,
- **entonces** veo el mensaje "El email ya está registrado." (también si el correo es de un cliente o tiene otras mayúsculas).

### CA-008.4 — Creación exitosa
- **Dado que** completé el formulario correctamente,
- **cuando** lo envío,
- **entonces** la nueva cuenta queda creada con `role = 'staff'` y aparece en el listado de staff (debajo del formulario) como "Pendiente de verificar".
- El mensaje de éxito avisa que se envió un correo para activar la cuenta antes de iniciar sesión.

---

## Endpoints

| Método | Ruta             | Descripción                       |
| ------ | ---------------- | ------------------------------------ |
| POST   | `/api/v1/staff`  | Crea una nueva cuenta de staff       |
| GET    | `/api/v1/staff`  | Lista las cuentas de staff (más reciente primero) |

---

## Notas técnicas

- Requiere JWT válido con `role = 'staff'` — se valida con el mismo `authMiddleware` usado en el resto del panel administrativo.
- La primera cuenta de staff del sistema no se crea por este flujo — se crea directamente en la base de datos (seed) al desplegar el proyecto.
