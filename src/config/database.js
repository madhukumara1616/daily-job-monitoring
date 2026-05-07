// ============================================================
// DATABASE CONFIGURATION — Prisma Client singleton
// ============================================================

const { PrismaClient } = require('@prisma/client');
const { env } = require('./env');

let prisma;

/**
 * Returns a singleton PrismaClient instance.
 * In development, reuses the global instance to avoid
 * exhausting database connections during hot-reloads.
 */
const getDatabase = () => {
  if (prisma) {
    return prisma;
  }

  if (env.NODE_ENV === 'production') {
    prisma = new PrismaClient({
      log: ['error', 'warn'],
      errorFormat: 'minimal',
    });
  } else {
    // In non-production environments reuse the global instance
    if (!global.__prisma) {
      global.__prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
        errorFormat: 'pretty',
      });
    }
    prisma = global.__prisma;
  }

  return prisma;
};

/**
 * Connects to the database.
 * Call this once during application startup.
 */
const connectDatabase = async () => {
  const db = getDatabase();
  try {
    await db.$connect();
    console.log('[Database] Connected successfully');
  } catch (error) {
    console.error('[Database] Connection failed:', error.message);
    process.exit(1);
  }
};

/**
 * Disconnects from the database.
 * Call this during graceful shutdown.
 */
const disconnectDatabase = async () => {
  const db = getDatabase();
  try {
    await db.$disconnect();
    console.log('[Database] Disconnected successfully');
  } catch (error) {
    console.error('[Database] Disconnection error:', error.message);
  }
};

module.exports = {
  getDatabase,
  connectDatabase,
  disconnectDatabase,
};