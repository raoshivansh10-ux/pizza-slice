import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getAllOrders,
  updateOrderStatus,
} from '../controllers/adminOrderController.js';
import { adminOnly } from '../middleware/adminOnly.middleware.js';

const router = Router();

// Restrict all routes to authenticated administrators
router.use(adminOnly);

// 1. GET /api/admin/orders (All orders, newest first, populated user name/email)
router.get('/', getAllOrders);

// 2. PUT /api/admin/orders/:id/status (Forward-only order status transition)
router.put(
  '/:id/status',
  [
    param('id').isMongoId().withMessage('Valid Order ID is required'),
    body('status')
      .trim()
      .notEmpty()
      .withMessage('New status is required')
      .isIn([
        'Order Received',
        'In Kitchen',
        'In the Kitchen',
        'Sent to Delivery',
        'Sent for Delivery',
        'Delivered',
      ])
      .withMessage(
        "Status must be one of: 'Order Received', 'In Kitchen', 'Sent to Delivery', 'Delivered'"
      ),
  ],
  updateOrderStatus
);

export default router;
