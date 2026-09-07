import { Router } from 'express';
import {
  getCart,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  syncOrMergeCart,
} from '../controllers/cartController.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Protect all cart operations with user JWT
router.use(protect);

router.get('/', getCart);

// Add items with server-side price validation
router.post('/items', addItemToCart);
router.post('/add', addItemToCart);

// Update quantity
router.patch('/items/:itemId', updateCartItemQuantity);
router.patch('/item/:cartId', updateCartItemQuantity);

// Remove item
router.delete('/items/:itemId', removeCartItem);
router.delete('/item/:cartId', removeCartItem);

// Clear cart
router.delete('/', clearCart);

// Sync / Merge guest cart
router.put('/', syncOrMergeCart);
router.post('/merge', syncOrMergeCart);

export default router;
