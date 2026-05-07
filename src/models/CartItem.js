// src/models/CartItem.js
// ═══════════════════════════════════════════════════════════════
// CartItem Model — in-memory + session-backed cart logic
// Conforms to types defined in src/types/index.js
// ═══════════════════════════════════════════════════════════════

import { MenuItem } from './MenuItem.js';
import { CART_ITEM_MIN_QUANTITY } from '../types/index.js';

/**
 * Validates a cart item.
 * @param {{ menuItemId: string, quantity: number }} data
 * @returns {{ valid: boolean, errors: string[] }}
 */
const validateCartItem = (data) => {
  const errors = [];

  if (!data.menuItemId || typeof data.menuItemId !== 'string' || data.menuItemId.trim() === '') {
    errors.push('A valid menu item ID is required.');
  }

  const quantity = parseInt(data.quantity, 10);
  if (isNaN(quantity) || quantity < CART_ITEM_MIN_QUANTITY) {
    errors.push(`Item quantity must be at least ${CART_ITEM_MIN_QUANTITY}.`);
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Adds a menu item to the cart array or increments its quantity.
 * Validates that the item is a valid menu item.
 * @param {import('../types/index.js').CartItem[]} cart
 * @param {string} menuItemId
 * @param {number} [quantity=1]
 * @returns {Promise<import('../types/index.js').CartItem[]>}
 */
const addToCart = async (cart, menuItemId, quantity = 1) => {
  const { valid, errors } = validateCartItem({ menuItemId, quantity });
  if (!valid) {
    const err = new Error('Validation failed: ' + errors.join(' '));
    err.validationErrors = errors;
    throw err;
  }

  const menuItem = await MenuItem.findById(menuItemId);
  if (!menuItem) {
    const err = new Error('The selected item is not a valid menu item.');
    err.validationErrors = ['Added item must be a valid menu item.'];
    throw err;
  }

  const existingIndex = cart.findIndex((item) => item.menuItemId === menuItemId);

  if (existingIndex !== -1) {
    const updatedCart = cart.map((item, idx) =>
      idx === existingIndex
        ? { ...item, quantity: item.quantity + parseInt(quantity, 10) }
        : item
    );
    return updatedCart;
  }

  const newCartItem = {
    menuItemId,
    menuItem,
    quantity: parseInt(quantity, 10),
  };

  return [...cart, newCartItem];
};

/**
 * Removes a menu item from the cart by menuItemId.
 * @param {import('../types/index.js').CartItem[]} cart
 * @param {string} menuItemId
 * @returns {import('../types/index.js').CartItem[]}
 */
const removeFromCart = (cart, menuItemId) => {
  if (!menuItemId || typeof menuItemId !== 'string') {
    throw new Error('A valid menu item ID is required.');
  }
  return cart.filter((item) => item.menuItemId !== menuItemId);
};

/**
 * Updates the quantity of a cart item.
 * If quantity drops below CART_ITEM_MIN_QUANTITY, the item is removed.
 * @param {import('../types/index.js').CartItem[]} cart
 * @param {string} menuItemId
 * @param {number} quantity
 * @returns {import('../types/index.js').CartItem[]}
 */
const updateQuantity = (cart, menuItemId, quantity) => {
  if (!menuItemId || typeof menuItemId !== 'string') {
    throw new Error('A valid menu item ID is required.');
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty)) {
    throw new Error('Quantity must be a valid integer.');
  }

  if (qty < CART_ITEM_MIN_QUANTITY) {
    return removeFromCart(cart, menuItemId);
  }

  return cart.map((item) =>
    item.menuItemId === menuItemId ? { ...item, quantity: qty } : item
  );
};

/**
 * Clears all items from the cart.
 * @returns {import('../types/index.js').CartItem[]}
 */
const clearCart = () => [];

/**
 * Calculates the total price of all items in the cart.
 * @param {import('../types/index.js').CartItem[]} cart
 * @returns {number}
 */
const calculateTotal = (cart) => {
  return cart.reduce((sum, item) => {
    const price = item.menuItem ? parseFloat(item.menuItem.price) : 0;
    return sum + price * item.quantity;
  }, 0);
};

/**
 * Calculates the total number of items in the cart.
 * @param {import('../types/index.js').CartItem[]} cart
 * @returns {number}
 */
const calculateItemCount = (cart) => {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
};

export const CartItem = {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  calculateTotal,
  calculateItemCount,
  validate: validateCartItem,
};