/**
 * Archivo: api/products.ts
 * Descripción: Llamadas HTTP para el catálogo de productos (RF-015).
 */

import { apiClient } from './axios';
import type { ApiResponse } from '@/types/auth';
import type { CreateProductRequest, Product, UpdateProductRequest } from '@/types/products';

// ¿Qué? Catálogo público — siempre solo productos activos.
export async function listProducts(): Promise<Product[]> {
  const res = await apiClient.get<ApiResponse<Product[]>>('/products');
  return res.data.data;
}

// ¿Qué? Catálogo completo para el staff, incluye inactivos.
export async function listProductsForStaff(activeOnly = true): Promise<Product[]> {
  const res = await apiClient.get<ApiResponse<Product[]>>('/products/staff', {
    params: { active: activeOnly },
  });
  return res.data.data;
}

export async function createProduct(data: CreateProductRequest): Promise<Product> {
  const res = await apiClient.post<ApiResponse<Product>>('/products', data);
  return res.data.data;
}

export async function updateProduct(id: string, data: UpdateProductRequest): Promise<Product> {
  const res = await apiClient.put<ApiResponse<Product>>(`/products/${id}`, data);
  return res.data.data;
}

// ¿Qué? Devuelve el mensaje del backend: "Producto eliminado." o que se desactivó porque
//   tenía pedidos o ventas (HU-015).
export async function deleteProduct(id: string): Promise<string> {
  const res = await apiClient.delete<{ message: string }>(`/products/${id}`);
  return res.data.message;
}
