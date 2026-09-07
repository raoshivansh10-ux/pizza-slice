import { Router } from 'express';
import { body } from 'express-validator';
import {
  getDeliveryConfig,
  validateLocation,
  getSavedDeliveryLocation,
  saveDeliveryLocation,
} from '../controllers/userLocationController.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Public endpoints
router.get('/config', getDeliveryConfig);
router.post('/validate-location', validateLocation);

// Authenticated Clerk User endpoints
router.get('/user/delivery-location', protect, getSavedDeliveryLocation);
router.post(
  '/user/delivery-location',
  protect,
  [
    body('latitude').isNumeric().withMessage('Valid latitude is required'),
    body('longitude').isNumeric().withMessage('Valid longitude is required'),
    body('formattedAddress').optional().isString(),
  ],
  saveDeliveryLocation
);

export default router;
