<!--
  ¿Qué? Historia de usuario que describe el reporte de un síntoma leve en una mascota.
  ¿Para qué? Formalizar cómo un cliente alerta al staff sin que sea una emergencia.
  ¿Impacto? Da una vía intermedia entre "todo bien" y "es urgente", evitando saturar la opción de emergencia.
-->

# HU-010 — Reportar Síntoma Leve (🟡)

## Identificación

| Campo            | Valor                       |
| ---------------- | ------------------------------ |
| **ID**           | HU-010                           |
| **Título**       | Reportar síntoma leve               |
| **Módulo**       | Semáforo                              |
| **Prioridad**    | Alta                                    |
| **Estado**       | Implementada                             |
| **RF asociados** | RF-010                                    |
| **Responsable**  | Yesid Valencia                            |
| **Rama**         | `feature/HU-010-reporte-sintoma`          |

---

## Historia

**Como** cliente,
**quiero** elegir la opción amarilla del semáforo y describir los síntomas de mi mascota,
**para** que alguien del staff los revise y me indique si necesito traerla o llevarla a un veterinario.

---

## Criterios de Aceptación

### CA-010.1 — Formulario de síntomas
- **Dado que** elijo la opción 🟡,
- **cuando** veo el formulario,
- **entonces** encuentro un selector con mis mascotas ya registradas, descripción del síntoma y hace cuántos días lo presenta.
- Si no tengo mascotas registradas, veo el mismo aviso de CA-009.2b en lugar del formulario.

### CA-010.2 — Campos obligatorios
- **Dado que** dejo el campo de síntoma vacío,
- **cuando** envío el formulario,
- **entonces** veo el mensaje "Describe el síntoma de tu mascota." debajo del campo (también si solo escribí espacios).
- Si falta la mascota o los días, cada campo indica lo que falta ("Selecciona la mascota.", "Indica hace cuántos días tiene el síntoma.").

### CA-010.3 — Envío exitoso
- **Dado que** completé el formulario,
- **cuando** lo envío,
- **entonces** veo el mensaje "Reporte enviado. Alguien del staff lo revisará pronto."

### CA-010.4 — Ver recomendación
- **Dado que** el staff ya revisó mi reporte,
- **cuando** entro a "Mis reportes",
- **entonces** veo la recomendación que dejaron (por ejemplo, "tráelo para revisión" o "te recomendamos un veterinario externo").
- Mientras no la hayan revisado, el reporte dice "El staff todavía no ha revisado este reporte."
- Cada reporte muestra el nombre de la mascota.

---

## Endpoints

| Método | Ruta                            | Descripción                              |
| ------ | -------------------------------- | ------------------------------------------- |
| POST   | `/api/v1/symptom-reports`        | Registra un reporte de síntoma leve         |
| GET    | `/api/v1/symptom-reports/me`     | Lista los reportes del cliente autenticado  |

---

## Notas técnicas

- Este flujo no genera diagnóstico ni historia clínica — GroomingSpa no tiene veterinario profesional en planta, solo una auxiliar en veterinaria que revisa y recomienda.
