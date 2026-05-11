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

import { connectDB, sequelize } from './config/database.js';
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

const normalizeOrigin = (value = '') => value.replace(/\/$/, '');

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
].map(normalizeOrigin);

const configuredFrontendUrl = normalizeOrigin(process.env.FRONTEND_URL || 'http://localhost:5173');
allowedOrigins.push(configuredFrontendUrl);

app.use(compression());
app.use(cors({
  origin: (origin, callback) => {
    // In development, allow all origins to avoid mobile LAN issues
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin || '');

    if (!origin || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // Production: allow trusted deployment domains
    if (normalizedOrigin.endsWith('.netlify.app') || normalizedOrigin.endsWith('.vercel.app')) {
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
  res.json({
    status: 'Server is running',
    database: sequelize.getDialect(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  void next;
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  const isProd = process.env.NODE_ENV === 'production';
  const message = err && err.message ? err.message : 'Something went wrong!';
  // In production, avoid leaking detailed errors — send generic message.
  res.status(500).json({ message: isProd ? 'Something went wrong!' : message });
});

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Keep-alive function to prevent connection pool from closing during idle periods
const keepAlive = async () => {
  try {
    await sequelize.authenticate();
  } catch (err) {
    console.error('Keep-alive ping failed:', err.message);
  }
};

app.listen(PORT, HOST, async () => {
  const isAllInterfaces = HOST === '0.0.0.0';
  const localHint = `http://localhost:${PORT}`;
  const publicUrl = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || '';

  console.log(`🚀 Server started (pid ${process.pid})`);
  console.log(`🔌 Bound to ${HOST}:${PORT} (all interfaces: ${isAllInterfaces})`);
  console.log(`🏠 Local access hint: ${localHint}`);
  if (publicUrl) {
    console.log(`🌐 Public URL: ${publicUrl}`);
  }
  // Schedule database warm-up in background so server responds quickly on
  // cold starts. This avoids blocking the listen callback and improves
  // perceived startup time for the first visitor. Errors are logged but do
  // not block startup.
  console.log('⚙️ Scheduling database warm-up (non-blocking)...');
  (async () => {
    try {
      for (let i = 0; i < 2; i++) {
        await keepAlive();
      }
      console.log('✅ Database connections warmed up');
    } catch (err) {
      console.error('Failed to warm up database:', err.message);
    }
  })();

  // Keep-alive pings every 4 minutes to maintain connection pool
  setInterval(() => {
    keepAlive();
  }, 4 * 60 * 1000);
});
