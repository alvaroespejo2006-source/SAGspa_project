/**
 * Archivo: api/orders.ts
 * Descripción: Llamadas HTTP para el carrito y los pedidos de productos (RF-016, RF-019).
 */

import { apiClient } from './axios';
import type { ApiResponse } from '@/types/auth';
import type {
  CreateOrderRequest,
  Order,
  OrderStatus,
  OrderStatusUpdateResult,
  StaffOrder,
} from '@/types/orders';

export async function createOrder(data: CreateOrderRequest): Promise<Order> {
  const res = await apiClient.post<ApiResponse<Order>>('/orders', data);
  return res.data.data;
}

export async function listMyOrders(): Promise<Order[]> {
  const res = await apiClient.get<ApiResponse<Order[]>>('/orders/me');
  return res.data.data;
}

// ¿Qué? Bandeja de pedidos pendientes para el staff (RF-019).
// ¿Qué? Pedidos de un estado para el staff (HU-019) — por defecto, los pendientes.
export async function listOrdersByStatus(status: OrderStatus = 'pending'): Promise<StaffOrder[]> {
  const res = await apiClient.get<ApiResponse<StaffOrder[]>>('/staff/orders', {
    params: { status },
  });
  return res.data.data;
}

export async function updateOrderStatus(
  id: string,
  status: Extract<OrderStatus, 'completed' | 'cancelled'>,
): Promise<OrderStatusUpdateResult> {
  const res = await apiClient.put<ApiResponse<OrderStatusUpdateResult>>(`/staff/orders/${id}`, {
    status,
  });
  return res.data.data;
}
