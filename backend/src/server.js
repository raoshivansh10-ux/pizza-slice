import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { initSocket } from './config/socket.js';
import authRoutes from './routes/authRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import adminOrderRoutes from './routes/adminOrderRoutes.js';
import pizzaOptionRoutes from './routes/pizzaOptionRoutes.js';
import adminInventoryRoutes from './routes/adminInventoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import loyaltyRoutes from './routes/loyaltyRoutes.js';
import menuItemRoutes from './routes/menuItemRoutes.js';
import comboOfferRoutes from './routes/comboOfferRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import userLocationRoutes from './routes/userLocationRoutes.js';
import { initLowStockCron } from './jobs/lowStockCheck.job.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

// Parse allowed origins (supports comma-separated list for production)
const allowedOrigins = rawClientUrl.split(',').map((url) => url.trim());

// Connect to MongoDB
connectDB();

// Initialize Low Stock node-cron background job
initLowStockCron();

// Initialize Socket.IO with HTTP server and allowed origins
initSocket(server, allowedOrigins);

// Production-ready strict CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, server-to-server, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] Request origin: ${origin} not in allowed list:`, allowedOrigins);
      callback(new Error(`CORS blocked: Origin ${origin} is not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours preflight cache
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV || 'development' });
});

// Customer Authentication Routes
app.use('/api/auth', authRoutes);

// Isolated Admin Authentication Routes
app.use('/api/admin', adminAuthRoutes);

// Admin Order Management Routes
app.use('/api/admin/orders', adminOrderRoutes);

// Public Pizza Options (for Custom Pizza Builder)
app.use('/api/pizza-options', pizzaOptionRoutes);

// Admin-Protected Inventory Management Routes
app.use('/api/admin/inventory', adminInventoryRoutes);

// Order Management & Razorpay Checkout Routes
app.use('/api/orders', orderRoutes);

// Customer Reviews Management Routes
app.use('/api/reviews', reviewRoutes);

// Points-Based Loyalty & Redemption Routes
app.use('/api/loyalty', loyaltyRoutes);

// Menu Items & Dynamic Catalog Routes (supports both /api/menu and /api/menu-items)
app.use('/api/menu', menuItemRoutes);
app.use('/api/menu-items', menuItemRoutes);

// Curated Combo Offers Routes
app.use('/api/combos', comboOfferRoutes);

// Persistent Cross-Device Cart Routes
app.use('/api/cart', cartRoutes);

// Dedicated Razorpay Payment Routes
app.use('/api/payment', paymentRoutes);

// Delivery Location & Restaurant Radius Area Routes
app.use('/api', userLocationRoutes);
app.use('/api/delivery', userLocationRoutes);

// Root Route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Pizza Delivery API is running',
    health: '/api/health',
    auth: '/api/auth',
    admin: '/api/admin',
    adminOrders: '/api/admin/orders',
    pizzaOptions: '/api/pizza-options',
    adminInventory: '/api/admin/inventory',
    orders: '/api/orders',
  });
});

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start Server with HTTP & Socket.IO listener
server.listen(PORT, () => {
  console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`[Server] Health check:  http://localhost:${PORT}/api/health`);
  console.log(`[Server] Admin Orders:  http://localhost:${PORT}/api/admin/orders`);
  console.log(`[Server] Real-time Socket.IO active`);
  console.log(`[Server] CORS locked to:`, allowedOrigins);
});

export default app;
