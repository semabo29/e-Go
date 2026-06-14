/** Configuració Jest per a proves de rendiment (time behaviour / capacity). */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/performance/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js'],
  testTimeout: 90_000,
};
