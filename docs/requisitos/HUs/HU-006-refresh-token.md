<!--
  ¿Qué? Historia de usuario que describe la renovación automática de sesión.
  ¿Para qué? Formalizar que el usuario no deba iniciar sesión cada 15 minutos.
  ¿Impacto? Sin esto, la experiencia sería muy incómoda: la sesión se cerraría constantemente.
-->

# HU-006 — Renovación de Sesión

## Identificación

| Campo            | Valor                  |
| ---------------- | ------------------------ |
| **ID**           | HU-006                    |
| **Título**       | Renovación de sesión        |
| **Módulo**       | Autenticación                 |
| **Prioridad**    | Media                           |
| **Estado**       | Implementada                     |
| **RF asociados** | RF-006                            |
| **Responsable**  | Yesid Valencia                    |
| **Rama**         | `feature/HU-006-renovacion-sesion` |

---

## Historia

**Como** usuario con sesión iniciada,
**quiero** que mi sesión se mantenga activa mientras uso la app,
**para** no tener que iniciar sesión de nuevo cada 15 minutos.

---

## Criterios de Aceptación

### CA-006.1 — Renovación transparente
- **Dado que** mi `accessToken` expiró pero mi `refreshToken` sigue siendo válido,
- **cuando** hago cualquier acción en la app,
- **entonces** el frontend obtiene un nuevo `accessToken` automáticamente, repite la acción y yo no lo noto.
- Si varias acciones fallan a la vez, se hace **un solo** refresh y todas esperan ese resultado.

### CA-006.2 — Refresh token expirado
- **Dado que** mi `refreshToken` también expiró (más de 7 días sin actividad),
- **cuando** intento realizar una acción,
- **entonces** soy redirigido al login con el mensaje "Tu sesión expiró. Inicia sesión de nuevo para continuar.".

### CA-006.3 — Falla de red durante la renovación *(nuevo)*
- **Dado que** mi `refreshToken` sigue siendo válido,
- **cuando** la renovación falla por un problema de red, un límite de intentos (429) o un error del servidor,
- **entonces** mi sesión **no** se cierra; solo veo el error de esa acción y puedo intentar de nuevo.

---

## Endpoints

| Método | Ruta                     | Descripción                                    |
| ------ | ------------------------ | ------------------------------------------------ |
| POST   | `/api/v1/auth/refresh`   | Genera nuevos tokens a partir del refresh token   |

---

## Notas técnicas

- Es un flujo invisible para el usuario, manejado por un interceptor HTTP en el frontend (`fe/src/api/axios.ts`).
- Solo un 401/403 del refresh cierra la sesión; se redirige a `/login?sesion=expirada`.
- `/auth/refresh` tiene su propio límite de intentos (100 cada 15 min por IP), separado del de login (RN-066).
