<!--
  ¿Qué? Historia de usuario que describe la gestión de proveedores.
  ¿Para qué? Formalizar la necesidad de llevar registro de a quién se le compran los productos.
  ¿Impacto? Sin proveedores registrados no se puede generar un pedido de reabastecimiento.
-->

# HU-020 — Gestionar Proveedores

## Identificación

| Campo            | Valor              |
| ---------------- | -------------------- |
| **ID**           | HU-020                |
| **Título**       | Gestionar proveedores    |
| **Módulo**       | Inventario y Proveedores    |
| **Prioridad**    | Media                          |
| **Estado**       | Implementada                     |
| **Responsable**  | Duvan Doncel                     |
| **Rama**         | `feature/HU-020-gestion-proveedores` |
| **RF asociados** | RF-020                            |

---

## Historia

**Como** miembro del staff,
**quiero** registrar y editar los proveedores con sus datos de contacto,
**para** saber a quién pedirle reabastecimiento de productos.

---

## Criterios de Aceptación

### CA-020.1 — Crear proveedor
- **Dado que** inicié sesión como staff,
- **cuando** completo el formulario de nuevo proveedor y lo envío,
- **entonces** el proveedor aparece en el listado.
- El nombre es obligatorio (al menos 2 caracteres, sin contar espacios); el teléfono solo admite números, espacios, `+`, `-` y paréntesis, y el correo se guarda en minúsculas.

### CA-020.2 — Editar proveedor
- **Dado que** un proveedor ya existe,
- **cuando** edito sus datos de contacto,
- **entonces** los cambios se reflejan de inmediato.
- El botón "Editar" de cada proveedor carga sus datos en el formulario; si dejo vacío un dato de contacto (por ejemplo el correo), ese dato se borra.

### CA-020.3 — Desactivar proveedor con pedidos
- **Dado que** un proveedor tiene pedidos asociados,
- **cuando** intento eliminarlo,
- **entonces** el sistema lo desactiva en vez de borrarlo y me lo explica: "El proveedor tiene pedidos asociados, así que se desactivó en lugar de eliminarse."
- Antes de eliminar, la pantalla pide confirmación.

---

## Endpoints

| Método | Ruta                        | Descripción            |
| ------ | --------------------------- | -------------------------- |
| GET    | `/api/v1/suppliers`         | Lista los proveedores        |
| POST   | `/api/v1/suppliers`         | Crea un proveedor              |
| PUT    | `/api/v1/suppliers/:id`     | Edita un proveedor               |
| DELETE | `/api/v1/suppliers/:id`     | Elimina o desactiva un proveedor  |
