/**
 * Archivo: modules/orders/orders.controller.ts
 * Descripción: Handlers HTTP para el carrito y los pedidos de productos (RF-016, RF-019).
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as ordersService from './orders.service.js';
import { ValidationError } from '../../middlewares/error.middleware.js';
import type { CreateOrderInput, UpdateOrderStatusInput } from './orders.schema.js';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await ordersService.createOrder(req.user!.id, req.body as CreateOrderInput);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orders = await ordersService.listMyOrders(req.user!.id);
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

// ¿Qué? `?status=pending|completed|cancelled` — por defecto, pendientes (HU-019).
const statusQuerySchema = z
  .enum(['pending', 'completed', 'cancelled'], {
    errorMap: () => ({ message: "El estado debe ser 'pending', 'completed' o 'cancelled'." }),
  })
  .default('pending');

export async function listPending(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = statusQuerySchema.safeParse(req.query.status);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0]!.message);
    }
    const orders = await ordersService.listOrdersByStatus(parsed.data);
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const order = await ordersService.updateOrderStatus(
      req.params.id as string,
      req.body as UpdateOrderStatusInput,
    );
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}
