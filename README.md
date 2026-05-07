# Food Ordering Web Application

A full-stack food ordering web application built with Node.js, Express, and Prisma.

## Features

- **Menu Browsing**: View food items with name, price, and image
- **Shopping Cart**: Add items, adjust quantities, and manage your order
- **User Authentication**: Secure login and registration with JWT
- **Order Management**: Place and track orders through their lifecycle

## Tech Stack

- **Runtime**: Node.js (>=18.0.0)
- **Framework**: Express.js
- **ORM**: Prisma
- **Authentication**: JSON Web Tokens (JWT) + bcryptjs
- **Logging**: Winston
- **Validation**: express-validator + custom validators

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- A supported database (PostgreSQL recommended)

### Installation

# Clone the repository
git clone <repository-url>
cd food-ordering-web-application

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start the development server
npm run dev

### Environment Variables

See `.env.example` for all required environment variables.

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | Database connection string | Yes |
| `JWT_SECRET` | Secret key for JWT signing | Yes |
| `JWT_EXPIRES_IN` | JWT expiration duration | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `LOG_LEVEL` | Logging level (info/debug/warn/error) | No |

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Login with credentials | No |
| POST | `/api/auth/logout` | Logout current user | Yes |
| GET | `/api/auth/me` | Get current user profile | Yes |

### Menu

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/menu` | List all menu items | No |
| GET | `/api/menu/:id` | Get a single menu item | No |
| POST | `/api/menu` | Create a menu item | Yes (Admin) |
| PUT | `/api/menu/:id` | Update a menu item | Yes (Admin) |
| DELETE | `/api/menu/:id` | Delete a menu item | Yes (Admin) |

### Cart

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/cart` | Get current user's cart | Yes |
| POST | `/api/cart` | Add item to cart | Yes |
| PUT | `/api/cart/:itemId` | Update cart item quantity | Yes |
| DELETE | `/api/cart/:itemId` | Remove item from cart | Yes |
| DELETE | `/api/cart` | Clear entire cart | Yes |

### Orders

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/orders` | List user's orders | Yes |
| GET | `/api/orders/:id` | Get a single order | Yes |
| POST | `/api/orders` | Place a new order | Yes |
| PATCH | `/api/orders/:id/status` | Update order status | Yes (Admin) |

## Project Structure

food-ordering-web-application/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config/
│   │   ├── database.js        # Prisma client configuration
│   │   └── env.js             # Environment variable loader
│   ├── middleware/
│   │   └── errorHandler.js    # Global error handling middleware
│   ├── models/
│   │   ├── CartItem.js        # Cart item model helpers
│   │   ├── MenuItem.js        # Menu item model helpers
│   │   ├── Order.js           # Order model helpers
│   │   └── User.js            # User model helpers
│   ├── types/
│   │   └── index.js           # Shared type definitions and constants
│   └── utils/
│       ├── logger.js          # Winston logger configuration
│       └── validators.js      # Shared validation utilities
├── .env.example
├── .gitignore
├── package.json
└── README.md

## Validation Rules

### User Authentication
- Email must not be empty and must be a valid email format
- Password must not be empty
- Invalid credentials return a generic error (no field-level disclosure)

### Menu Items
- Name must be a non-empty string
- Price must be a positive number
- Image must be provided

### Cart
- Added item must reference a valid menu item
- Item quantity must be at least 1

## Security

- Passwords are hashed using bcryptjs (salt rounds: 12)
- JWT tokens are signed with a secret and expire after a configurable duration
- Helmet.js sets secure HTTP headers
- Rate limiting is applied to authentication endpoints
- CORS is configured for allowed origins
- Authentication errors use generic messages to prevent user enumeration

## Logging

Logs are written to:
- `logs/error.log` — error-level logs only
- `logs/combined.log` — all log levels
- Console — in development mode

## License

MIT