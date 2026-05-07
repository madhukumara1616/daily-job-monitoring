'use strict';

/**
 * validators.js
 * Shared validation utilities for the food ordering application.
 * All functions are pure and return { valid: boolean, message: string }.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 1000;
const MIN_PRICE = 0.01;
const MAX_PRICE = 99999.99;
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 100;

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the value is a non-empty string after trimming.
 * @param {unknown} value
 * @returns {boolean}
 */
const isNonEmptyString = (value) => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Returns true if the value is a finite number.
 * @param {unknown} value
 * @returns {boolean}
 */
const isFiniteNumber = (value) => {
  return typeof value === 'number' && Number.isFinite(value);
};

/**
 * Returns true if the value is a positive integer.
 * @param {unknown} value
 * @returns {boolean}
 */
const isPositiveInteger = (value) => {
  return Number.isInteger(value) && value > 0;
};

// ---------------------------------------------------------------------------
// Authentication validators
// ---------------------------------------------------------------------------

/**
 * Validates an email address.
 * Rules:
 *   - Must not be empty
 *   - Must match a valid email format
 *
 * @param {unknown} email
 * @returns {{ valid: boolean, message: string }}
 */
const validateEmail = (email) => {
  if (!isNonEmptyString(email)) {
    return { valid: false, message: 'Email address must not be empty.' };
  }
  const trimmed = email.trim();
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, message: 'Email address must be in a valid format.' };
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { valid: false, message: `Email address must not exceed ${MAX_NAME_LENGTH} characters.` };
  }
  return { valid: true, message: '' };
};

/**
 * Validates a password.
 * Rules:
 *   - Must not be empty
 *   - Must be at least MIN_PASSWORD_LENGTH characters
 *   - Must not exceed MAX_PASSWORD_LENGTH characters
 *
 * @param {unknown} password
 * @returns {{ valid: boolean, message: string }}
 */
const validatePassword = (password) => {
  if (!isNonEmptyString(password)) {
    return { valid: false, message: 'Password must not be empty.' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Password must not exceed ${MAX_PASSWORD_LENGTH} characters.`,
    };
  }
  return { valid: true, message: '' };
};

/**
 * Validates login credentials.
 * Per security requirements, errors must NOT reveal whether the email
 * or password was incorrect — this function validates format only.
 * Business-level "invalid credentials" errors must be handled at the
 * service layer with a generic message.
 *
 * @param {{ email: unknown, password: unknown }} credentials
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
const validateLoginCredentials = (credentials) => {
  const errors = {};

  const emailResult = validateEmail(credentials.email);
  if (!emailResult.valid) {
    errors.email = emailResult.message;
  }

  const passwordResult = validatePassword(credentials.password);
  if (!passwordResult.valid) {
    errors.password = passwordResult.message;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates registration data.
 *
 * @param {{ email: unknown, password: unknown, name: unknown }} data
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
const validateRegistrationData = (data) => {
  const errors = {};

  const emailResult = validateEmail(data.email);
  if (!emailResult.valid) {
    errors.email = emailResult.message;
  }

  const passwordResult = validatePassword(data.password);
  if (!passwordResult.valid) {
    errors.password = passwordResult.message;
  }

  if (!isNonEmptyString(data.name)) {
    errors.name = 'Name must not be empty.';
  } else if (data.name.trim().length > MAX_NAME_LENGTH) {
    errors.name = `Name must not exceed ${MAX_NAME_LENGTH} characters.`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// ---------------------------------------------------------------------------
// Menu item validators
// ---------------------------------------------------------------------------

/**
 * Validates a menu item name.
 * Rules:
 *   - Must be a non-empty string
 *   - Must not exceed MAX_NAME_LENGTH characters
 *
 * @param {unknown} name
 * @returns {{ valid: boolean, message: string }}
 */
const validateMenuItemName = (name) => {
  if (!isNonEmptyString(name)) {
    return { valid: false, message: 'Food item name must not be empty.' };
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      message: `Food item name must not exceed ${MAX_NAME_LENGTH} characters.`,
    };
  }
  return { valid: true, message: '' };
};

/**
 * Validates a menu item price.
 * Rules:
 *   - Must be a finite number
 *   - Must be at least MIN_PRICE
 *   - Must not exceed MAX_PRICE
 *
 * @param {unknown} price
 * @returns {{ valid: boolean, message: string }}
 */
const validateMenuItemPrice = (price) => {
  const numericPrice = Number(price);
  if (!isFiniteNumber(numericPrice)) {
    return { valid: false, message: 'Food item price must be a valid number.' };
  }
  if (numericPrice < MIN_PRICE) {
    return {
      valid: false,
      message: `Food item price must be at least ${MIN_PRICE.toFixed(2)}.`,
    };
  }
  if (numericPrice > MAX_PRICE) {
    return {
      valid: false,
      message: `Food item price must not exceed ${MAX_PRICE.toFixed(2)}.`,
    };
  }
  return { valid: true, message: '' };
};

/**
 * Validates a menu item image URL or path.
 * Rules:
 *   - Must be a non-empty string
 *
 * @param {unknown} image
 * @returns {{ valid: boolean, message: string }}
 */
const validateMenuItemImage = (image) => {
  if (!isNonEmptyString(image)) {
    return { valid: false, message: 'Food item image must be provided.' };
  }
  return { valid: true, message: '' };
};

/**
 * Validates a menu item description (optional field).
 *
 * @param {unknown} description
 * @returns {{ valid: boolean, message: string }}
 */
const validateMenuItemDescription = (description) => {
  if (description === undefined || description === null || description === '') {
    return { valid: true, message: '' };
  }
  if (typeof description !== 'string') {
    return { valid: false, message: 'Description must be a string.' };
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      valid: false,
      message: `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters.`,
    };
  }
  return { valid: true, message: '' };
};

/**
 * Validates a complete menu item payload.
 *
 * @param {{ name: unknown, price: unknown, image: unknown, description?: unknown }} item
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
const validateMenuItem = (item) => {
  const errors = {};

  const nameResult = validateMenuItemName(item.name);
  if (!nameResult.valid) errors.name = nameResult.message;

  const priceResult = validateMenuItemPrice(item.price);
  if (!priceResult.valid) errors.price = priceResult.message;

  const imageResult = validateMenuItemImage(item.image);
  if (!imageResult.valid) errors.image = imageResult.message;

  if (item.description !== undefined) {
    const descResult = validateMenuItemDescription(item.description);
    if (!descResult.valid) errors.description = descResult.message;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// ---------------------------------------------------------------------------
// Cart validators
// ---------------------------------------------------------------------------

/**
 * Validates a cart item quantity.
 * Rules:
 *   - Must be a positive integer
 *   - Must be at least MIN_QUANTITY (1)
 *   - Must not exceed MAX_QUANTITY
 *
 * @param {unknown} quantity
 * @returns {{ valid: boolean, message: string }}
 */
const validateCartItemQuantity = (quantity) => {
  const numericQty = Number(quantity);
  if (!isPositiveInteger(numericQty)) {
    return {
      valid: false,
      message: `Item quantity must be a whole number of at least ${MIN_QUANTITY}.`,
    };
  }
  if (numericQty < MIN_QUANTITY) {
    return {
      valid: false,
      message: `Item quantity must be at least ${MIN_QUANTITY}.`,
    };
  }
  if (numericQty > MAX_QUANTITY) {
    return {
      valid: false,
      message: `Item quantity must not exceed ${MAX_QUANTITY}.`,
    };
  }
  return { valid: true, message: '' };
};

/**
 * Validates a cart addition request.
 * Rules:
 *   - menuItemId must be a non-empty string
 *   - quantity must pass validateCartItemQuantity
 *
 * @param {{ menuItemId: unknown, quantity: unknown }} cartRequest
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
const validateAddToCart = (cartRequest) => {
  const errors = {};

  if (!isNonEmptyString(cartRequest.menuItemId)) {
    errors.menuItemId = 'A valid menu item must be selected.';
  }

  const quantityResult = validateCartItemQuantity(cartRequest.quantity);
  if (!quantityResult.valid) {
    errors.quantity = quantityResult.message;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates a cart quantity update request.
 *
 * @param {{ quantity: unknown }} updateRequest
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
const validateUpdateCartItem = (updateRequest) => {
  const errors = {};

  const quantityResult = validateCartItemQuantity(updateRequest.quantity);
  if (!quantityResult.valid) {
    errors.quantity = quantityResult.message;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// ---------------------------------------------------------------------------
// Order validators
// ---------------------------------------------------------------------------

/**
 * Valid order status values matching the Prisma schema enum.
 * @type {readonly string[]}
 */
const VALID_ORDER_STATUSES = Object.freeze([
  'PLACED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
]);

/**
 * Validates an order status value.
 *
 * @param {unknown} status
 * @returns {{ valid: boolean, message: string }}
 */
const validateOrderStatus = (status) => {
  if (!isNonEmptyString(status)) {
    return { valid: false, message: 'Order status must not be empty.' };
  }
  if (!VALID_ORDER_STATUSES.includes(status)) {
    return {
      valid: false,
      message: `Order status must be one of: ${VALID_ORDER_STATUSES.join(', ')}.`,
    };
  }
  return { valid: true, message: '' };
};

/**
 * Validates a place-order request.
 * The cart must have at least one item.
 *
 * @param {{ cartItems: unknown }} orderRequest
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
const validatePlaceOrder = (orderRequest) => {
  const errors = {};

  if (
    !Array.isArray(orderRequest.cartItems) ||
    orderRequest.cartItems.length === 0
  ) {
    errors.cartItems = 'Order must contain at least one item.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

// ---------------------------------------------------------------------------
// ID validator
// ---------------------------------------------------------------------------

/**
 * Validates a resource ID (UUID or similar non-empty string).
 *
 * @param {unknown} id
 * @param {string} [fieldName='ID']
 * @returns {{ valid: boolean, message: string }}
 */
const validateId = (id, fieldName = 'ID') => {
  if (!isNonEmptyString(id)) {
    return { valid: false, message: `${fieldName} must be a non-empty string.` };
  }
  return { valid: true, message: '' };
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Constants
  EMAIL_REGEX,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MIN_PRICE,
  MAX_PRICE,
  MIN_QUANTITY,
  MAX_QUANTITY,
  VALID_ORDER_STATUSES,

  // Generic helpers
  isNonEmptyString,
  isFiniteNumber,
  isPositiveInteger,

  // Auth validators
  validateEmail,
  validatePassword,
  validateLoginCredentials,
  validateRegistrationData,

  // Menu item validators
  validateMenuItemName,
  validateMenuItemPrice,
  validateMenuItemImage,
  validateMenuItemDescription,
  validateMenuItem,

  // Cart validators
  validateCartItemQuantity,
  validateAddToCart,
  validateUpdateCartItem,

  // Order validators
  validateOrderStatus,
  validatePlaceOrder,

  // ID validator
  validateId,
};