<!--
  ¿Qué? Historia de usuario que describe la consulta de mascotas propias del cliente.
  ¿Para qué? Formalizar cómo el cliente ve y selecciona su mascota al usar el semáforo.
  ¿Impacto? Sin esto, el selector de mascotas de las opciones 🟢 y 🟡 no tendría datos que mostrar.
-->

# HU-013 — Listado de Mascotas del Cliente

## Identificación

| Campo            | Valor                        |
| ---------------- | ------------------------------ |
| **ID**           | HU-013                           |
| **Título**       | Listado de mascotas del cliente    |
| **Módulo**       | Mascotas                              |
| **Prioridad**    | Alta                                     |
| **Estado**       | Implementada                               |
| **RF asociados** | RF-013                                     |
| **Responsable**  | Alvaro Espejo |
| **Rama**         | `feature/HU-013-listado-mascotas` |

---

## Historia

**Como** cliente,
**quiero** ver la lista de mis mascotas registradas,
**para** elegir cuál de ellas es la que va a la cita o la que presenta el síntoma.

---

## Criterios de Aceptación

### CA-013.1 — Lista de mascotas
- **Dado que** tengo mascotas registradas,
- **cuando** abro el formulario de cita o de síntoma,
- **entonces** veo un selector con los nombres de mis mascotas.

### CA-013.2 — Sin mascotas registradas
- **Dado que** aún no tengo mascotas registradas,
- **cuando** abro el formulario de cita o de síntoma,
- **entonces** veo un mensaje indicando que debo acercarme a GroomingSpa para que registren a mi mascota.
- Si mis mascotas no se pudieron cargar (sin conexión), veo el error y no este aviso.

### CA-013.3 — Ver "Mis mascotas" *(nuevo)*
- **Dado que** tengo mascotas registradas,
- **cuando** entro al inicio de la app,
- **entonces** veo la sección "Mis mascotas" con el nombre, la especie, la raza y la edad de cada una.

---

## Endpoints

| Método | Ruta                  | Descripción                             |
| ------ | --------------------- | ------------------------------------------ |
| GET    | `/api/v1/pets/me`     | Lista las mascotas del cliente autenticado |

---

## Notas técnicas

- Devuelve un arreglo vacío (no error) cuando el cliente no tiene mascotas registradas todavía.
- Solo devuelve las mascotas del cliente del token; el staff recibe 403 en `/pets/me`.
- En toda la API, un `:id` que no es un UUID responde **404** "No se encontró el recurso solicitado." (antes 500).
