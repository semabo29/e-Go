module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    '<rootDir>/app/login.tsx',
    '<rootDir>/**/payments.tsx',
    '<rootDir>/i18n/i18n.ts',
    '<rootDir>/i18n/I18nLocaleHydrator.tsx',
    '<rootDir>/components/LanguageMenuSelector.tsx',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '\\.test\\.'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-router|@expo-google-fonts/.*)',
  ],

  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'constants/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/_layout.tsx',
    '!app/_components/MapWrapper.web.tsx',
  ],

  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage/jest',

  coverageThreshold: {
    global: {
      branches: 75,
      lines: 80,
      statements: 80,
    },
  },
};
