/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.ts?(x)'],
  // Con --coverage los tests van más lentos; en CI hace falta margen extra.
  testTimeout: 30_000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-router|@expo-google-fonts/.*)',
  ],

  collectCoverageFrom: [
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
    '!**/*.test.{ts,tsx}',
    '!**/*.d.ts',
    '!app/_components/MapWrapper.web.tsx',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    String.raw`\.test\.`,
    String.raw`MapWrapper\.web\.tsx`,
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage/jest',
  // Mateixos límits que backend/jest.config.js
  coverageThreshold: {
    global: {
      branches: 75,
      lines: 80,
      statements: 80,
      functions: 80,
    },
  },
};
