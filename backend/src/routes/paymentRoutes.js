import { Router } from 'express';
import { body } from 'express-validator';
import {
  createPaymentOrder,
  verifyPayment,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Require Clerk Authentication for all payment endpoints
router.use(protect);

// 1. POST /api/payment/create-order
router.post(
  '/create-order',
  [
    body('deliveryAddress.street')
      .optional()
      .trim()
      .isString(),
    body('deliveryAddress.city')
      .optional()
      .trim()
      .isString(),
    body('deliveryAddress.pincode')
      .optional()
      .trim()
      .isString(),
    body('deliveryAddress.phone')
      .optional()
      .trim()
      .isString(),
  ],
  createPaymentOrder
);

// 2. POST /api/payment/verify
router.post(
  '/verify',
  [
    body('razorpay_order_id')
      .trim()
      .notEmpty()
      .withMessage('razorpay_order_id is required'),
    body('razorpay_payment_id')
      .trim()
      .notEmpty()
      .withMessage('razorpay_payment_id is required'),
    body('razorpay_signature')
      .trim()
      .notEmpty()
      .withMessage('razorpay_signature is required'),
  ],
  verifyPayment
);

export default router;
