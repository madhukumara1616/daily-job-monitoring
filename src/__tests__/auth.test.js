const request = require('supertest');
const express = require('express');

// Mock prisma
jest.mock('@prisma/client', () => {
  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    password: '$2a$10$abcdefghijklmnopqrstuuVGmECFBhqnTkbMBFCHCHCHCHCHCHCHC',
  };
  const PrismaClient = jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    menuItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  }));
  return { PrismaClient };
});

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_token'),
  verify: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Build a minimal express app for testing
function buildApp() {
  const app = express();
  app.use(express.json());

  // POST /api/auth/signup
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { name, email, password, confirmPassword } = req.body;
      if (!name || !email || !password || !confirmPassword) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ error: 'Email is already in use' });
      }
      const hashed = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { name, email, password: hashed },
      });
      return res.status(201).json({ message: 'Account created successfully', userId: user.id });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/auth/login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
      return res.status(200).json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return app;
}

describe('US-011: Sign up for a new account', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  test('should create account with valid details and return 201', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'user-1', name: 'John Doe', email: 'john@example.com' });

    const res = await request(app).post('/api/auth/signup').send({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Account created successfully');
  });

  test('should return 400 if name is empty', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: '',
      email: 'john@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(res.status).toBe(400);
  });

  test('should return 400 if email format is invalid', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'John Doe',
      email: 'not-an-email',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  test('should return 409 if email is already registered', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'john@example.com' });

    const res = await request(app).post('/api/auth/signup').send({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already in use/i);
  });

  test('should return 400 if passwords do not match', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      confirmPassword: 'different',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/match/i);
  });

  test('should return 400 if password is too short', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'John Doe',
      email: 'john@example.com',
      password: '123',
      confirmPassword: '123',
    });
    expect(res.status).toBe(400);
  });

  test('should return 400 if any required field is missing', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: 'john@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(400);
  });
});

describe('US-012: Log in to access the main page', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  test('should authenticate and return token with valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashed_password',
    });
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app).post('/api/auth/login').send({
      email: 'john@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('john@example.com');
  });

  test('should return 401 for unregistered email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({
      email: 'unknown@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  test('should return 401 for incorrect password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashed_password',
    });
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app).post('/api/auth/login').send({
      email: 'john@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  test('should not reveal whether email or password was incorrect', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const resEmail = await request(app).post('/api/auth/login').send({
      email: 'unknown@example.com',
      password: 'password123',
    });

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      password: 'hashed',
    });
    bcrypt.compare.mockResolvedValue(false);

    const resPassword = await request(app).post('/api/auth/login').send({
      email: 'john@example.com',
      password: 'wrongpassword',
    });

    expect(resEmail.body.error).toBe(resPassword.body.error);
  });

  test('should return 400 if email is empty', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: '',
      password: 'password123',
    });
    expect(res.status).toBe(400);
  });

  test('should return 400 if password is empty', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'john@example.com',
      password: '',
    });
    expect(res.status).toBe(400);
  });

  test('should return 400 if email format is invalid', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'not-valid',
      password: 'password123',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });
});
