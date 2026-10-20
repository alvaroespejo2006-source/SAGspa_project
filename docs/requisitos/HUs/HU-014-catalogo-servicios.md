<!--
  ¿Qué? Historia de usuario que describe la gestión del catálogo de servicios por parte del staff.
  ¿Para qué? Formalizar cómo se ajustan servicios y precios sin necesidad de tocar código.
  ¿Impacto? Los precios cambian cada año — sin esto, cada cambio requeriría un despliegue nuevo.
-->

# HU-014 — Gestión del Catálogo de Servicios

## Identificación

| Campo            | Valor                       |
| ---------------- | ------------------------------ |
| **ID**           | HU-014                           |
| **Título**       | Gestión del catálogo de servicios  |
| **Módulo**       | Servicios                              |
| **Prioridad**    | Alta                                      |
| **Estado**       | Implementada                               |
| **RF asociados** | RF-014                                      |
| **Responsable**  | Yesid Valencia                              |
| **Rama**         | `feature/HU-014-catalogo-servicios`         |

---

## Historia

**Como** miembro del staff,
**quiero** crear, editar y desactivar servicios de grooming con su precio y duración,
**para** mantener el catálogo actualizado (por ejemplo, cuando suben los precios cada año) sin depender de un desarrollador.

---

## Criterios de Aceptación

### CA-014.1 — Crear servicio
- **Dado que** inicié sesión como staff,
- **cuando** completo el formulario de nuevo servicio (nombre, precio, duración) y lo envío,
- **entonces** el servicio aparece en el catálogo y queda disponible para que los clientes lo elijan al agendar.
- Cada campo valida antes de enviar: nombre de al menos 2 caracteres (sin contar espacios), precio mayor a 0 y duración entera de 1 a 480 minutos.

### CA-014.2 — Editar precio
- **Dado que** un servicio ya existe,
- **cuando** edito su precio y guardo,
- **entonces** el nuevo precio se refleja de inmediato en el catálogo que ven los clientes.
- En la pantalla del staff, el botón "Editar" de cada servicio carga sus datos en el formulario (nombre, descripción, precio y duración).

### CA-014.3 — Desactivar en vez de eliminar
- **Dado que** un servicio ya tiene citas agendadas asociadas,
- **cuando** intento eliminarlo,
- **entonces** el sistema lo marca como inactivo en vez de borrarlo, y deja de aparecer en el catálogo para nuevos clientes.
- Antes de eliminar, la pantalla pide confirmación; después dice "El servicio tiene citas asociadas, así que se desactivó en lugar de eliminarse." o "Servicio eliminado."

### CA-014.4 — Catálogo visible para el cliente
- **Dado que** soy cliente y estoy agendando una cita,
- **cuando** abro el selector de servicio,
- **entonces** veo solo los servicios activos, con su nombre y precio.

---

## Endpoints

| Método | Ruta                       | Descripción                              |
| ------ | -------------------------- | ------------------------------------------- |
| GET    | `/api/v1/services`         | Lista los servicios activos                  |
| POST   | `/api/v1/services`         | Crea un servicio nuevo                        |
| PUT    | `/api/v1/services/:id`     | Edita un servicio existente                    |
| DELETE | `/api/v1/services/:id`     | Elimina o desactiva un servicio                 |

---

## Notas técnicas

- Solo `role = 'staff'` puede crear, editar o desactivar servicios; el listado de activos es público.
