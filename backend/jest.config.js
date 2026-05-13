module.exports = {
  testEnvironment: 'node',

  // Cobertura: quins fitxers s'han d'instrumentar
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

  // Reports que es generen quan es passa --coverage
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',

  // Llindars mínims: si no s'arriben, jest --coverage falla
  coverageThreshold: {
    global: {
      branches: 75,
      lines: 80,
      statements: 80,
    },
  },
};
