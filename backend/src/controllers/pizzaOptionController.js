import { validationResult } from 'express-validator';
import PizzaOption from '../models/PizzaOption.js';

/**
 * @desc    Get all active pizza options grouped by category for builder UI
 * @route   GET /api/pizza-options
 * @access  Public
 */
export const getPublicPizzaOptions = async (req, res) => {
  try {
    const options = await PizzaOption.find({ isActive: true }).sort({ price: 1, name: 1 });

    const grouped = {
      bases: options.filter((opt) => opt.type === 'base'),
      sauces: options.filter((opt) => opt.type === 'sauce'),
      cheeses: options.filter((opt) => opt.type === 'cheese'),
      veggies: options.filter((opt) => opt.type === 'veggie' || opt.type === 'vegetable'),
    };

    res.status(200).json(grouped);
  } catch (error) {
    console.error('[Get Pizza Options Error]', error);
    res.status(500).json({ error: 'Server error while fetching pizza options.' });
  }
};

/**
 * @desc    Get complete pizza options inventory with stock status
 * @route   GET /api/admin/inventory
 * @access  Private / Admin only
 */
export const getAdminInventory = async (req, res) => {
  try {
    const { type, lowStockOnly } = req.query;
    const filter = {};

    if (type) {
      filter.type = type;
    }

    const items = await PizzaOption.find(filter).sort({ type: 1, name: 1 });

    let filteredItems = items;
    if (lowStockOnly === 'true') {
      filteredItems = items.filter((item) => item.stockQty <= item.lowStockThreshold);
    }

    const summary = {
      totalItems: items.length,
      lowStockItems: items.filter((item) => item.stockQty <= item.lowStockThreshold && item.stockQty > 0).length,
      outOfStockItems: items.filter((item) => item.stockQty === 0).length,
    };

    res.status(200).json({
      summary,
      inventory: filteredItems,
    });
  } catch (error) {
    console.error('[Get Admin Inventory Error]', error);
    res.status(500).json({ error: 'Server error while fetching inventory.' });
  }
};

/**
 * @desc    Update pizza option stock quantity and inventory thresholds
 * @route   PUT /api/admin/inventory/:id
 * @access  Private / Admin only
 */
export const updateInventoryOption = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { id } = req.params;
  const { stockQty, lowStockThreshold, price, name, isActive } = req.body;

  try {
    const option = await PizzaOption.findById(id);

    if (!option) {
      return res.status(404).json({ error: 'Pizza option item not found.' });
    }

    if (stockQty !== undefined) option.stockQty = Number(stockQty);
    if (lowStockThreshold !== undefined) option.lowStockThreshold = Number(lowStockThreshold);
    if (price !== undefined) option.price = Number(price);
    if (name !== undefined) option.name = name.trim();
    if (isActive !== undefined) option.isActive = Boolean(isActive);

    await option.save();

    res.status(200).json({
      message: `Inventory for '${option.name}' updated successfully.`,
      item: option,
    });
  } catch (error) {
    console.error('[Update Inventory Error]', error);
    res.status(500).json({ error: 'Server error while updating inventory item.' });
  }
};
