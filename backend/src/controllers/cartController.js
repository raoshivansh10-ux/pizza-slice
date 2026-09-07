import Cart from '../models/Cart.js';
import MenuItem from '../models/MenuItem.js';
import ComboOffer from '../models/ComboOffer.js';
import PizzaOption from '../models/PizzaOption.js';

/**
 * Helper to compute unit price strictly on the server from current database models
 */
export const computeItemServerPrice = async (item) => {
  const itemType = item.itemType || 'menuItem';

  // 1. Ready-made Menu Item (pizzas, garlic bread, sides, drinks, desserts)
  if (itemType === 'menuItem') {
    let menuItem = null;
    if (item.refId) {
      menuItem = await MenuItem.findById(item.refId);
    }
    if (!menuItem && item.name) {
      menuItem = await MenuItem.findOne({ name: item.name });
    }
    if (!menuItem) {
      throw new Error(`Menu item '${item.name || item.refId}' not found.`);
    }

    const requestedSize = (item.size?.id || item.size || 'M').toString().toUpperCase();
    let price = menuItem.basePrice;
    if (menuItem.sizePricing && menuItem.sizePricing.length > 0) {
      const match = menuItem.sizePricing.find((s) => s.size.toUpperCase() === requestedSize);
      price = match ? match.price : (menuItem.sizePricing.find((s) => s.size === 'M') || menuItem.sizePricing[0]).price;
    }

    return {
      name: menuItem.name,
      refId: menuItem._id,
      image: menuItem.image || item.image || '/images/pizza-base.png',
      size: requestedSize,
      unitPrice: price,
      itemType: 'menuItem',
      customSelections: null,
    };
  }

  // 2. Combo Offer
  if (itemType === 'combo') {
    let combo = null;
    if (item.refId) {
      combo = await ComboOffer.findById(item.refId);
    }
    if (!combo && item.name) {
      combo = await ComboOffer.findOne({ name: item.name });
    }
    if (!combo) {
      throw new Error(`Combo offer '${item.name || item.refId}' not found.`);
    }

    return {
      name: combo.name,
      refId: combo._id,
      image: combo.image || item.image || '/images/pizza-base.png',
      size: 'Standard',
      unitPrice: combo.comboPrice,
      itemType: 'combo',
      customSelections: null,
    };
  }

  // 3. Custom-Built Pizza
  if (itemType === 'customPizza') {
    const custom = item.customSelections || {};
    const baseId = custom.base?._id || custom.base || item.base?._id || item.base;
    const sauceId = custom.sauce?._id || custom.sauce || item.sauce?._id || item.sauce;
    const cheeseId = custom.cheese?._id || custom.cheese || item.cheese?._id || item.cheese;

    const [baseOpt, sauceOpt, cheeseOpt] = await Promise.all([
      PizzaOption.findById(baseId),
      PizzaOption.findById(sauceId),
      PizzaOption.findById(cheeseId),
    ]);

    if (!baseOpt || !sauceOpt || !cheeseOpt) {
      throw new Error('Invalid base, sauce, or cheese selection for custom pizza.');
    }

    let toppingsPrice = 0;
    const rawToppings = custom.toppings || item.toppings || [];
    const toppingIds = rawToppings.map((t) => t._id || t).filter(Boolean);

    let resolvedToppings = [];
    if (toppingIds.length > 0) {
      const toppingOpts = await PizzaOption.find({ _id: { $in: toppingIds } });
      toppingsPrice = toppingOpts.reduce((acc, t) => acc + t.price, 0);
      resolvedToppings = toppingOpts.map((t) => ({ _id: t._id, name: t.name, price: t.price }));
    }

    const extraCheeseCost = custom.extraCheese ? 40 : 0;
    const computedPrice = baseOpt.price + sauceOpt.price + cheeseOpt.price + toppingsPrice + extraCheeseCost;

    return {
      name: item.name || 'Custom Artisan Pizza',
      refId: null,
      image: item.image || '/images/pizza-base.png',
      size: item.size?.id || item.size || 'M',
      unitPrice: computedPrice,
      itemType: 'customPizza',
      customSelections: {
        base: { _id: baseOpt._id, name: baseOpt.name, price: baseOpt.price },
        sauce: { _id: sauceOpt._id, name: sauceOpt.name, price: sauceOpt.price },
        cheese: { _id: cheeseOpt._id, name: cheeseOpt.name, price: cheeseOpt.price },
        toppings: resolvedToppings,
        removedToppings: custom.removedToppings || [],
        extraCheese: Boolean(custom.extraCheese),
      },
    };
  }

  throw new Error(`Unsupported item type: '${itemType}'`);
};

/**
 * @desc    Get current user's persistent cart (create empty if none)
 * @route   GET /api/cart
 * @access  Private (Authenticated User)
 */
export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        clerkId: req.user.clerkId || req.user.id || '',
        items: [],
      });
    } else if (!cart.clerkId && (req.user.clerkId || req.user.id)) {
      cart.clerkId = req.user.clerkId || req.user.id;
      await cart.save();
    }

    res.status(200).json({
      success: true,
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.items.reduce((acc, item) => acc + item.quantity, 0),
        subtotal: cart.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
        updatedAt: cart.updatedAt,
      },
    });
  } catch (error) {
    console.error('[Get Cart Error]', error);
    res.status(500).json({ error: 'Server error while fetching cart.' });
  }
};

/**
 * @desc    Add an item to cart (recomputes price server-side)
 * @route   POST /api/cart/items AND POST /api/cart/add
 * @access  Private (Authenticated User)
 */
export const addItemToCart = async (req, res) => {
  try {
    const rawItem = req.body;
    const quantity = Math.max(1, parseInt(rawItem.quantity, 10) || 1);

    // Recompute price strictly on server
    const verifiedData = await computeItemServerPrice(rawItem);

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        clerkId: req.user.clerkId || req.user.id || '',
        items: [],
      });
    } else if (!cart.clerkId && (req.user.clerkId || req.user.id)) {
      cart.clerkId = req.user.clerkId || req.user.id;
    }

    const cartId = rawItem.cartId || `cart-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Check if an identical non-custom item exists to increment quantity
    let existingIndex = -1;
    if (verifiedData.itemType !== 'customPizza') {
      existingIndex = cart.items.findIndex(
        (i) =>
          i.itemType === verifiedData.itemType &&
          String(i.refId) === String(verifiedData.refId) &&
          i.size === verifiedData.size
      );
    }

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
      cart.items[existingIndex].unitPrice = verifiedData.unitPrice; // update to fresh price
    } else {
      cart.items.push({
        cartId,
        itemType: verifiedData.itemType,
        refId: verifiedData.refId,
        name: verifiedData.name,
        size: verifiedData.size,
        quantity,
        unitPrice: verifiedData.unitPrice,
        image: verifiedData.image,
        customSelections: verifiedData.customSelections,
      });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item added to cart.',
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.items.reduce((acc, item) => acc + item.quantity, 0),
        subtotal: cart.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
      },
    });
  } catch (error) {
    console.error('[Add Item To Cart Error]', error.message);
    res.status(400).json({ error: error.message || 'Failed to add item to cart.' });
  }
};

/**
 * @desc    Update quantity of an item in cart
 * @route   PATCH /api/cart/items/:itemId OR PATCH /api/cart/item/:cartId
 * @access  Private (Authenticated User)
 */
export const updateCartItemQuantity = async (req, res) => {
  try {
    const itemId = req.params.itemId || req.params.cartId;
    const { quantity, delta } = req.body;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found.' });
    }

    const itemIndex = cart.items.findIndex(
      (i) => i.cartId === itemId || String(i._id) === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in cart.' });
    }

    if (quantity !== undefined) {
      const newQty = parseInt(quantity, 10);
      if (newQty <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = newQty;
      }
    } else if (delta !== undefined) {
      const newQty = cart.items[itemIndex].quantity + parseInt(delta, 10);
      if (newQty <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = newQty;
      }
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart updated.',
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.items.reduce((acc, item) => acc + item.quantity, 0),
        subtotal: cart.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
      },
    });
  } catch (error) {
    console.error('[Update Cart Item Quantity Error]', error);
    res.status(500).json({ error: 'Server error while updating cart.' });
  }
};

/**
 * @desc    Remove an item from cart
 * @route   DELETE /api/cart/items/:itemId OR DELETE /api/cart/item/:cartId
 * @access  Private (Authenticated User)
 */
export const removeCartItem = async (req, res) => {
  try {
    const itemId = req.params.itemId || req.params.cartId;
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found.' });
    }

    cart.items = cart.items.filter(
      (item) => item.cartId !== itemId && String(item._id) !== itemId
    );
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item removed from cart.',
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.items.reduce((acc, item) => acc + item.quantity, 0),
        subtotal: cart.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
      },
    });
  } catch (error) {
    console.error('[Remove Cart Item Error]', error);
    res.status(500).json({ error: 'Server error while removing item from cart.' });
  }
};

/**
 * @desc    Clear all items in user's cart
 * @route   DELETE /api/cart
 * @access  Private (Authenticated User)
 */
export const clearCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully.',
      cart: { items: [], totalItems: 0, subtotal: 0 },
    });
  } catch (error) {
    console.error('[Clear Cart Error]', error);
    res.status(500).json({ error: 'Server error while clearing cart.' });
  }
};

/**
 * @desc    Sync / Merge guest items into user's persistent cart upon login
 * @route   PUT /api/cart OR POST /api/cart/merge
 * @access  Private (Authenticated User)
 */
export const syncOrMergeCart = async (req, res) => {
  try {
    const { items, merge } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array.' });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const verifiedItems = [];
    for (const it of items) {
      try {
        const verified = await computeItemServerPrice(it);
        verifiedItems.push({
          cartId: it.cartId || `cart-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          itemType: verified.itemType,
          refId: verified.refId,
          name: verified.name,
          size: verified.size,
          quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
          unitPrice: verified.unitPrice,
          image: verified.image,
          customSelections: verified.customSelections,
        });
      } catch (err) {
        console.warn(`[Sync Cart Skip Item] ${err.message}`);
      }
    }

    if (merge) {
      // Merge unique or increment
      for (const vItem of verifiedItems) {
        const existingIdx = cart.items.findIndex((i) => i.cartId === vItem.cartId);
        if (existingIdx > -1) {
          cart.items[existingIdx].quantity += vItem.quantity;
        } else {
          cart.items.push(vItem);
        }
      }
    } else {
      cart.items = verifiedItems;
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart synced and prices verified.',
      cart: {
        id: cart._id,
        items: cart.items,
        totalItems: cart.items.reduce((acc, item) => acc + item.quantity, 0),
        subtotal: cart.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
      },
    });
  } catch (error) {
    console.error('[Sync Or Merge Cart Error]', error);
    res.status(500).json({ error: 'Server error while syncing cart.' });
  }
};
