'use strict';

/**
 * Central error-handling middleware for the food-ordering-web-application.
 *
 * Responsibilities:
 *  - Normalise every thrown value into a consistent JSON error shape.
 *  - Map well-known error types / status codes to appropriate HTTP responses.
 *  - Never leak stack traces or internal details to the client in production.
 *  - Log full error details server-side for observability.
 *
 * Usage (in app.js / server.js — register AFTER all routes):
 *   app.use(errorHandler);
 */

const { NODE_ENV } = process.env;

// ---------------------------------------------------------------------------
// Known application error codes and their default HTTP status mappings
// ---------------------------------------------------------------------------
const ERROR_CODE_MAP = {
  // Auth
  INVALID_CREDENTIALS:      401,
  UNAUTHORIZED:             401,
  FORBIDDEN:                403,
  TOKEN_EXPIRED:            401,
  TOKEN_INVALID:            401,

  // Resources
  NOT_FOUND:                404,
  MENU_ITEM_NOT_FOUND:      404,
  CART_ITEM_NOT_FOUND:      404,
  ORDER_NOT_FOUND:          404,
  USER_NOT_FOUND:           404,

  // Validation
  VALIDATION_ERROR:         422,
  INVALID_QUANTITY:         422,
  INVALID_EMAIL:            422,
  EMPTY_CART:               422,

  // Conflict
  EMAIL_ALREADY_EXISTS:     409,
  DUPLICATE_ENTRY:          409,

  // Server
  INTERNAL_SERVER_ERROR:    500,
  DATABASE_ERROR:           500,
};

// ---------------------------------------------------------------------------
// Helper — derive a numeric HTTP status from whatever was thrown
// ---------------------------------------------------------------------------
const resolveStatus = (err) => {
  // Explicit status set on the error object
  if (err.status && Number.isInteger(err.status) && err.status >= 100 && err.status < 600) {
    return err.status;
  }
  if (err.statusCode && Number.isInteger(err.statusCode) && err.statusCode >= 100 && err.statusCode < 600) {
    return err.statusCode;
  }

  // Application error code lookup
  if (err.code && ERROR_CODE_MAP[err.code] !== undefined) {
    return ERROR_CODE_MAP[err.code];
  }

  // Prisma / database error codes
  if (err.code === 'P2002') return 409; // Unique constraint violation
  if (err.code === 'P2025') return 404; // Record not found
  if (err.code === 'P2003') return 422; // Foreign key constraint
  if (err.code === 'P2000') return 422; // Value too long

  // JWT errors
  if (err.name === 'JsonWebTokenError')  return 401;
  if (err.name === 'TokenExpiredError')  return 401;
  if (err.name === 'NotBeforeError')     return 401;

  // Syntax errors in request body (e.g. malformed JSON)
  if (err instanceof SyntaxError && err.status === 400) return 400;

  return 500;
};

// ---------------------------------------------------------------------------
// Helper — derive a human-readable message safe to send to the client
// ---------------------------------------------------------------------------
const resolveMessage = (err, status) => {
  // For auth failures always return a generic message to prevent user enumeration
  if (status === 401) {
    // Only override if the error is credential-related
    if (
      err.code === 'INVALID_CREDENTIALS' ||
      err.code === 'USER_NOT_FOUND' ||
      err.name === 'JsonWebTokenError' ||
      err.name === 'TokenExpiredError' ||
      err.name === 'NotBeforeError'
    ) {
      return 'Invalid email address or password.';
    }
    return err.message || 'Authentication required.';
  }

  if (status === 403) return err.message || 'You do not have permission to perform this action.';
  if (status === 404) return err.message || 'The requested resource was not found.';
  if (status === 409) return err.message || 'A conflict occurred with the current state of the resource.';
  if (status === 422) return err.message || 'The provided data is invalid.';

  // In production never expose internal error messages for 5xx
  if (status >= 500 && NODE_ENV === 'production') {
    return 'An unexpected error occurred. Please try again later.';
  }

  return err.message || 'An unexpected error occurred.';
};

// ---------------------------------------------------------------------------
// Helper — build the validation errors array when present
// ---------------------------------------------------------------------------
const resolveValidationErrors = (err) => {
  if (!err.errors) return undefined;

  // Express-validator style: array of { param, msg, ... }
  if (Array.isArray(err.errors)) {
    return err.errors.map((e) => ({
      field:   e.param  || e.path  || e.field || 'unknown',
      message: e.msg    || e.message || 'Invalid value',
    }));
  }

  // Joi / Yup style: object keyed by field name
  if (typeof err.errors === 'object') {
    return Object.entries(err.errors).map(([field, message]) => ({
      field,
      message: typeof message === 'string' ? message : String(message),
    }));
  }

  return undefined;
};

// ---------------------------------------------------------------------------
// Helper — server-side logging
// ---------------------------------------------------------------------------
const logError = (err, req, status) => {
  const timestamp = new Date().toISOString();
  const method    = req.method  || 'UNKNOWN';
  const url       = req.originalUrl || req.url || '/';
  const userId    = (req.user && req.user.id) ? req.user.id : 'anonymous';

  if (status >= 500) {
    console.error(
      `[${timestamp}] ERROR ${status} | ${method} ${url} | user=${userId} | ${err.message}`,
      NODE_ENV !== 'production' ? err.stack : ''
    );
  } else {
    console.warn(
      `[${timestamp}] WARN  ${status} | ${method} ${url} | user=${userId} | ${err.message}`
    );
  }
};

// ---------------------------------------------------------------------------
// 404 handler — register BEFORE errorHandler, AFTER all routes
// ---------------------------------------------------------------------------
const notFoundHandler = (req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  next(err);
};

// ---------------------------------------------------------------------------
// Central error handler — must have exactly 4 parameters so Express
// recognises it as an error-handling middleware.
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status           = resolveStatus(err);
  const message          = resolveMessage(err, status);
  const validationErrors = resolveValidationErrors(err);

  logError(err, req, status);

  const responseBody = {
    success: false,
    error: {
      status,
      code:    err.code    || 'ERROR',
      message,
    },
  };

  // Attach field-level validation errors when available
  if (validationErrors && validationErrors.length > 0) {
    responseBody.error.validationErrors = validationErrors;
  }

  // Attach stack trace in non-production environments for easier debugging
  if (NODE_ENV !== 'production' && err.stack) {
    responseBody.error.stack = err.stack;
  }

  res.status(status).json(responseBody);
};

// ---------------------------------------------------------------------------
// Factory — create a typed application error with an optional HTTP status
// and application error code.  Use this throughout the service / controller
// layers instead of plain Error objects.
//
 // Example:
 //   throw createError(404, 'Menu item not found', 'MENU_ITEM_NOT_FOUND');
// ---------------------------------------------------------------------------
const createError = (status, message, code) => {
  const err    = new Error(message);
  err.status   = status;
  err.code     = code || 'ERROR';
  return err;
};

// ---------------------------------------------------------------------------
// Convenience factories for the most common error types
// ---------------------------------------------------------------------------
const createValidationError = (message, errors) => {
  const err    = new Error(message || 'Validation failed');
  err.status   = 422;
  err.code     = 'VALIDATION_ERROR';
  err.errors   = errors || [];
  return err;
};

const createNotFoundError = (resource) => {
  const label  = resource || 'Resource';
  const err    = new Error(`${label} not found`);
  err.status   = 404;
  err.code     = `${resource ? resource.toUpperCase().replace(/\s+/g, '_') : 'RESOURCE'}_NOT_FOUND`;
  return err;
};

const createUnauthorizedError = () => {
  // Generic message — never reveal whether email or password was wrong
  const err    = new Error('Invalid email address or password.');
  err.status   = 401;
  err.code     = 'INVALID_CREDENTIALS';
  return err;
};

const createForbiddenError = (message) => {
  const err    = new Error(message || 'You do not have permission to perform this action.');
  err.status   = 403;
  err.code     = 'FORBIDDEN';
  return err;
};

const createConflictError = (message, code) => {
  const err    = new Error(message || 'Conflict with current resource state.');
  err.status   = 409;
  err.code     = code || 'DUPLICATE_ENTRY';
  return err;
};

// ---------------------------------------------------------------------------
// Async route wrapper — eliminates try/catch boilerplate in controllers.
// Wraps an async Express route handler and forwards any rejection to next().
//
// Example:
//   router.get('/menu', asyncHandler(menuController.getAll));
// ---------------------------------------------------------------------------
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  createError,
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError,
  createConflictError,
  asyncHandler,
};