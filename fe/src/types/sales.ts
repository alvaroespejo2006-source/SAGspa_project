/**
 * Archivo: types/sales.ts
 * Descripción: Tipos TypeScript para ventas de mostrador (RF-023) y el reporte de ventas (RF-022).
 */

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  status: string;
  paymentStatus: string;
  total: number;
  clientId: string | null;
  clientName: string | null;
  items: SaleItem[];
  createdAt: string;
}

export interface CreateSaleRequest {
  items: { productId: string; quantity: number }[];
  clientId?: string;
  clientName?: string;
}

export interface SalesReportByProduct {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

export interface SalesReport {
  from: string;
  to: string;
  totalRevenue: number;
  totalOrders: number;
  // ¿Qué? Pedidos de la app y ventas de mostrador incluidos en el total (HU-022, CA-022.3).
  appOrders: number;
  counterSales: number;
  byProduct: SalesReportByProduct[];
}
