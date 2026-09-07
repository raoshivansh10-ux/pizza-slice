import { Router } from 'express';
import { body } from 'express-validator';
import {
  createReview,
  getMyReviews,
  getReviewsSummary,
} from '../controllers/reviewController.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// 1. GET /api/reviews/summary (Public platform average rating and count)
router.get('/summary', getReviewsSummary);

// 2. GET /api/reviews/mine (Authenticated customer's submitted reviews)
router.get('/mine', protect, getMyReviews);

// 3. POST /api/reviews (Submit review for a delivered order)
router.post(
  '/',
  protect,
  [
    body('orderId')
      .trim()
      .notEmpty()
      .withMessage('Order ID is required'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be an integer between 1 and 5'),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Comment cannot exceed 500 characters'),
  ],
  createReview
);

export default router;
