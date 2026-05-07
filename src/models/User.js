// src/models/User.js
// ═══════════════════════════════════════════════════════════════
// User Model — Prisma-backed data access layer with auth support
// Conforms to prisma/schema.prisma User model
// ═══════════════════════════════════════════════════════════════

import { getPrismaClient } from '../config/database.js';
import bcrypt from 'bcryptjs';
import { EMAIL_REGEX, BCRYPT_SALT_ROUNDS } from '../types/index.js';

/**
 * Validates user registration input.
 * @param {{ email: string, password: string, name?: string }} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateRegister = (data) => {
  const errors = [];

  if (!data.email || typeof data.email !== 'string' || data.email.trim() === '') {
    errors.push('Email address must not be empty.');
  } else if (!EMAIL_REGEX.test(data.email.trim())) {
    errors.push('Email address must be in a valid email format.');
  }

  if (!data.password || typeof data.password !== 'string' || data.password.trim() === '') {
    errors.push('Password must not be empty.');
  } else if (data.password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validates login credentials.
 * @param {{ email: string, password: string }} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateLogin = (data) => {
  const errors = [];

  if (!data.email || typeof data.email !== 'string' || data.email.trim() === '') {
    errors.push('Email address must not be empty.');
  } else if (!EMAIL_REGEX.test(data.email.trim())) {
    errors.push('Email address must be in a valid email format.');
  }

  if (!data.password || typeof data.password !== 'string' || data.password.trim() === '') {
    errors.push('Password must not be empty.');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Creates a new user with a hashed password.
 * @param {{ email: string, password: string, name?: string }} data
 * @returns {Promise<import('../types/index.js').SafeUser>}
 */
const create = async (data) => {
  const { valid, errors } = validateRegister(data);
  if (!valid) {
    const err = new Error('Validation failed: ' + errors.join(' '));
    err.validationErrors = errors;
    throw err;
  }

  const prisma = getPrismaClient();

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.trim().toLowerCase() },
  });

  if (existingUser) {
    // Generic error to avoid revealing whether email exists (security requirement)
    const err = new Error('Unable to create account. Please check your details and try again.');
    err.validationErrors = ['Registration failed. Please try again.'];
    throw err;
  }

  const hashedPassword = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: data.email.trim().toLowerCase(),
      password: hashedPassword,
      name: data.name ? data.name.trim() : null,
    },
  });

  return toSafeUser(user);
};

/**
 * Authenticates a user by email and password.
 * Returns null if credentials are invalid — does NOT reveal which field is wrong.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import('../types/index.js').SafeUser | null>}
 */
const authenticate = async (email, password) => {
  const { valid } = validateLogin({ email, password });
  if (!valid) {
    return null;
  }

  const prisma = getPrismaClient();

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) {
    // Perform a dummy hash comparison to prevent timing attacks
    await bcrypt.compare(password, '$2a$12$dummyhashtopreventtimingattacksXXXXXXXXXXXXXXXXXXXXXX');
    return null;
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return null;
  }

  return toSafeUser(user);
};

/**
 * Finds a user by ID.
 * @param {string} id
 * @returns {Promise<import('../types/index.js').SafeUser | null>}
 */
const findById = async (id) => {
  if (!id || typeof id !== 'string') {
    throw new Error('A valid user ID is required.');
  }
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? toSafeUser(user) : null;
};

/**
 * Finds a user by email.
 * @param {string} email
 * @returns {Promise<import('../types/index.js').SafeUser | null>}
 */
const findByEmail = async (email) => {
  if (!email || typeof email !== 'string' || email.trim() === '') {
    throw new Error('A valid email address is required.');
  }
  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  return user ? toSafeUser(user) : null;
};

/**
 * Strips the password field from a user record.
 * @param {object} user
 * @returns {import('../types/index.js').SafeUser}
 */
const toSafeUser = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
};

export const User = {
  create,
  authenticate,
  findById,
  findByEmail,
  validate: validateRegister,
  validateLogin,
  toSafeUser,
};