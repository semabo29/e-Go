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
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@react-navigation|expo-router|@expo-google-fonts/.*)',
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
    '!i18n/locales/**',
    '!app/_components/MapWrapper.web.tsx',
    '!app/_layout.tsx',
    '!app/(tabs)/_layout.tsx',
    '!components/stations/types.ts',
    '!components/ui/collapsible.tsx',
    '!components/ui/icon-symbol.ios.tsx',
    '!components/ui/icon-symbol.tsx',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    String.raw`\.test\.`,
    String.raw`MapWrapper\.web\.tsx`,
    String.raw`app/_layout\.tsx`,
    String.raw`app/\(tabs\)/_layout\.tsx`,
    String.raw`components/stations/types\.ts`,
    String.raw`components/ui/collapsible\.tsx`,
    String.raw`components/ui/icon-symbol`,
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage/jest',
  // Llindars alineats amb backend excepte functions (no s'exigeix mínim al frontend).
  coverageThreshold: {
    global: {
      branches: 75,
      lines: 80,
      statements: 80,
    },
  },
};
