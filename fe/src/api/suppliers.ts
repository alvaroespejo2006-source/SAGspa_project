/**
 * Archivo: api/suppliers.ts
 * Descripción: Llamadas HTTP para la gestión de proveedores (RF-020).
 */

import { apiClient } from './axios';
import type { ApiResponse } from '@/types/auth';
import type { CreateSupplierRequest, Supplier, UpdateSupplierRequest } from '@/types/suppliers';

export async function listSuppliers(): Promise<Supplier[]> {
  const res = await apiClient.get<ApiResponse<Supplier[]>>('/suppliers');
  return res.data.data;
}

export async function createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
  const res = await apiClient.post<ApiResponse<Supplier>>('/suppliers', data);
  return res.data.data;
}

export async function updateSupplier(id: string, data: UpdateSupplierRequest): Promise<Supplier> {
  const res = await apiClient.put<ApiResponse<Supplier>>(`/suppliers/${id}`, data);
  return res.data.data;
}

// ¿Qué? Devuelve el mensaje del backend: "Proveedor eliminado." o que se desactivó porque
//   tenía pedidos (HU-020, CA-020.3).
export async function deleteSupplier(id: string): Promise<string> {
  const res = await apiClient.delete<{ message: string }>(`/suppliers/${id}`);
  return res.data.message;
}
