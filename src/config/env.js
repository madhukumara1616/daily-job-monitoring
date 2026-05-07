// ============================================================
// ENVIRONMENT CONFIGURATION — validated env variables
// ============================================================

require('dotenv').config();

/**
 * Reads and validates all required environment variables.
 * Throws a descriptive error at startup if any required
 * variable is missing or invalid.
 */
const loadEnv = () => {
  const missing = [];

  const get = (key, defaultValue) => {
    const value = process.env[key];
    if (value === undefined || value === '') {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      missing.push(key);
      return '';
    }
    return value;
  };

  const getInt = (key, defaultValue) => {
    const raw = process.env[key];
    if (raw === undefined || raw === '') {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      missing.push(key);
      return 0;
    }
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
      throw new Error(`[Env] Environment variable ${key} must be an integer, got: "${raw}"`);
    }
    return parsed;
  };

  const config = {
    NODE_ENV: get('NODE_ENV', 'development'),
    PORT: getInt('PORT', 3000),
    DATABASE_URL: get('DATABASE_URL'),
    JWT_SECRET: get('JWT_SECRET'),
    JWT_EXPIRES_IN: get('JWT_EXPIRES_IN', '7d'),
    CORS_ORIGIN: get('CORS_ORIGIN', 'http://localhost:3000'),
    BCRYPT_SALT_ROUNDS: getInt('BCRYPT_SALT_ROUNDS', 12),
  };

  if (missing.length > 0) {
    throw new Error(
      `[Env] Missing required environment variables:\n  ${missing.join('\n  ')}\n` +
      'Please copy .env.example to .env and fill in all required values.'
    );
  }

  if (!['development', 'production', 'test'].includes(config.NODE_ENV)) {
    throw new Error(
      `[Env] NODE_ENV must be one of: development, production, test. Got: "${config.NODE_ENV}"`
    );
  }

  if (config.NODE_ENV === 'production' && config.JWT_SECRET.length < 32) {
    throw new Error(
      '[Env] JWT_SECRET must be at least 32 characters long in production.'
    );
  }

  return config;
};

const env = loadEnv();

module.exports = { env };