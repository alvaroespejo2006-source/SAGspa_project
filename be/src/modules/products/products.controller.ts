/**
 * Archivo: modules/products/products.controller.ts
 * Descripción: Handlers HTTP para el catálogo de productos (RF-015).
 */

import type { Request, Response, NextFunction } from 'express';
import * as productsService from './products.service.js';
import type { CreateProductInput, UpdateProductInput } from './products.schema.js';

// ¿Qué? Catálogo público — siempre solo productos activos.
export async function listPublic(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const products = await productsService.listProducts(true);
    res.status(200).json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

// ¿Qué? Catálogo completo para el staff — incluye inactivos si se pide `?active=false`.
export async function listForStaff(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const activeOnly = req.query.active !== 'false';
    const products = await productsService.listProducts(activeOnly);
    res.status(200).json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await productsService.createProduct(req.body as CreateProductInput);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await productsService.updateProduct(
      req.params.id as string,
      req.body as UpdateProductInput,
    );
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await productsService.deleteProduct(req.params.id as string);
    // ¿Qué? Mensaje que explica qué pasó (HU-015, igual que servicios en HU-014).
    res.status(200).json({
      success: true,
      message: result.softDeleted
        ? 'El producto tiene pedidos o ventas asociadas, así que se desactivó en lugar de eliminarse.'
        : 'Producto eliminado.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
