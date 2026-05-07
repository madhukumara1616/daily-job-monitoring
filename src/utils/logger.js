'use strict';

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Determine log level from environment
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Custom log format for console output
const consoleFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, service, ...meta }) => {
    const svc = service ? `[${service}] ` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${svc}${message}${metaStr}`;
  })
);

// Custom log format for file output
const fileFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.json()
);

// Build transports array
const loggerTransports = [
  new transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 10 * 1024 * 1024, // 10 MB
    maxFiles: 5,
    tailable: true,
  }),
  new transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: fileFormat,
    maxsize: 10 * 1024 * 1024, // 10 MB
    maxFiles: 10,
    tailable: true,
  }),
];

// Add console transport in non-production environments
if (process.env.NODE_ENV !== 'production') {
  loggerTransports.push(
    new transports.Console({
      format: consoleFormat,
    })
  );
}

// Create the base logger
const logger = createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'food-ordering-app' },
  transports: loggerTransports,
  exitOnError: false,
});

/**
 * Creates a child logger with a specific module/context label.
 * @param {string} moduleName - The name of the module using this logger.
 * @returns {import('winston').Logger} A child logger instance.
 */
const createModuleLogger = (moduleName) => {
  return logger.child({ module: moduleName });
};

/**
 * Logs an HTTP request in a structured format.
 * Intended for use as Express middleware or manual call.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {number} responseTime - Response time in milliseconds.
 */
const logHttpRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent') || 'unknown',
    userId: req.user ? req.user.id : null,
  };

  if (res.statusCode >= 500) {
    logger.error('HTTP Request', logData);
  } else if (res.statusCode >= 400) {
    logger.warn('HTTP Request', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

/**
 * Logs an application error with optional context metadata.
 * @param {Error} error - The error object.
 * @param {object} [context={}] - Additional context metadata.
 */
const logError = (error, context = {}) => {
  logger.error(error.message, {
    stack: error.stack,
    name: error.name,
    code: error.code || null,
    ...context,
  });
};

/**
 * Logs a database operation.
 * @param {string} operation - The database operation name (e.g., 'findMany', 'create').
 * @param {string} model - The Prisma model name.
 * @param {number} durationMs - Duration of the operation in milliseconds.
 * @param {object} [meta={}] - Additional metadata.
 */
const logDbOperation = (operation, model, durationMs, meta = {}) => {
  logger.debug('Database operation', {
    operation,
    model,
    durationMs,
    ...meta,
  });
};

/**
 * Logs an authentication event.
 * @param {string} event - The auth event type (e.g., 'login', 'logout', 'register').
 * @param {string|null} userId - The user ID involved, or null if not yet known.
 * @param {boolean} success - Whether the event was successful.
 * @param {object} [meta={}] - Additional metadata.
 */
const logAuthEvent = (event, userId, success, meta = {}) => {
  const level = success ? 'info' : 'warn';
  logger[level](`Auth event: ${event}`, {
    event,
    userId,
    success,
    ...meta,
  });
};

module.exports = {
  logger,
  createModuleLogger,
  logHttpRequest,
  logError,
  logDbOperation,
  logAuthEvent,
};