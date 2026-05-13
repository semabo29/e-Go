import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['features/**/*.test.ts'],
    exclude: ['tests/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage/vitest',
      include: ['features/**'],
      exclude: ['**/*.test.*', '**/node_modules/**', '**/dist/**'],
      thresholds: {
        branches: 75,
        lines: 80,
        statements: 80,
      },
    },
  },
});
