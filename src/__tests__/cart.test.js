const request = require('supertest');
const express = require('express');

jest.mock('@prisma/client', () => {
  const PrismaClient = jest.fn().mockImplementation(() => ({
    menuItem: {
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  }));
  return { PrismaClient };
});

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_token'),
  verify: jest.fn().mockReturnValue({ userId: 'user-1' }),
}));

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mockMenuItems = {
  'item-1': { id: 'item-1', name: 'Burger', price: 9.99, image: 'burger.jpg' },
  'item-2': { id: 'item-2', name: 'Pizza', price: 12.99, image: 'pizza.jpg' },
};

function buildApp() {
  const app = express();
  app.use(express.json());

  const jwt = require('jsonwebtoken');

  // In-memory cart store keyed by userId
  const carts = {};

  function getCart(userId) {
    if (!carts[userId]) carts[userId] = [];
    return carts[userId];
  }

  function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      req.userId = decoded.userId;
      next();
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  function calcTotal(cart) {
    return cart.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);
  }

  // GET /api/cart - view cart
  app.get('/api/cart', authMiddleware, (req, res) => {
    const cart = getCart(req.userId);
    const total = calcTotal(cart);
    return res.status(200).json({ items: cart, total: parseFloat(total.toFixed(2)) });
  });

  // POST /api/cart - add item to cart
  app.post('/api/cart', authMiddleware, async (req, res) => {
    try {
      const { itemId } = req.body;
      if (!itemId) {
        return res.status(400).json({ error: 'itemId is required' });
      }
      const menuItem = await prisma.menuItem.findUnique({ where: { id: itemId } });
      if (!menuItem) {
        return res.status(404).json({ error: 'Menu item not found' });
      }
      const cart = getCart(req.userId);
      const existing = cart.find(e => e.item.id === itemId);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ item: menuItem, quantity: 1 });
      }
      const total = calcTotal(cart);
      return res.status(200).json({ items: cart, total: parseFloat(total.toFixed(2)) });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // PUT /api/cart/:itemId - update quantity
  app.put('/api/cart/:itemId', authMiddleware, (req, res) => {
    const { itemId } = req.params;
    const { quantity } = req.body;
    if (quantity === undefined || quantity === null) {
      return res.status(400).json({ error: 'quantity is required' });
    }
    if (typeof quantity !== 'number' || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }
    const cart = getCart(req.userId);
    const entry = cart.find(e => e.item.id === itemId);
    if (!entry) {
      return res.status(404).json({ error: 'Item not in cart' });
    }
    entry.quantity = quantity;
    const total = calcTotal(cart);
    return res.status(200).json({ items: cart, total: parseFloat(total.toFixed(2)) });
  });

  // DELETE /api/cart/:itemId - remove item from cart
  app.delete('/api/cart/:itemId', authMiddleware, (req, res) => {
    const { itemId } = req.params;
    const cart = getCart(req.userId);
    const index = cart.findIndex(e => e.item.id === itemId);
    if (index === -1) {
      return res.status(404).json({ error: 'Item not in cart' });
    }
    const removedItem = cart[index];
    cart.splice(index, 1);
    const total = calcTotal(cart);
    return res.status(200).json({ removed: removedItem, items: cart, total: parseFloat(total.toFixed(2)) });
  });

  // DELETE /api/cart - clear cart
  app.delete('/api/cart', authMiddleware, (req, res) => {
    carts[req.userId] = [];
    return res.status(200).json({ items: [], total: 0 });
  });

  return app;
}

describe('US-002: Add menu items to cart', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  test('should add a valid menu item to the cart', async () => {
    prisma.menuItem.findUnique.mockResolvedValue(mockMenuItems['item-1']);

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({ itemId: 'item-1' });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].item.id).toBe('item-1');
    expect(res.body.items[0].quantity).toBe(1);
  });

  test('should increase quantity when same item is added again', async () => {
    prisma.menuItem.findUnique.mockResolvedValue(mockMenuItems['item-1']);

    await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({ itemId: 'item-1' });

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({ itemId: 'item-1' });

    expect(res.status).toBe(200);
    expect(res.body.items[0].quantity).toBe(2);
  });

  test('should return 404 for invalid menu item', async () => {
    prisma.menuItem.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({ itemId: 'nonexistent' });

    expect(res.status).toBe(404);
  });

  test('item quantity in cart must be at least 1 after adding', async () => {
    prisma.menuItem.findUnique.mockResolvedValue(mockMenuItems['item-1']);

    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({ itemId: 'item-1' });

    expect(res.body.items[0].quantity).toBeGreaterThanOrEqual(1);
  });

  test('should return 400 if itemId is missing', async () => {
    const res = await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('US-003: View cart contents and total price', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  test('should return cart items and total price', async () => {
    prisma.menuItem.findUnique.mockResolvedValue(mockMenuItems['item-1']);

    await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({ itemId: 'item-1' });

    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', 'Bearer mock_token');

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(res.body.total).toBeDefined();
  });

  test('total price must reflect current cart contents and quantities', async () => {
    prisma.menuItem.findUnique.mockResolvedValue(mockMenuItems['item-1']);

    await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({ itemId: 'item-1' });

    await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({ itemId: 'item-1' });

    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', 'Bearer mock_token');

    expect(res.body.total).toBeCloseTo(9.99 * 2, 2);
  });

  test('should return empty cart with total 0 initially', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', 'Bearer mock_token');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });
});

describe('US-004: Remove items from cart', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  test('should remove an item from the cart', async () => {
    prisma.menuItem.findUnique.mockResolvedValue(mockMenuItems['item-1']);

    await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({ itemId: 'item-1' });

    const res = await request(app)
      .delete('/api/cart/item-1')
      .set('Authorization', 'Bearer mock_token');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });

  test('total price updates after removing an item', async () => {
    prisma.menuItem.findUnique
      .mockResolvedValueOnce(mockMenuItems['item-1'])
      .mockResolvedValueOnce(mockMenuItems['item-2']);

    await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({ itemId: 'item-1' });

    await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({ itemId: 'item-2' });

    const res = await request(app)
      .delete('/api/cart/item-1')
      .set('Authorization', 'Bearer mock_token');

    expect(res.body.total).toBeCloseTo(12.99, 2);
  });

  test('removing one item must not affect other cart items', async () => {
    prisma.menuItem.findUnique
      .mockResolvedValueOnce(mockMenuItems['item-1'])
      .mockResolvedValueOnce(mockMenuItems['item-2']);

    await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({ itemId: 'item-1' });

    await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({ itemId: 'item-2' });

    const res = await request(app)
      .delete('/api/cart/item-1')
      .set('Authorization', 'Bearer mock_token');

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].item.id).toBe('item-2');
  });

  test('should return 404 when removing non-existent cart item', async () => {
    const res = await request(app)
      .delete('/api/cart/nonexistent')
      .set('Authorization', 'Bearer mock_token');

    expect(res.status).toBe(404);
  });
});

describe('US-005: Change item quantity in cart', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  test('should increase item quantity and update total', async () => {
    prisma.menuItem.findUnique.mockResolvedValue(mockMenuItems['item-1']);

    await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({ itemId: 'item-1' });

    const res = await request(app)
      .put('/api/cart/item-1')
      .set('Authorization', 'Bearer mock_token')
      .send({ quantity: 3 });

    expect(res.status).toBe(200);
    expect(res.body.items[0].quantity).toBe(3);
    expect(res.body.total).toBeCloseTo(9.99 * 3, 2);
  });

  test('should decrease item quantity and update total', async () => {
    prisma.menuItem.findUnique.mockResolvedValue(mockMenuItems['item-1']);

    await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({ itemId: 'item-1' });

    await request(app)
      .put('/api/cart/item-1')
      .set('Authorization', 'Bearer mock_token')
      .send({ quantity: 5 });

    const res = await request(app)
      .put('/api/cart/item-1')
      .set('Authorization', 'Bearer mock_token')
      .send({ quantity: 2 });

    expect(res.body.items[0].quantity).toBe(2);
    expect(res.body.total).toBeCloseTo(9.99 * 2, 2);
  });

  test('should return 400 if quantity is less than 1', async () => {
    prisma.menuItem.findUnique.mockResolvedValue(mockMenuItems['item-1']);

    await request(app)
      .post('/api/cart')
      .set('Authorization', 'Bearer mock_token')
      .send({ itemId: 'item-1' });

    const res = await request(app)
      .put('/api/cart/item-1')
      .set('Authorization', 'Bearer mock_token')
      .send({ quantity: 0 });

    expect(res.status).toBe(400);
  });

  test('should return 404 when updating non-existent cart item', async () => {
    const res = await request(app)
      .put('/api/cart/nonexistent')
      .set('Authorization', 'Bearer mock_token')
      .send({ quantity: 2 });

    expect(res.status).toBe(404);
  });
});
