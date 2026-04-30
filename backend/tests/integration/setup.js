const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Prefer .env.integration for safer DB test isolation.
const envIntegration = path.resolve(__dirname, '../../.env.integration');
const envDefault = path.resolve(__dirname, '../../.env');

if (fs.existsSync(envIntegration)) {
  dotenv.config({ path: envIntegration });
} else if (fs.existsSync(envDefault)) {
  // Fallback for local environments where only .env exists.
  dotenv.config({ path: envDefault });
}

// Ensure app boot paths that depend on NODE_ENV use test mode.
process.env.NODE_ENV = 'test';
