/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],

  collectCoverageFrom: [
    'controllers/**/*.{js,jsx}',
    'services/**/*.{js,jsx}',
    'models/**/*.{js,jsx}',
    'routes/**/*.{js,jsx}',
    'middleware/**/*.{js,jsx}',
    'lib/**/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!**/scripts/**',
    '!**/sql/**',
    '!index.js',
    '!index.jsx',
  ],

  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',

  coverageThreshold: {
    global: {
      branches: 75,
      lines: 80,
      statements: 80,
      functions: 80,
    },
  },
};
