import ComboOffer from '../models/ComboOffer.js';

/**
 * @desc    Get all active combo offers populated with their menu items
 * @route   GET /api/combos
 * @access  Public
 */
export const getComboOffers = async (req, res) => {
  try {
    const now = new Date();
    const combos = await ComboOffer.find({
      isActive: true,
      $or: [{ validUntil: null }, { validUntil: { $gte: now } }],
    })
      .populate('items', 'name category image basePrice sizePricing badge rating ratingCount')
      .sort({ comboPrice: 1 });

    res.status(200).json({
      success: true,
      count: combos.length,
      combos,
    });
  } catch (error) {
    console.error('[Get Combo Offers Error]', error);
    res.status(500).json({ error: 'Server error while fetching combo offers.' });
  }
};

/**
 * @desc    Get single combo offer by ID
 * @route   GET /api/combos/:id
 * @access  Public
 */
export const getComboOfferById = async (req, res) => {
  try {
    const combo = await ComboOffer.findById(req.params.id).populate(
      'items',
      'name category image basePrice sizePricing badge rating ratingCount'
    );
    if (!combo) {
      return res.status(404).json({ error: 'Combo offer not found.' });
    }
    res.status(200).json({ success: true, combo });
  } catch (error) {
    console.error('[Get Combo Offer By ID Error]', error);
    res.status(500).json({ error: 'Server error while fetching combo offer.' });
  }
};

/**
 * @desc    Create new combo offer (Admin only)
 * @route   POST /api/combos
 * @access  Private (Admin)
 */
export const createComboOffer = async (req, res) => {
  try {
    const { name, description, image, items, discountType, discountValue, originalPrice, comboPrice, validUntil, isActive } =
      req.body;

    const newCombo = new ComboOffer({
      name,
      description,
      image: image || '/images/combos/combo-party.png',
      items: Array.isArray(items) ? items : [],
      discountType,
      discountValue,
      originalPrice,
      comboPrice,
      validUntil: validUntil || null,
      isActive: isActive !== undefined ? isActive : true,
    });

    await newCombo.save();
    const populated = await ComboOffer.findById(newCombo._id).populate('items');
    res.status(201).json({ success: true, combo: populated });
  } catch (error) {
    console.error('[Create Combo Offer Error]', error);
    res.status(400).json({ error: error.message || 'Failed to create combo offer.' });
  }
};

/**
 * @desc    Update combo offer (Admin only)
 * @route   PUT /api/combos/:id
 * @access  Private (Admin)
 */
export const updateComboOffer = async (req, res) => {
  try {
    const updated = await ComboOffer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('items');

    if (!updated) {
      return res.status(404).json({ error: 'Combo offer not found.' });
    }
    res.status(200).json({ success: true, combo: updated });
  } catch (error) {
    console.error('[Update Combo Offer Error]', error);
    res.status(400).json({ error: error.message || 'Failed to update combo offer.' });
  }
};

/**
 * @desc    Delete combo offer (Admin only)
 * @route   DELETE /api/combos/:id
 * @access  Private (Admin)
 */
export const deleteComboOffer = async (req, res) => {
  try {
    const deleted = await ComboOffer.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Combo offer not found.' });
    }
    res.status(200).json({ success: true, message: 'Combo offer deleted successfully.' });
  } catch (error) {
    console.error('[Delete Combo Offer Error]', error);
    res.status(500).json({ error: 'Server error while deleting combo offer.' });
  }
};
