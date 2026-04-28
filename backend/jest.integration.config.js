module.exports = {
  // Integration tests run in Node (no browser-like jsdom required).
  testEnvironment: 'node',
  // Only pick tests inside tests/integration.
  testMatch: ['**/tests/integration/**/*.test.js'],
  // Shared setup for env loading and test runtime flags.
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js'],
};
