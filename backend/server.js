import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

// Import all models BEFORE connecting to database
import User from './models/User.js';
import Product from './models/Product.js';
import Order from './models/Order.js';
import Review from './models/Review.js';
import Cart from './models/Cart.js';
import Seller from './models/Seller.js';
import ChatMessage from './models/ChatMessage.js';
import Coupon from './models/Coupon.js';
import ReturnRequest from './models/ReturnRequest.js';
import Notification from './models/Notification.js';

import { connectDB } from './config/database.js';
import productRoutes from './routes/productRoutes.js';
import userRoutes from './routes/userRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import sellerRoutes from './routes/sellerRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Connect to database
connectDB();

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://192.168.254.104:5173',
  'http://192.168.254.104:5174',
  // Current LAN IPs used for mobile testing (update as your IP changes)
  'http://192.168.68.126:5173',
  'http://192.168.68.126:5174',
  'http://192.168.68.126:5175',
  process.env.FRONTEND_URL || 'http://localhost:5173',
];

app.use(compression());
app.use(cors({
  origin: (origin, callback) => {
    // In development, allow all origins to avoid mobile LAN issues
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Production: allow Netlify domains
    if (origin && origin.includes('netlify.app')) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', database: 'SQLite' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  const hostForLog = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`🚀 Server running on http://${hostForLog}:${PORT}`);
  console.log(`🔌 Bound to host ${HOST} (listen on all interfaces: ${HOST === '0.0.0.0'})`);
});
