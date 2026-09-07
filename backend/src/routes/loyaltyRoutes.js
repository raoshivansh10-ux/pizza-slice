import { Router } from 'express';
import { body } from 'express-validator';
import { getLoyaltyStatus, redeemPointsQuote } from '../controllers/loyaltyController.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Restrict all loyalty routes to authenticated users
router.use(protect);

// 1. GET /api/loyalty/me (Current points, tier, progress bar, transaction history)
router.get('/me', getLoyaltyStatus);

// 2. POST /api/loyalty/redeem (Calculate discount & return signed redemption token)
router.post(
  '/redeem',
  [
    body('pointsToRedeem')
      .isInt({ min: 1 })
      .withMessage('Points to redeem must be a positive integer'),
  ],
  redeemPointsQuote
);

export default router;
