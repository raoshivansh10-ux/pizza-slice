import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getAdminInventory,
  updateInventoryOption,
} from '../controllers/pizzaOptionController.js';
import { adminOnly } from '../middleware/adminOnly.middleware.js';
import PizzaOption from '../models/PizzaOption.js';
import { checkLowStockAndNotify } from '../jobs/lowStockCheck.job.js';

const router = Router();

// Apply adminOnly guard to all inventory endpoints
router.use(adminOnly);

// 1. GET /api/admin/inventory (Returns full inventory detail and stock metrics)
router.get('/', getAdminInventory);

// 2. PUT /api/admin/inventory/:id (Manual stock & threshold updates)
router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Valid MongoDB Option ID is required'),
    body('stockQty')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock quantity must be a non-negative integer'),
    body('lowStockThreshold')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Low stock threshold must be a non-negative integer'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a non-negative number'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  updateInventoryOption
);

// 3. POST /api/admin/inventory/:id/trigger-low-stock-test (Forces stock below threshold and immediately triggers low-stock email alert)
router.post(
  '/:id/trigger-low-stock-test',
  [param('id').isMongoId().withMessage('Valid MongoDB Option ID is required')],
  async (req, res) => {
    try {
      const { id } = req.params;
      const option = await PizzaOption.findById(id);

      if (!option) {
        return res.status(404).json({ error: 'Pizza option item not found.' });
      }

      // Force stockQty below threshold (e.g. 5) and clear lastNotifiedAt
      const newStock = Math.max(1, Math.floor(option.lowStockThreshold / 2));
      option.stockQty = newStock;
      option.lastNotifiedAt = null;
      await option.save();

      console.log(`[Test Trigger] Forced stock for '${option.name}' down to ${newStock} (Threshold: ${option.lowStockThreshold}).`);

      // Run low-stock check job immediately
      const jobResult = await checkLowStockAndNotify();

      res.status(200).json({
        message: `Stock for '${option.name}' dropped to ${newStock} and low-stock email job triggered successfully.`,
        item: option,
        notificationResult: jobResult,
      });
    } catch (error) {
      console.error('[Trigger Low Stock Test Error]', error);
      res.status(500).json({ error: 'Server error while triggering low-stock test.' });
    }
  }
);

export default router;
