import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  register,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  logout,
  sendOtp,
  verifyOtp,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.middleware.js';
import {
  authRateLimiter,
  otpSendLimiter,
  otpVerifyLimiter,
} from '../middleware/rateLimiter.js';

const router = Router();

// 1. POST /api/auth/register (Rate-limited: max 10 / 15m)
router.post(
  '/register',
  authRateLimiter,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 50 })
      .withMessage('Name must be less than 50 characters'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
  ],
  register
);

// 2. GET /api/auth/verify-email/:token (Rate-limited: max 10 / 15m)
router.get(
  '/verify-email/:token',
  authRateLimiter,
  [
    param('token')
      .trim()
      .notEmpty()
      .withMessage('Verification token is required'),
  ],
  verifyEmail
);

// 3. POST /api/auth/login (Rate-limited: max 10 / 15m)
router.post(
  '/login',
  authRateLimiter,
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  login
);

// 4. POST /api/auth/forgot-password (Rate-limited: max 10 / 15m)
router.post(
  '/forgot-password',
  authRateLimiter,
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
  ],
  forgotPassword
);

// 5. POST /api/auth/reset-password/:token (Rate-limited: max 10 / 15m)
router.post(
  '/reset-password/:token',
  authRateLimiter,
  [
    param('token')
      .trim()
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
  ],
  resetPassword
);

// 6. POST /api/auth/send-otp (Rate-limited: max 5 / 15m)
router.post(
  '/send-otp',
  otpSendLimiter,
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
  ],
  sendOtp
);

// 7. POST /api/auth/verify-otp (Rate-limited: max 15 / 15m)
router.post(
  '/verify-otp',
  otpVerifyLimiter,
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('otp')
      .trim()
      .notEmpty()
      .withMessage('OTP is required')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be exactly 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers'),
  ],
  verifyOtp
);

// Protected routes & utilities
router.get('/me', protect, getMe);
router.post('/logout', logout);

export default router;

