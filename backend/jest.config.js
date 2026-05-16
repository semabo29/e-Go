/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  collectCoverageFrom: [
    'controllers/authController.js',
    'controllers/subscriptionController.js',
    'controllers/stripeWebhookController.js',
    'controllers/userController.js',
    'services/authService.js',
    'services/userService.js',
    'routes/auth.js',
    'routes/subscription.js',
    'routes/users.js',
    'models/userModel.js',
    'models/subscriptionModel.js',
    'lib/authHelpers.js',
    'lib/stripe.js',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};
