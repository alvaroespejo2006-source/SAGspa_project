/**
 * Archivo: app.ts
 * Descripción: Configuración de la aplicación Express con middlewares globales y rutas.
 * ¿Para qué? Centralizar toda la configuración de Express en un lugar, separado del
 *   punto de entrada (index.ts), facilitando los tests de integración.
 * ¿Impacto? Este archivo determina qué middlewares protegen la app y cómo se organizan
 *   las rutas. Un error aquí afecta a toda la aplicación.
 */

import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { config } from './config.js';
import authRouter from './modules/auth/auth.router.js';
import usersRouter from './modules/users/users.router.js';
import staffRouter from './modules/staff/staff.router.js';
import petsRouter from './modules/pets/pets.router.js';
import servicesRouter from './modules/services/services.router.js';
import pricingRouter from './modules/pricing/pricing.router.js';
import appointmentsRouter, { staffAgendaRouter } from './modules/appointments/appointments.router.js';
import {
  clientRouter as symptomReportsClientRouter,
  staffRouter as symptomReportsStaffRouter,
} from './modules/symptom-reports/symptom-reports.router.js';
import emergencyInfoRouter from './modules/emergency-info/emergency-info.router.js';
import productsRouter from './modules/products/products.router.js';
import { clientRouter as ordersClientRouter, staffRouter as ordersStaffRouter } from './modules/orders/orders.router.js';
import suppliersRouter from './modules/suppliers/suppliers.router.js';
import supplierOrdersRouter from './modules/supplier-orders/supplier-orders.router.js';
import salesRouter, { salesReportRouter } from './modules/sales/sales.router.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app: Application = express();

// ¿Qué? helmet configura automáticamente headers de seguridad HTTP.
// ¿Para qué? Proteger contra ataques comunes: clickjacking, MIME sniffing, XSS.
// ¿Impacto? Sin helmet, la app expone headers por defecto que revelan info del servidor.
app.use(helmet());

// ¿Qué? CORS — controla qué orígenes pueden hacer requests a esta API.
// ¿Para qué? Permitir que el frontend en localhost:5173 (o producción) acceda a la API.
// ¿Impacto? Sin CORS correcto, el browser bloquea todas las requests del frontend.
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
}));

// ¿Qué? Parsing de body JSON en todos los requests.
// ¿Para qué? Express necesita este middleware para leer req.body en POST/PUT.
app.use(express.json());

// ¿Qué? Rate limiting en endpoints de autenticación.
// ¿Para qué? Prevenir ataques de fuerza bruta en login, registro y recuperación.
// ¿Impacto? Sin rate limit, un atacante puede probar miles de contraseñas por segundo.
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  // ¿Qué? En entorno de tests se deshabilita el rate limit para evitar 429
  // por la ráfaga de peticiones que genera el suite de tests.
  // ¿Impacto? No afecta producción — NODE_ENV=test solo lo setea Vitest.
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  // ¿Qué? Mismo formato { success, error } que el errorHandler, y mensaje en español.
  // ¿Para qué? El frontend (toApiError) lee error.message y lo muestra tal cual al usuario
  //   en el login (RN-027 de RF-002).
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.',
    },
  },
});

// ¿Qué? Health check — endpoint para verificar que el servidor está activo.
// ¿Para qué? Permitir que herramientas de monitoreo y Docker verifiquen la salud del servicio.
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ¿Qué? Registrar los routers bajo el prefijo /api/v1/.
// ¿Para qué? Versionar la API — permitir futuros cambios sin romper clientes v1.
// ¿Impacto? El rate limit solo aplica a auth para no penalizar otras rutas.
app.use('/api/v1/auth', authRateLimit, authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/staff', staffRouter);
app.use('/api/v1/pets', petsRouter);
app.use('/api/v1/services', servicesRouter);
app.use('/api/v1/pricing', pricingRouter);
app.use('/api/v1/appointments', appointmentsRouter);
app.use('/api/v1/symptom-reports', symptomReportsClientRouter);
app.use('/api/v1/staff/symptom-reports', symptomReportsStaffRouter);
app.use('/api/v1/emergency-info', emergencyInfoRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/orders', ordersClientRouter);
app.use('/api/v1/staff/orders', ordersStaffRouter);
app.use('/api/v1/staff/agenda', staffAgendaRouter);
app.use('/api/v1/suppliers', suppliersRouter);
app.use('/api/v1/supplier-orders', supplierOrdersRouter);
app.use('/api/v1/sales', salesRouter);
app.use('/api/v1/staff/sales-report', salesReportRouter);

// ¿Qué? Middleware global de errores — debe registrarse AL FINAL, después de las rutas.
// ¿Para qué? Capturar todos los errores lanzados en controllers y services.
// ¿Impacto? Sin este middleware, Express usa su handler por defecto que expone stack traces.
app.use(errorHandler);

export default app;
