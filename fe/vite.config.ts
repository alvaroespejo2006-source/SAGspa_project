/**
 * Archivo: vite.config.ts
 * Descripción: Configuración de Vite para el frontend React + TypeScript.
 * ¿Para qué? Configurar el bundler, plugins, alias de rutas y el test runner Vitest.
 * ¿Impacto? Un alias mal configurado rompe todos los imports con "@/";
 *   un setup de tests incorrecto hace que los tests no encuentren las utilidades de DOM.
 */

/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [
    // ¿Qué? Plugin oficial de React para Vite (Fast Refresh + JSX transform).
    react(),
    // ¿Qué? Plugin oficial de TailwindCSS v4 para Vite.
    // ¿Para qué? Procesar las directivas de Tailwind directamente en el pipeline de Vite.
    tailwindcss(),
  ],

  resolve: {
    alias: {
      // ¿Qué? Alias "@/" apunta a "src/".
      // ¿Para qué? Imports limpios sin "../../../" — siempre "@/components/ui/Button".
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  test: {
    // ¿Qué? Simular el DOM del navegador con jsdom para tests de componentes React.
    environment: 'jsdom',

    // ¿Qué? Archivo que se ejecuta antes de cada suite de tests.
    // ¿Para qué? Cargar @testing-library/jest-dom para tener matchers como toBeInTheDocument.
    setupFiles: ['./src/__tests__/setup.ts'],

    // ¿Qué? Variables globales de vitest (describe, it, expect) sin importar.
    globals: true,

    // ¿Qué? Hasta 15 s por test (el valor por defecto de Vitest es 5 s), igual que el backend.
    // ¿Para qué? Las pruebas de pantallas con varios pasos (buscar, elegir, llenar y enviar)
    //   tardan 1–2 s solas, pero con la máquina ocupada a veces pasaban de 5 s y fallaban por
    //   tiempo, no por lógica (pasó con StaffPetsPage al correr la suite junto al backend).
    testTimeout: 15_000,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/__tests__/**', 'src/types/**', 'src/main.tsx'],
      thresholds: {
        lines: 70,
        functions: 70,
      },
    },
  },
});

