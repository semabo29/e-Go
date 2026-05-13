import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['features/**/*.test.ts'],
    exclude: ['tests/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['features/**', 'components/**', 'services/**', 'hooks/**'],
      exclude: ['**/*.test.*', '**/node_modules/**', '**/dist/**'],
    },
  },
});
