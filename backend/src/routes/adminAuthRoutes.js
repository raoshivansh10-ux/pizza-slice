import { Router } from 'express';
import { body } from 'express-validator';
import {
  adminLogin,
  adminGetMe,
  adminLogout,
} from '../controllers/adminAuthController.js';
import { adminOnly } from '../middleware/adminOnly.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// POST /api/admin/login (Rate-limited, validates credentials against Admin collection)
router.post(
  '/login',
  authRateLimiter,
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Admin email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  adminLogin
);

// GET /api/admin/me (Protected by adminOnly middleware)
router.get('/me', adminOnly, adminGetMe);

// POST /api/admin/logout (Clears admin_token cookie)
router.post('/logout', adminOnly, adminLogout);

export default router;
