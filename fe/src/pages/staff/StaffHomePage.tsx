/**
 * Archivo: pages/staff/StaffHomePage.tsx
 * Descripción: Punto de entrada del staff tras iniciar sesión — enlaces a cada sección.
 * ¿Para qué? Las secciones se construyen módulo a módulo (RF-012 a RF-023); las que aún
 *   no existen se muestran deshabilitadas con "Próximamente" en vez de un link roto.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface SectionCardProps {
  to?: string;
  emoji: string;
  title: string;
  description: string;
}

function SectionCard({ to, emoji, title, description }: SectionCardProps) {
  const content = (
    <div
      className={[
        'flex items-center gap-4 rounded-xl p-4 transition-all duration-200',
        to
          ? 'comic-border comic-shadow hover:-translate-y-0.5 hover:bg-gray-50 dark:hover:bg-slate-800/50'
          : 'border border-gray-200 dark:border-slate-700 opacity-50 cursor-not-allowed',
      ].join(' ')}
    >
      <span className="text-3xl" aria-hidden="true">{emoji}</span>
      <div className="text-left">
        <p className="font-medium text-gray-900 dark:text-slate-100">{title}</p>
        <p className="text-sm text-gray-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

export function StaffHomePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-comic tracking-wide text-gray-900 dark:text-slate-100 mb-1 text-center">
        Panel de Staff — {user?.firstName}
      </h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-8">
        Selecciona una sección.
      </p>

      <div className="grid gap-4">
        <SectionCard
          to="/staff/agenda"
          emoji="📅"
          title="Agenda del día"
          description="Ver y gestionar las citas de grooming agendadas."
        />
        <SectionCard
          to="/staff/mascotas"
          emoji="🐾"
          title="Registrar mascota"
          description="Registrar una mascota a nombre de un cliente existente."
        />
        <SectionCard
          to="/staff/sintomas"
          emoji="💊"
          title="Reportes de síntomas"
          description="Revisar reportes pendientes y dejar una recomendación."
        />
        <SectionCard
          to="/staff/servicios"
          emoji="✂️"
          title="Catálogo de servicios"
          description="Crear y editar servicios de grooming y sus precios."
        />
        <SectionCard
          to="/staff/tarifario"
          emoji="💲"
          title="Tarifario de grooming"
          description="Ajustar recargos por tamaño, tipo de pelo y condiciones de piel."
        />
        <SectionCard
          to="/staff/productos"
          emoji="🛒"
          title="Catálogo de productos"
          description="Crear y editar productos, precios y stock."
        />
        <SectionCard
          to="/staff/pedidos"
          emoji="📋"
          title="Pedidos pendientes"
          description="Confirmar entrega y pago, o cancelar un pedido."
        />
        <SectionCard
          to="/staff/ventas"
          emoji="💰"
          title="Registrar venta"
          description="Registrar una venta hecha en persona, en el mostrador."
        />
        <SectionCard
          to="/staff/reporte-ventas"
          emoji="📊"
          title="Reporte de ventas"
          description="Ver el total vendido por rango de fechas."
        />
        <SectionCard
          to="/staff/proveedores"
          emoji="📦"
          title="Proveedores"
          description="Registrar y administrar proveedores."
        />
        <SectionCard
          to="/staff/pedidos-proveedor"
          emoji="🚚"
          title="Pedidos a proveedor"
          description="Reabastecer productos y confirmar recepción."
        />
        <SectionCard
          to="/staff/emergencia"
          emoji="🚨"
          title="Configurar emergencia"
          description="Editar los números de emergencia y el mapa que ven los clientes."
        />
        <SectionCard
          to="/staff/nueva-cuenta"
          emoji="👤"
          title="Nueva cuenta de staff"
          description="Dar de alta a otro miembro del equipo."
        />
      </div>
    </div>
  );
}
