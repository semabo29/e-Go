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

  // Alcance acotado (Sonar / workflow coverage): solo módulos con tests dedicados.
  collectCoverageFrom: [
    'app/login.tsx',
    'app/**/payments.tsx',
    'i18n/i18n.ts',
    'i18n/I18nLocaleHydrator.tsx',
    'components/LanguageMenuSelector.tsx',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', String.raw`\.test\.`],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage/jest',
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 72,
      functions: 80,
      lines: 80,
    },
  },
};
