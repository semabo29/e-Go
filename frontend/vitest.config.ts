import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['features/**/*.test.ts'],
    exclude: ['tests/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage/vitest',
      include: [
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'services/**/*.{ts,tsx}',
        'constants/**/*.{ts,tsx}',
        'utils/**/*.{ts,tsx}',
        'contexts/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'i18n/**/*.{ts,tsx}',
        'features/**/*.{ts,tsx}',
        'screens/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.test.*',
        '**/node_modules/**',
        '**/dist/**',
        'app/_components/MapWrapper.web.tsx',
      ],
    },
  },
});
