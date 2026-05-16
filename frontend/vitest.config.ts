import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __DEV__: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['features/**/*.test.ts'],
    exclude: ['tests/**', 'node_modules/**', '**/*.testHelpers.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage/vitest',
      // Vitest només executa tests a features/; el global del frontend el marca Jest.
      include: ['features/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.*',
        '**/*.testHelpers.ts',
        '**/node_modules/**',
        '**/dist/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
