import { Router } from 'express';
import {
  getMenuItems,
  getPopularPicks,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../controllers/menuItemController.js';
import { adminOnly } from '../middleware/adminOnly.middleware.js';

const router = Router();

// Public routes
router.get('/', getMenuItems);
router.get('/popular', getPopularPicks);
router.get('/:id', getMenuItemById);

// Admin-protected routes
router.post('/', adminOnly, createMenuItem);
router.put('/:id', adminOnly, updateMenuItem);
router.delete('/:id', adminOnly, deleteMenuItem);

export default router;
