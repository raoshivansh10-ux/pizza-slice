import { Router } from 'express';
import { body } from 'express-validator';
import {
  createOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Apply protect middleware to all order routes (User JWT required)
router.use(protect);

// 1. POST /api/orders (Create order and initialize Razorpay order)
router.post(
  '/',
  [
    body('items')
      .optional()
      .isArray()
      .withMessage('Items must be an array of pizza configurations'),
    body('deliveryAddress.street')
      .optional()
      .trim()
      .isString()
      .withMessage('Street address must be a string'),
    body('deliveryAddress.city')
      .optional()
      .trim()
      .isString()
      .withMessage('City must be a string'),
    body('deliveryAddress.pincode')
      .optional()
      .trim()
      .isString()
      .withMessage('Pincode must be a string'),
    body('deliveryAddress.phone')
      .optional()
      .trim()
      .isString()
      .withMessage('Phone number must be a string'),
  ],
  createOrder
);

// 2. POST /api/orders/verify (Verify HMAC signature, mark paid, decrement stock)
router.post(
  '/verify',
  [
    body('razorpay_order_id')
      .trim()
      .notEmpty()
      .withMessage('Razorpay order ID is required'),
    body('razorpay_payment_id')
      .trim()
      .notEmpty()
      .withMessage('Razorpay payment ID is required'),
    body('razorpay_signature')
      .trim()
      .notEmpty()
      .withMessage('Razorpay signature is required'),
  ],
  verifyPayment
);

// 3. GET /api/orders/mine (Retrieve user order history with pagination & filters)
router.get('/mine', getMyOrders);

// 4. GET /api/orders/:id (Retrieve full itemized details for single owned order)
router.get('/:id', getOrderById);

export default router;
