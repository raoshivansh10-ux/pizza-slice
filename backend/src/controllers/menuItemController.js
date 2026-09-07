import MenuItem from '../models/MenuItem.js';

/**
 * @desc    Get all menu items with optional category & keyword search filtering
 * @route   GET /api/menu?category=pizza&search=margherita
 * @access  Public
 */
export const getMenuItems = async (req, res) => {
  try {
    const { category, badge, search } = req.query;
    const filter = { isActive: true };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (badge) {
      filter.badge = badge;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const items = await MenuItem.find(filter).sort({ category: 1, basePrice: 1 });
    res.status(200).json({
      success: true,
      count: items.length,
      menuItems: items,
    });
  } catch (error) {
    console.error('[Get Menu Items Error]', error);
    res.status(500).json({ error: 'Server error while fetching menu items.' });
  }
};

/**
 * @desc    Get popular picks (bestseller/popular/new badges or top-rated)
 * @route   GET /api/menu/popular
 * @access  Public
 */
export const getPopularPicks = async (req, res) => {
  try {
    const popularItems = await MenuItem.find({
      isActive: true,
      $or: [
        { badge: { $in: ['bestseller', 'popular', 'new'] } },
        { rating: { $gte: 4.8 } },
      ],
    })
      .sort({ rating: -1, ratingCount: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      count: popularItems.length,
      popularItems,
    });
  } catch (error) {
    console.error('[Get Popular Picks Error]', error);
    res.status(500).json({ error: 'Server error while fetching popular picks.' });
  }
};

/**
 * @desc    Get single menu item by ID
 * @route   GET /api/menu/:id
 * @access  Public
 */
export const getMenuItemById = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }
    res.status(200).json({ success: true, menuItem: item });
  } catch (error) {
    console.error('[Get Menu Item By ID Error]', error);
    res.status(500).json({ error: 'Server error while fetching menu item.' });
  }
};

/**
 * @desc    Create new menu item (Admin only)
 * @route   POST /api/menu
 * @access  Private (Admin)
 */
export const createMenuItem = async (req, res) => {
  try {
    const { name, description, category, image, basePrice, sizePricing, badge, rating, ratingCount, isActive } =
      req.body;

    const newItem = new MenuItem({
      name,
      description,
      category,
      image: image || '/images/pizza-base.png',
      basePrice,
      sizePricing: Array.isArray(sizePricing) ? sizePricing : [],
      badge: badge || null,
      rating: rating || 4.8,
      ratingCount: ratingCount || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    await newItem.save();
    res.status(201).json({ success: true, menuItem: newItem });
  } catch (error) {
    console.error('[Create Menu Item Error]', error);
    res.status(400).json({ error: error.message || 'Failed to create menu item.' });
  }
};

/**
 * @desc    Update existing menu item (Admin only)
 * @route   PUT /api/menu/:id
 * @access  Private (Admin)
 */
export const updateMenuItem = async (req, res) => {
  try {
    const updated = await MenuItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }
    res.status(200).json({ success: true, menuItem: updated });
  } catch (error) {
    console.error('[Update Menu Item Error]', error);
    res.status(400).json({ error: error.message || 'Failed to update menu item.' });
  }
};

/**
 * @desc    Delete or deactivate menu item (Admin only)
 * @route   DELETE /api/menu/:id
 * @access  Private (Admin)
 */
export const deleteMenuItem = async (req, res) => {
  try {
    const deleted = await MenuItem.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }
    res.status(200).json({ success: true, message: 'Menu item deleted successfully.' });
  } catch (error) {
    console.error('[Delete Menu Item Error]', error);
    res.status(500).json({ error: 'Server error while deleting menu item.' });
  }
};
