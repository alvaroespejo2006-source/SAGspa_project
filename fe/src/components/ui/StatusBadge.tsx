/**
 * Archivo: components/ui/StatusBadge.tsx
 * Descripción: Etiqueta de color para mostrar el estado de una cita, reporte o pedido.
 * ¿Para qué? Reutilizar el mismo estilo de "chip" en todas las listas (mis citas,
 *   mis reportes, mis pedidos, agenda del staff) en vez de repetir clases de Tailwind.
 * ¿Impacto? RNF-004.1: el color nunca es la única señal — siempre va acompañado de texto.
 */

const LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  reviewed: 'Revisado',
  unpaid: 'Sin pagar',
  paid: 'Pagado',
  ordered: 'Pedido',
  received: 'Recibido',
};

const CLASSES: Record<string, string> = {
  pending: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  confirmed: 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border-brand-200 dark:border-brand-800',
  completed: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  cancelled: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  reviewed: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  unpaid: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  paid: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  ordered: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  received: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
};

// ¿Qué? `label` opcional reemplaza el texto por defecto del estado.
// ¿Para qué? Una cita `completed` se muestra como "Atendida" (CA-009.6), mientras que un
//   pedido `completed` sigue diciendo "Completada".
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${CLASSES[status] ?? 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-600'}`}
    >
      {label ?? LABELS[status] ?? status}
    </span>
  );
}
