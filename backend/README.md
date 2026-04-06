# Aninaya Backend Setup Guide

## Overview
This backend provides REST API endpoints for the Aninaya e-commerce platform built with Node.js, Express, and MongoDB.

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## Installation

### 1. Navigate to backend directory
```bash
cd backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create `.env` file
Copy `.env.example` to `.env` and update with your configuration:

```bash
cp .env.example .env
```

Update `.env` with your values:
```
MONGODB_URI=mongodb://localhost:27017/vetches
JWT_SECRET=your_secure_jwt_secret_key
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### 4. Start MongoDB
Make sure MongoDB is running:
```bash
# On Windows with MongoDB installed
mongod

# Or using MongoDB Atlas (cloud)
# Update MONGODB_URI in .env with your connection string
```

### 5. Seed the database
```bash
npm run seed
```

### 6. Start the server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server should start on `http://localhost:5000`

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `GET /api/products/category/:category` - Get products by category
- `GET /api/products/search?query=keyword` - Search products
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Users
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile (auth required)
- `PUT /api/users/profile` - Update user profile (auth required)
- `GET /api/users` - Get all users (admin)

### Orders
- `POST /api/orders` - Create order (auth required)
- `GET /api/orders/my-orders` - Get user's orders (auth required)
- `GET /api/orders/:id` - Get order details (auth required)
- `PUT /api/orders/:id/cancel` - Cancel order (auth required)
- `GET /api/orders` - Get all orders (admin)
- `PUT /api/orders/:id/status` - Update order status (admin)

## Database Models

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  address: {
    street, city, state, zipcode, country
  },
  isAdmin: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Product
```javascript
{
  _id: String,
  name: String,
  description: String,
  price: Number,
  category: String (Decor, Accessories, Fashion),
  subCategory: String,
  image: [String],
  modelUrl: String (optional AR model),
  sizes: [String],
  bestseller: Boolean,
  stock: Number,
  rating: Number,
  reviews: Number
}
```

### Order
```javascript
{
  userId: ObjectId,
  items: [{
    productId, name, price, quantity, size, image
  }],
  address: {
    firstName, lastName, email, street, city, state, zipcode, country, phone
  },
  subtotal: Number,
  shippingFee: Number (₱40),
  commission: Number (15%),
  total: Number,
  paymentMethod: String (cod, gcash, paypal),
  paymentStatus: String,
  orderStatus: String,
  trackingNumber: String
}
```

### Cart
```javascript
{
  userId: ObjectId (unique),
  items: [{
    productId, quantity, size, addedAt
  }],
  totalPrice: Number
}
```

### Review
```javascript
{
  productId: String,
  userId: ObjectId,
  userName: String,
  rating: Number (1-5),
  title: String,
  comment: String,
  helpful: Number
}
```

## Features

✅ User authentication with JWT
✅ Password hashing with bcryptjs
✅ Product management
✅ Shopping cart functionality
✅ Order management
✅ Product reviews
✅ Search and filter
✅ Category-based browsing
✅ Admin dashboard ready
✅ CORS enabled for frontend integration

## Frontend Integration

Update your frontend `.env` to connect to the backend:

```
VITE_API_URL=http://localhost:5000/api
```

## Authentication

The API uses JWT tokens for authentication. Include the token in headers:

```javascript
Authorization: Bearer <token>
```

## Error Handling

Standard HTTP status codes are used:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

## Security Notes

⚠️ **Never commit `.env` files with real credentials**
⚠️ Update `JWT_SECRET` with a strong random string
⚠️ Use environment variables for all sensitive data
⚠️ Implement rate limiting for production
⚠️ Validate all user inputs

## Next Steps

1. Add authentication middleware to protected routes
2. Implement payment gateway integration (GCash, PayPal)
3. Add file upload for product images
4. Create admin dashboard API
5. Implement email notifications
6. Add logging and monitoring

## Troubleshooting

**MongoDB connection failed:**
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify network access if using MongoDB Atlas

**Port already in use:**
- Change PORT in `.env`
- Or kill the process using the port

**CORS errors:**
- Update CORS_ORIGIN in `.env` to match your frontend URL
- Ensure frontend is running on correct port

## Support

For issues or questions, contact the development team.
