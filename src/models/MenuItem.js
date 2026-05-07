// src/models/MenuItem.js
// ═══════════════════════════════════════════════════════════════
// MenuItem Model — Prisma-backed data access layer
// Conforms to prisma/schema.prisma MenuItem model
// ═══════════════════════════════════════════════════════════════

import { getPrismaClient } from '../config/database.js';

/**
 * Validates a raw menu item object.
 * @param {object} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateMenuItem = (data) => {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('Food item name must be a non-empty string.');
  }

  if (data.price === undefined || data.price === null) {
    errors.push('Food item price is required.');
  } else {
    const price = parseFloat(data.price);
    if (isNaN(price) || price < 0) {
      errors.push('Food item price must be a non-negative number.');
    }
  }

  if (!data.imageUrl || typeof data.imageUrl !== 'string' || data.imageUrl.trim() === '') {
    errors.push('Food item image URL must be a non-empty string.');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Retrieves all menu items.
 * @returns {Promise<import('../types/index.js').MenuItem[]>}
 */
const findAll = async () => {
  const prisma = getPrismaClient();
  return prisma.menuItem.findMany({
    orderBy: { createdAt: 'asc' },
  });
};

/**
 * Retrieves a single menu item by ID.
 * @param {string} id
 * @returns {Promise<import('../types/index.js').MenuItem | null>}
 */
const findById = async (id) => {
  if (!id || typeof id !== 'string') {
    throw new Error('A valid menu item ID is required.');
  }
  const prisma = getPrismaClient();
  return prisma.menuItem.findUnique({ where: { id } });
};

/**
 * Creates a new menu item after validation.
 * @param {import('../types/index.js').CreateMenuItemInput} data
 * @returns {Promise<import('../types/index.js').MenuItem>}
 */
const create = async (data) => {
  const { valid, errors } = validateMenuItem(data);
  if (!valid) {
    const err = new Error('Validation failed: ' + errors.join(' '));
    err.validationErrors = errors;
    throw err;
  }

  const prisma = getPrismaClient();
  return prisma.menuItem.create({
    data: {
      name: data.name.trim(),
      price: parseFloat(data.price),
      imageUrl: data.imageUrl.trim(),
      description: data.description ? data.description.trim() : null,
      category: data.category ? data.category.trim() : null,
    },
  });
};

/**
 * Updates an existing menu item.
 * @param {string} id
 * @param {Partial<import('../types/index.js').CreateMenuItemInput>} data
 * @returns {Promise<import('../types/index.js').MenuItem>}
 */
const update = async (id, data) => {
  if (!id || typeof id !== 'string') {
    throw new Error('A valid menu item ID is required.');
  }

  const updateData = {};

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim() === '') {
      throw new Error('Food item name must be a non-empty string.');
    }
    updateData.name = data.name.trim();
  }

  if (data.price !== undefined) {
    const price = parseFloat(data.price);
    if (isNaN(price) || price < 0) {
      throw new Error('Food item price must be a non-negative number.');
    }
    updateData.price = price;
  }

  if (data.imageUrl !== undefined) {
    if (typeof data.imageUrl !== 'string' || data.imageUrl.trim() === '') {
      throw new Error('Food item image URL must be a non-empty string.');
    }
    updateData.imageUrl = data.imageUrl.trim();
  }

  if (data.description !== undefined) {
    updateData.description = data.description ? data.description.trim() : null;
  }

  if (data.category !== undefined) {
    updateData.category = data.category ? data.category.trim() : null;
  }

  const prisma = getPrismaClient();
  return prisma.menuItem.update({ where: { id }, data: updateData });
};

/**
 * Deletes a menu item by ID.
 * @param {string} id
 * @returns {Promise<import('../types/index.js').MenuItem>}
 */
const remove = async (id) => {
  if (!id || typeof id !== 'string') {
    throw new Error('A valid menu item ID is required.');
  }
  const prisma = getPrismaClient();
  return prisma.menuItem.delete({ where: { id } });
};

/**
 * Checks whether a menu item with the given ID exists.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
const exists = async (id) => {
  const item = await findById(id);
  return item !== null;
};

export const MenuItem = {
  findAll,
  findById,
  create,
  update,
  remove,
  exists,
  validate: validateMenuItem,
};