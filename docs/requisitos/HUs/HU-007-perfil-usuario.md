<!--
  ¿Qué? Historia de usuario que describe la consulta del perfil propio.
  ¿Para qué? Formalizar cómo el frontend obtiene los datos del usuario autenticado.
  ¿Impacto? Sin esto, el frontend no sabría qué nombre o rol mostrar tras iniciar sesión.
-->

# HU-007 — Perfil de Usuario

## Identificación

| Campo            | Valor              |
| ---------------- | -------------------- |
| **ID**           | HU-007                |
| **Título**       | Perfil de usuario       |
| **Módulo**       | Autenticación             |
| **Prioridad**    | Media                       |
| **Estado**       | Implementada                 |
| **RF asociados** | RF-007                        |
| **Responsable**  | Juan Rodriguez                |
| **Rama**         | `feature/HU-007-perfil-usuario` |

---

## Historia

**Como** usuario autenticado,
**quiero** que la app muestre mis datos (nombre, correo, rol),
**para** confirmar que inicié sesión con la cuenta correcta.

---

## Criterios de Aceptación

### CA-007.1 — Datos visibles tras iniciar sesión
- **Dado que** inicié sesión correctamente,
- **cuando** la app carga,
- **entonces** veo mi nombre en la cabecera de la pantalla, también en el celular.
- En pantallas desde 640 px también veo mi rol (Cliente / Staff) y mi correo.

### CA-007.2 — Token inválido
- **Dado que** mi token no es válido (manipulado o corrupto),
- **cuando** la app intenta cargar mi perfil,
- **entonces** soy redirigido al login y la sesión guardada se borra.
- Lo mismo pasa si la cuenta del token fue eliminada (el backend responde 401, no 404).
- Si el servidor no responde (sin conexión), la sesión guardada **no** se borra.

---

## Endpoints

| Método | Ruta                 | Descripción                     |
| ------ | -------------------- | ---------------------------------- |
| GET    | `/api/v1/users/me`   | Retorna el perfil del usuario       |

---

## Notas técnicas

- Requiere `accessToken` válido en el header `Authorization`.
- El backend solo acepta tokens firmados con HS256; los mensajes de 401 están en español.
