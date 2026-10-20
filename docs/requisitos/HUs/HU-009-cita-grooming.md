<!--
  ¿Qué? Historia de usuario que describe el agendamiento de una cita de grooming.
  ¿Para qué? Formalizar la necesidad del cliente de reservar un turno sin llamar al local.
  ¿Impacto? Es el flujo de negocio más importante de la app.
-->

# HU-009 — Agendar Cita de Grooming (🟢)

## Identificación

| Campo            | Valor                      |
| ---------------- | ---------------------------- |
| **ID**           | HU-009                        |
| **Título**       | Agendar cita de grooming        |
| **Módulo**       | Semáforo                          |
| **Prioridad**    | Alta                                |
| **Estado**       | Implementada                         |
| **RF asociados** | RF-009                                |
| **Responsable**  | Alvaro Espejo                         |
| **Rama**         | `feature/HU-009-cita-grooming`        |

---

## Historia

**Como** cliente,
**quiero** elegir la opción verde del semáforo y agendar una cita seleccionando una de mis mascotas registradas, el servicio, la fecha y la hora,
**para** reservar un turno de grooming sin tener que llamar o ir presencialmente al local.

---

## Criterios de Aceptación

### CA-009.1 — Menú semáforo
- **Dado que** inicié sesión como cliente,
- **cuando** entro a la app,
- **entonces** veo las tres opciones del semáforo: 🟢 Cita de Grooming, 🟡 Síntoma Leve, 🔴 Emergencia.

### CA-009.2 — Formulario de cita
- **Dado que** elijo la opción 🟢,
- **cuando** veo el formulario,
- **entonces** encuentro un selector con mis mascotas ya registradas, el servicio a solicitar, fecha y hora.

### CA-009.2b — Sin mascotas registradas
- **Dado que** todavía no tengo ninguna mascota registrada a mi nombre,
- **cuando** elijo la opción 🟢 o 🟡,
- **entonces** veo un mensaje indicando que debo acercarme o comunicarme con GroomingSpa para que registren a mi mascota antes de poder agendar.
- El aviso también aparece si entro a `/app/cita` escribiendo la URL, y en ese caso no se muestra el formulario.
- Si las mascotas no se pudieron cargar (por ejemplo, sin conexión), veo el error y **no** el aviso de "no tienes mascotas".

### CA-009.3 — Fecha mínima
- **Dado que** estoy llenando el formulario,
- **cuando** elijo hoy o una fecha pasada,
- **entonces** veo el mensaje: "La cita debe ser a partir de mañana".
- "Mañana" se cuenta con la hora de Colombia (`BUSINESS_TIMEZONE`, por defecto `America/Bogota`), no con UTC.

### CA-009.4 — Horario de atención
- **Dado que** estoy llenando el formulario,
- **cuando** elijo una hora antes de las 9:00 a.m. o después de las 6:00 p.m.,
- **entonces** veo el mensaje: "La hora debe estar entre las 9:00am y las 6:00pm".

### CA-009.5 — Confirmación de envío
- **Dado que** completé el formulario correctamente,
- **cuando** lo envío,
- **entonces** veo el mensaje: "¡Cita agendada! Quedó en estado pendiente y te contactaremos para confirmarla."

### CA-009.6 — Consultar mis citas
- **Dado que** ya agendé una o más citas,
- **cuando** entro a "Mis citas",
- **entonces** veo la lista con el estado de cada una (pendiente, confirmada, atendida, cancelada).
- Cada cita muestra el nombre de la mascota y del servicio, aunque ese servicio ya no esté activo en el catálogo.

---

## Endpoints

| Método | Ruta                     | Descripción                          |
| ------ | ------------------------ | --------------------------------------- |
| POST   | `/api/v1/appointments`   | Agenda una cita de grooming             |
| GET    | `/api/v1/appointments/me`| Lista las citas del cliente autenticado |

---

## Notas técnicas

- La mascota (`petId`) debe pertenecer a una lista de mascotas ya registradas por el staff para ese cliente (ver RF-012/RF-013). El cliente no puede escribir el nombre libremente.
- El servicio (`serviceId`) se elige del catálogo administrado en el módulo de Servicios (RF-014).
- El estado inicial de toda cita es `pending`; solo el staff puede cambiarlo (RF-017).
