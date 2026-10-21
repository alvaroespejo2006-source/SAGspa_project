/**
 * Archivo: vitest.config.ts
 * Descripción: Configuración de Vitest para los tests del backend.
 * ¿Para qué? Indicar a Vitest dónde están los archivos de setup, el entorno
 *   de ejecución (Node.js) y habilitar la cobertura de código.
 * ¿Impacto? Sin esta configuración Vitest no cargaría el setup.ts y los tests
 *   no tendrían la BD limpia entre ejecuciones.
 */

import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// ¿Qué? Carga .env.test ANTES de que cualquier test importe src/config.ts.
// ¿Para qué? Los tests deben correr contra una base de datos separada de la de
//   desarrollo — setup.ts borra tablas completas en cada test (beforeEach), y sin esto
//   corría contra la misma DATABASE_URL del .env de desarrollo, borrando datos reales
//   cada vez que alguien ejecutaba `pnpm test` (ya nos pasó una vez).
// ¿Impacto? override:true asegura que .env.test gane aunque el shell ya tenga
//   DATABASE_URL exportada desde otro .env cargado previamente.
dotenv.config({ path: '.env.test', override: true });

export default defineConfig({
  test: {
    // ¿Qué? Entorno de ejecución Node.js (no browser).
    // ¿Para qué? Los tests del backend usan APIs de Node — net, crypto, etc.
    environment: 'node',

    // ¿Qué? Ejecuta los archivos de test de a uno, nunca en paralelo.
    // ¿Para qué? Todos comparten la MISMA base de datos de tests y el setup la limpia
    //   entre cada test (beforeEach). Con archivos en paralelo, el `deleteMany` de un
    //   archivo borra los datos que otro está usando → fallos intermitentes.
    fileParallelism: false,

    // ¿Qué? Hasta 15 s por test (el valor por defecto de Vitest es 5 s).
    // ¿Para qué? Cada login/registro corre bcrypt con 12 rondas (~0,3–1 s según la máquina).
    //   Los tests de aceptación de HU-005 a HU-008 encadenan hasta 4 de esos hashes y, con la
    //   suite completa, a veces pasaban de 5 s y fallaban por tiempo, no por lógica.
    testTimeout: 15_000,

    // ¿Qué? Archivos que se ejecutan antes de cada suite de tests.
    // ¿Para qué? El setup.ts limpia la BD entre tests para garantizar aislamiento.
    setupFiles: ['./src/tests/setup.ts'],

    // ¿Qué? Archivos que vitest incluye como tests.
    include: ['src/**/*.test.ts'],

    // ¿Qué? Reporte de cobertura usando el provider v8 de Node.js.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // ¿Qué? Solo medir cobertura de código fuente, no de tests ni tipos.
      include: ['src/**/*.ts'],
      exclude: ['src/tests/**', 'src/types/**', 'src/**/*.d.ts'],
      // ¿Qué? Umbral mínimo de cobertura exigido por el proyecto (80%).
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
