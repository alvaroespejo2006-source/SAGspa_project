<!--
  ¿Qué? Historia de usuario que describe la opción de emergencia del semáforo.
  ¿Para qué? Formalizar que GroomingSpa oriente al cliente cuando la situación excede lo que puede atender.
  ¿Impacto? Evita que un cliente use el flujo de citas o síntomas para una urgencia real.
-->

# HU-011 — Emergencia: Veterinarias Cercanas (🔴)

## Identificación

| Campo            | Valor                            |
| ---------------- | ----------------------------------- |
| **ID**           | HU-011                                |
| **Título**       | Emergencia — veterinarias cercanas       |
| **Módulo**       | Semáforo                                   |
| **Prioridad**    | Media                                        |
| **Estado**       | Implementada                                  |
| **RF asociados** | RF-011                                         |
| **Responsable**  | Juan Rodriguez                                 |
| **Rama**         | `feature/HU-011-emergencia`                    |

---

## Historia

**Como** cliente con una mascota en una situación urgente,
**quiero** ver rápidamente veterinarias cercanas y números de emergencia,
**para** actuar de inmediato, sabiendo que GroomingSpa no atiende emergencias médicas.

---

## Criterios de Aceptación

### CA-011.1 — Acceso inmediato sin formularios
- **Dado que** elijo la opción 🔴 del semáforo,
- **cuando** entro a la pantalla,
- **entonces** veo directamente el mapa y los números de emergencia, sin tener que llenar ningún formulario.
- Los números aparecen primero; si la información no se puede cargar (sin conexión), igual veo la línea 123.

### CA-011.2 — Mapa de veterinarias cercanas
- **Dado que** estoy en la pantalla de emergencia,
- **cuando** se carga el mapa,
- **entonces** veo resultados de veterinarias cercanas a la ubicación configurada del negocio (la "búsqueda del mapa" que escribe el staff, por ejemplo con la dirección del local).
- Si el proyecto no tiene `VITE_MAPS_API_KEY`, veo el botón "Abrir mapa de veterinarias cercanas", que abre Google Maps con esa búsqueda.

### CA-011.3 — Números de emergencia visibles
- **Dado que** estoy en la pantalla de emergencia,
- **cuando** la reviso,
- **entonces** veo al menos un número de clínica veterinaria 24 horas y la línea de emergencias animales.
- Cada número tiene un tipo (`clinica_24h`, `linea_emergencia`, `otro`) y el sistema no deja guardar la configuración sin los dos primeros.

### CA-011.4 — El staff puede editar los números
- **Dado que** inicié sesión como staff,
- **cuando** entro a "Configurar emergencia",
- **entonces** puedo editar la lista de números que ven los clientes (agregar, quitar, cambiar tipo, nombre y teléfono) y la búsqueda del mapa.
- La pantalla está en `/staff/emergencia` ("Configurar emergencia" en el panel de staff).
- Mientras nadie guarde una configuración, la pantalla avisa que el cliente solo ve la línea 123.

---

## Endpoints

| Método | Ruta                        | Descripción                                   |
| ------ | ---------------------------- | ------------------------------------------------ |
| GET    | `/api/v1/emergency-info`     | Retorna los números y datos del mapa de emergencia |
| PUT    | `/api/v1/emergency-info`     | Actualiza los números de emergencia (solo staff)  |

---

## Notas técnicas

- La clave de la API del mapa se debe leer de una variable de entorno (`VITE_MAPS_API_KEY` o similar), nunca escribirse directamente en el componente.
- Esta pantalla no crea ningún registro en la base de datos — es solo informativa.
- ⚠️ **Al desplegar**, el staff debe cargar el número real de una clínica veterinaria 24 horas cercana al local: el sistema no trae uno por defecto porque depende de la ciudad.
