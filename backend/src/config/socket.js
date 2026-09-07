import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

let io = null;

/**
 * Parse cookies from header string
 */
const parseCookies = (cookieHeader) => {
  const list = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });

  return list;
};

/**
 * Initialize Socket.IO server with authentication middleware
 */
export const initSocket = (httpServer, clientUrl) => {
  io = new Server(httpServer, {
    cors: {
      origin: clientUrl || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers?.cookie);
      const token =
        cookies.token ||
        socket.handshake.auth?.token ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'development_jwt_secret_key_12345'
      );

      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.warn('[Socket Auth Failed]', err.message);
      next(new Error('Authentication failed: ' + err.message));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    const roomName = `user:${userId}`;
    socket.join(roomName);

    console.log(`[Socket] User connected: ${socket.user.name} (${userId}) -> Joined room: ${roomName}`);

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.user.name} (${userId})`);
    });
  });

  return io;
};

/**
 * Get Socket.IO instance
 */
export const getIO = () => {
  return io;
};

/**
 * Emits real-time order status updates to a specific user's room
 */
export const emitOrderStatusUpdate = (userId, order) => {
  if (!io) {
    console.warn('[Socket] Cannot emit order update: Socket.IO not initialized');
    return;
  }

  const roomName = `user:${userId.toString()}`;
  console.log(`[Socket] Emitting 'order:status-updated' to room ${roomName} for order ${order._id}`);
  io.to(roomName).emit('order:status-updated', order);
};

export default { initSocket, getIO, emitOrderStatusUpdate };
