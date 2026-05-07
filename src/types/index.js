// src/types/index.js
// ═══════════════════════════════════════════════════════════════
// Shared constants, enums, and JSDoc type definitions
// Single source of truth for all domain types across the project
// Conforms to prisma/schema.prisma OrderStatus enum
// ═══════════════════════════════════════════════════════════════

// ─── Order Status Enum ──────────────────────────────────────────
// Mirrors prisma/schema.prisma OrderStatus enum exactly

/**
 * @readonly
 * @enum {string}
 */
export const ORDER_STATUS = Object.freeze({
  PLACED: 'PLACED',
  PREPARING: 'PREPARING',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
});

// ─── Validation Constants ────────────────────────────────────────

/** Minimum allowed quantity for a cart item. */
export const CART_ITEM_MIN_QUANTITY = 1;

/** Bcrypt salt rounds for password hashing. */
export const BCRYPT_SALT_ROUNDS = 12;

/** Regex for validating email addresses. */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── JSDoc Type Definitions ──────────────────────────────────────

/**
 * @typedef {Object} MenuItem
 * @property {string}      id          - Unique identifier (UUID)
 * @property {string}      name        - Non-empty display name of the food item
 * @property {number}      price       - Non-negative price of the food item
 * @property {string}      imageUrl    - Non-empty URL of the food item image
 * @property {string|null} description - Optional description of the food item
 * @property {string|null} category    - Optional category label
 * @property {Date}        createdAt   - Record creation timestamp
 * @property {Date}        updatedAt   - Record last-updated timestamp
 */

/**
 * @typedef {Object} CreateMenuItemInput
 * @property {string}      name        - Non-empty display name
 * @property {number}      price       - Non-negative price
 * @property {string}      imageUrl    - Non-empty image URL
 * @property {string}      [description] - Optional description
 * @property {string}      [category]    - Optional category
 */

/**
 * @typedef {Object} CartItem
 * @property {string}   menuItemId - ID of the referenced MenuItem
 * @property {MenuItem} menuItem   - The full MenuItem record
 * @property {number}   quantity   - Quantity in cart (>= CART_ITEM_MIN_QUANTITY)
 */

/**
 * @typedef {Object} OrderItem
 * @property {string}   id         - Unique identifier
 * @property {string}   orderId    - Parent order ID
 * @property {string}   menuItemId - Referenced menu item ID
 * @property {MenuItem} menuItem   - The full MenuItem record
 * @property {number}   quantity   - Quantity ordered
 * @property {number}   unitPrice  - Price per unit at time of order
 */

/**
 * @typedef {ORDER_STATUS[keyof ORDER_STATUS]} OrderStatus
 */

/**
 * @typedef {Object} Order
 * @property {string}      id          - Unique identifier (UUID)
 * @property {string}      userId      - ID of the user who placed the order
 * @property {OrderStatus} status      - Current order status
 * @property {number}      totalAmount - Total monetary value of the order
 * @property {OrderItem[]} orderItems  - Line items in the order
 * @property {SafeUser}    [user]      - Owning user (when included)
 * @property {Date}        createdAt   - Record creation timestamp
 * @property {Date}        updatedAt   - Record last-updated timestamp
 */

/**
 * @typedef {Object} User
 * @property {string}      id        - Unique identifier (UUID)
 * @property {string}      email     - Unique, lowercase email address
 * @property {string}      password  - Bcrypt-hashed password (never expose to client)
 * @property {string|null} name      - Optional display name
 * @property {Date}        createdAt - Record creation timestamp
 * @property {Date}        updatedAt - Record last-updated timestamp
 */

/**
 * @typedef {Object} SafeUser
 * @property {string}      id        - Unique identifier (UUID)
 * @property {string}      email     - Unique, lowercase email address
 * @property {string|null} name      - Optional display name
 * @property {Date}        createdAt - Record creation timestamp
 * @property {Date}        updatedAt - Record last-updated timestamp
 */

/**
 * @typedef {Object} LoginCredentials
 * @property {string} email    - Must not be empty; must be valid email format
 * @property {string} password - Must not be empty
 */

/**
 * @typedef {Object} RegisterInput
 * @property {string}  email    - Must not be empty; must be valid email format
 * @property {string}  password - Must not be empty; minimum 8 characters
 * @property {string}  [name]   - Optional display name
 */

/**
 * @typedef {Object} AuthResponse
 * @property {SafeUser} user      - Authenticated user (no password field)
 * @property {string}   token     - JWT access token
 * @property {number}   expiresAt - Unix timestamp of token expiry
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean}  valid  - Whether the data passed validation
 * @property {string[]} errors - List of human-readable error messages
 */

/**
 * @typedef {Object} ApiError
 * @property {string}   message          - Human-readable error message
 * @property {string[]} [validationErrors] - Field-level validation messages
 */