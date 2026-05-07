const request = require('supertest');
const express = require('express');

jest.mock('@prisma/client', () => {
  const PrismaClient = jest.fn().mockImplementation(() => ({
    menuItem: {
      findMany: jest.fn(),
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

const mockMenuItems = [
  { id: 'item-1', name: 'Burger', price: 9.99, image: 'burger.jpg', description: 'Delicious burger' },
  { id: 'item-2', name: 'Pizza', price: 12.99, image: 'pizza.jpg', description: 'Tasty pizza' },
  { id: 'item-3', name: 'Salad', price: 7.99, image: 'salad.jpg', description: 'Fresh salad' },
];

function buildApp() {
  const app = express();
  app.use(express.json());

  const jwt = require('jsonwebtoken');

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

  // GET /api/menu - list all menu items
  app.get('/api/menu', authMiddleware, async (req, res) => {
    try {
      const items = await prisma.menuItem.findMany();
      return res.status(200).json({ items });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /api/menu/:id - get single menu item
  app.get('/api/menu/:id', authMiddleware, async (req, res) => {
    try {
      const item = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
      if (!item) {
        return res.status(404).json({ error: 'Menu item not found' });
      }
      return res.status(200).json({ item });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return app;
}

describe('US-001: View menu items with key details', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  test('should return list of menu items with name, price, and image', async () => {
    prisma.menuItem.findMany.mockResolvedValue(mockMenuItems);

    const res = await request(app)
      .get('/api/menu')
      .set('Authorization', 'Bearer mock_token');

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBe(3);
  });

  test('each menu item must have a non-empty name', async () => {
    prisma.menuItem.findMany.mockResolvedValue(mockMenuItems);

    const res = await request(app)
      .get('/api/menu')
      .set('Authorization', 'Bearer mock_token');

    res.body.items.forEach(item => {
      expect(item.name).toBeDefined();
      expect(item.name.trim()).not.toBe('');
    });
  });

  test('each menu item must have a price value', async () => {
    prisma.menuItem.findMany.mockResolvedValue(mockMenuItems);

    const res = await request(app)
      .get('/api/menu')
      .set('Authorization', 'Bearer mock_token');

    res.body.items.forEach(item => {
      expect(item.price).toBeDefined();
      expect(typeof item.price).toBe('number');
    });
  });

  test('each menu item must have an image', async () => {
    prisma.menuItem.findMany.mockResolvedValue(mockMenuItems);

    const res = await request(app)
      .get('/api/menu')
      .set('Authorization', 'Bearer mock_token');

    res.body.items.forEach(item => {
      expect(item.image).toBeDefined();
      expect(item.image.trim()).not.toBe('');
    });
  });

  test('should return 401 if not authenticated', async () => {
    const res = await request(app).get('/api/menu');
    expect(res.status).toBe(401);
  });

  test('should return a single menu item by id', async () => {
    prisma.menuItem.findUnique.mockResolvedValue(mockMenuItems[0]);

    const res = await request(app)
      .get('/api/menu/item-1')
      .set('Authorization', 'Bearer mock_token');

    expect(res.status).toBe(200);
    expect(res.body.item.id).toBe('item-1');
    expect(res.body.item.name).toBe('Burger');
  });

  test('should return 404 for non-existent menu item', async () => {
    prisma.menuItem.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/menu/nonexistent')
      .set('Authorization', 'Bearer mock_token');

    expect(res.status).toBe(404);
  });
});
