import { Router } from 'express';
import { getPublicPizzaOptions } from '../controllers/pizzaOptionController.js';

const router = Router();

// GET /api/pizza-options (Public builder endpoint: returns active items grouped by type)
router.get('/', getPublicPizzaOptions);

export default router;
