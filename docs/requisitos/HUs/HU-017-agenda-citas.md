<!--
  ¿Qué? Historia de usuario que describe la agenda virtual del staff.
  ¿Para qué? Formalizar cómo el staff organiza y confirma las citas del día.
  ¿Impacto? Es la pantalla que el staff usa cada día para saber a quién atender y cuándo.
-->

# HU-017 — Agenda del Día

## Identificación

| Campo            | Valor              |
| ---------------- | -------------------- |
| **ID**           | HU-017                |
| **Título**       | Agenda del día          |
| **Módulo**       | Agenda del staff            |
| **Prioridad**    | Alta                          |
| **Estado**       | Implementada                   |
| **Responsable**  | Alvaro Espejo |
| **Rama**         | `feature/HU-017-agenda-citas` |
| **RF asociados** | RF-017                           |

---

## Historia

**Como** miembro del staff,
**quiero** ver un calendario con las citas de grooming del día, con su hora, mascota, cliente y servicio,
**para** organizar mi jornada y saber a quién atender primero.

---

## Criterios de Aceptación

### CA-017.1 — Ver citas del día
- **Dado que** inicié sesión como staff,
- **cuando** abro la agenda,
- **entonces** veo las citas del día actual ordenadas por hora, cada una con mascota, cliente, servicio y estado.
- "Hoy" es la fecha de Colombia (antes, desde las 7:00 p.m., la agenda abría en el día siguiente).

### CA-017.2 — Cambiar de día
- **Dado que** estoy en la agenda,
- **cuando** elijo otra fecha,
- **entonces** veo las citas correspondientes a esa fecha.
- Además del selector hay botones "← Día anterior", "Hoy" y "Día siguiente →".

### CA-017.3 — Confirmar una cita
- **Dado que** una cita está `pending`,
- **cuando** la marco como confirmada,
- **entonces** su estado cambia a `confirmed` y así lo ve el cliente en su app.

### CA-017.4 — Marcar cita como atendida
- **Dado que** terminé de atender una cita,
- **cuando** la marco como completada,
- **entonces** su estado cambia a `completed` y se muestra como "Atendida" (botón "Marcar como atendida").
- Una cita atendida o cancelada ya no se puede modificar: "Esta cita ya está atendida y no se puede modificar."
- Cancelar una cita pide confirmación.

### CA-017.5 — Sin citas ese día
- **Dado que** no hay citas para la fecha seleccionada,
- **cuando** abro la agenda,
- **entonces** veo el mensaje "No hay citas programadas para este día."

---

## Endpoints

| Método | Ruta                          | Descripción                              |
| ------ | ----------------------------- | ---------------------------------------------- |
| GET    | `/api/v1/staff/agenda`        | Lista las citas de un día específico            |
| PUT    | `/api/v1/appointments/:id`    | Cambia el estado de una cita                     |
