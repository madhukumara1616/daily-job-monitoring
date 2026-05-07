// src/models/Order.js
// ═══════════════════════════════════════════════════════════════
// Order Model — Prisma-backed data access layer
// Conforms to prisma/schema.prisma Order model and OrderStatus enum
// ═══════════════════════════════════════════════════════════════

import { getPrismaClient } from '../config/database.js';
import { ORDER_STATUS } from '../types/index.js';

/**
 * Validates order creation input.
 * @param {{ userId: string, cartItems: import('../types/index.js').CartItem[] }} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateCreateOrder = (data) => {
  const errors = [];

  if (!data.userId || typeof data.userId !== 'string' || data.userId.trim() === '') {
    errors.push('A valid user ID is required to place an order.');
  }

  if (!Array.isArray(data.cartItems) || data.cartItems.length === 0) {
    errors.push('An order must contain at least one item.');
  } else {
    data.cartItems.forEach((item, idx) => {
      if (!item.menuItemId || typeof item.menuItemId !== 'string') {
        errors.push(`Cart item at index ${idx} has an invalid menu item ID.`);
      }
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty < 1) {
        errors.push(`Cart item at index ${idx} must have a quantity of at least 1.`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validates an order status transition.
 * @param {string} status
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateStatus = (status) => {
  const errors = [];
  const validStatuses = Object.values(ORDER_STATUS);
  if (!validStatuses.includes(status)) {
    errors.push(`Order status must be one of: ${validStatuses.join(', ')}.`);
  }
  return { valid: errors.length === 0, errors };
};

/**
 * Creates a new order from the current cart.
 * @param {string} userId
 * @param {import('../types/index.js').CartItem[]} cartItems
 * @returns {Promise<import('../types/index.js').Order>}
 */
const create = async (userId, cartItems) => {
  const { valid, errors } = validateCreateOrder({ userId, cartItems });
  if (!valid) {
    const err = new Error('Validation failed: ' + errors.join(' '));
    err.validationErrors = errors;
    throw err;
  }

  const prisma = getPrismaClient();

  const orderItems = cartItems.map((item) => ({
    menuItemId: item.menuItemId,
    quantity: parseInt(item.quantity, 10),
    unitPrice: item.menuItem ? parseFloat(item.menuItem.price) : 0,
  }));

  const totalAmount = orderItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  return prisma.order.create({
    data: {
      userId,
      status: ORDER_STATUS.PLACED,
      totalAmount,
      orderItems: {
        create: orderItems,
      },
    },
    include: {
      orderItems: {
        include: { menuItem: true },
      },
    },
  });
};

/**
 * Retrieves all orders for a given user.
 * @param {string} userId
 * @returns {Promise<import('../types/index.js').Order[]>}
 */
const findByUserId = async (userId) => {
  if (!userId || typeof userId !== 'string') {
    throw new Error('A valid user ID is required.');
  }
  const prisma = getPrismaClient();
  return prisma.order.findMany({
    where: { userId },
    include: {
      orderItems: {
        include: { menuItem: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Retrieves a single order by ID.
 * @param {string} id
 * @returns {Promise<import('../types/index.js').Order | null>}
 */
const findById = async (id) => {
  if (!id || typeof id !== 'string') {
    throw new Error('A valid order ID is required.');
  }
  const prisma = getPrismaClient();
  return prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: {
        include: { menuItem: true },
      },
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });
};

/**
 * Updates the status of an order.
 * @param {string} id
 * @param {import('../types/index.js').OrderStatus} status
 * @returns {Promise<import('../types/index.js').Order>}
 */
const updateStatus = async (id, status) => {
  if (!id || typeof id !== 'string') {
    throw new Error('A valid order ID is required.');
  }

  const { valid, errors } = validateStatus(status);
  if (!valid) {
    const err = new Error('Validation failed: ' + errors.join(' '));
    err.validationErrors = errors;
    throw err;
  }

  const prisma = getPrismaClient();
  return prisma.order.update({
    where: { id },
    data: { status },
    include: {
      orderItems: {
        include: { menuItem: true },
      },
    },
  });
};

/**
 * Retrieves all orders (admin use).
 * @returns {Promise<import('../types/index.js').Order[]>}
 */
const findAll = async () => {
  const prisma = getPrismaClient();
  return prisma.order.findMany({
    include: {
      orderItems: {
        include: { menuItem: true },
      },
      user: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const Order = {
  create,
  findByUserId,
  findById,
  findAll,
  updateStatus,
  validate: validateCreateOrder,
  validateStatus,
};