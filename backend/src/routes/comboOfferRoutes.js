import { Router } from 'express';
import {
  getComboOffers,
  getComboOfferById,
  createComboOffer,
  updateComboOffer,
  deleteComboOffer,
} from '../controllers/comboOfferController.js';
import { adminOnly } from '../middleware/adminOnly.middleware.js';

const router = Router();

// Public routes
router.get('/', getComboOffers);
router.get('/:id', getComboOfferById);

// Admin-protected routes
router.post('/', adminOnly, createComboOffer);
router.put('/:id', adminOnly, updateComboOffer);
router.delete('/:id', adminOnly, deleteComboOffer);

export default router;
