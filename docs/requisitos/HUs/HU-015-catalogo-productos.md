<!--
  ¿Qué? Historia de usuario que describe cómo el cliente ve el catálogo de productos.
  ¿Para qué? Formalizar la necesidad de mostrar productos disponibles antes de armar el carrito.
  ¿Impacto? Sin catálogo visible, el cliente no sabría qué puede comprar.
-->

# HU-015 — Ver Catálogo de Productos

## Identificación

| Campo            | Valor                    |
| ---------------- | ---------------------------- |
| **ID**           | HU-015                          |
| **Título**       | Ver catálogo de productos          |
| **Módulo**       | Productos                             |
| **Prioridad**    | Alta                                     |
| **Estado**       | Implementada                              |
| **RF asociados** | RF-015                                     |
| **Responsable**  | Juan Rodriguez                             |
| **Rama**         | `feature/HU-015-catalogo-productos`        |

---

## Historia

**Como** cliente,
**quiero** ver el catálogo de productos disponibles (juguetes, artículos, medicamentos) con su precio,
**para** decidir qué agregar a mi carrito.

---

## Criterios de Aceptación

### CA-015.1 — Catálogo visible
- **Dado que** entro a la sección de productos,
- **cuando** se carga la pantalla,
- **entonces** veo los productos activos con nombre, precio y categoría (si la tiene) y cuántas unidades quedan.
- Si el catálogo no se puede cargar, veo el error y no "Todavía no hay productos disponibles".

### CA-015.2 — Producto sin stock
- **Dado que** un producto tiene `stock = 0`,
- **cuando** lo veo en el catálogo,
- **entonces** aparece marcado como "Agotado" y no puedo agregarlo al carrito (el botón está deshabilitado y el backend también rechaza el pedido).

### CA-015.3 — Gestión desde el staff
- **Dado que** inicié sesión como staff,
- **cuando** entro al módulo de productos,
- **entonces** puedo crear, editar (incluyendo precio y stock) y desactivar productos.
- El botón "Editar" de cada producto carga sus datos en el formulario; cada campo valida antes de enviar.
- Al eliminar, la pantalla pide confirmación y dice si el producto se borró o se desactivó por tener pedidos o ventas.

---

## Endpoints

| Método | Ruta                       | Descripción                     |
| ------ | -------------------------- | ----------------------------------- |
| GET    | `/api/v1/products`         | Lista los productos activos           |
| POST   | `/api/v1/products`         | Crea un producto (staff)               |
| PUT    | `/api/v1/products/:id`     | Edita un producto (staff)               |
| DELETE | `/api/v1/products/:id`     | Elimina o desactiva un producto (staff)  |
