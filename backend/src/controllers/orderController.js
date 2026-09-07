import crypto from 'crypto';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import Order from '../models/Order.js';
import User from '../models/User.js';
import PizzaOption from '../models/PizzaOption.js';
import LoyaltyTransaction from '../models/LoyaltyTransaction.js';
import { createRazorpayOrder } from '../config/razorpay.js';
import { verifyRedemptionToken } from './loyaltyController.js';
import { validateDeliveryLocation } from '../config/delivery.js';

/**
 * @desc    Create a new pizza order and initialize Razorpay payment order
 * @route   POST /api/orders
 * @access  Private (Authenticated User)
 */
export const createOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    let rawItems = req.body.items;

    // Support single custom pizza item passed directly at root level
    if (!rawItems && req.body.base && req.body.sauce && req.body.cheese) {
      rawItems = [
        {
          base: req.body.base,
          sauce: req.body.sauce,
          cheese: req.body.cheese,
          veggies: req.body.veggies || [],
          quantity: req.body.quantity || 1,
        },
      ];
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one pizza item.' });
    }

    let calculatedTotal = 0;
    const processedItems = [];

    for (const item of rawItems) {
      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      const itemType = item.itemType || (item.base ? 'customPizza' : 'menuItem');

      // 1. Ready-made Menu Item or Combo Offer
      if (itemType === 'menuItem' || itemType === 'combo') {
        const { computeItemServerPrice } = await import('./cartController.js');
        const verified = await computeItemServerPrice(item);
        const itemTotal = verified.unitPrice * quantity;
        calculatedTotal += itemTotal;

        processedItems.push({
          itemType: verified.itemType,
          name: verified.name,
          size: verified.size,
          refId: verified.refId,
          base: null,
          sauce: null,
          cheese: null,
          veggies: [],
          quantity,
          itemPrice: verified.unitPrice,
        });
      }
      // 2. Custom Pizza (with base, sauce, cheese, veggies)
      else if (itemType === 'customPizza') {
        const baseId = item.customSelections?.base?._id || item.customSelections?.base || item.base?._id || item.base;
        const sauceId = item.customSelections?.sauce?._id || item.customSelections?.sauce || item.sauce?._id || item.sauce;
        const cheeseId = item.customSelections?.cheese?._id || item.customSelections?.cheese || item.cheese?._id || item.cheese;

        const [baseOption, sauceOption, cheeseOption] = await Promise.all([
          PizzaOption.findById(baseId),
          PizzaOption.findById(sauceId),
          PizzaOption.findById(cheeseId),
        ]);

        if (!baseOption || !baseOption.isActive) {
          return res.status(400).json({ error: `Selected base option is invalid or unavailable.` });
        }
        if (baseOption.stockQty < quantity) {
          return res.status(400).json({ error: `Insufficient stock for base: '${baseOption.name}'.` });
        }

        if (!sauceOption || !sauceOption.isActive) {
          return res.status(400).json({ error: `Selected sauce option is invalid or unavailable.` });
        }
        if (sauceOption.stockQty < quantity) {
          return res.status(400).json({ error: `Insufficient stock for sauce: '${sauceOption.name}'.` });
        }

        if (!cheeseOption || !cheeseOption.isActive) {
          return res.status(400).json({ error: `Selected cheese option is invalid or unavailable.` });
        }
        if (cheeseOption.stockQty < quantity) {
          return res.status(400).json({ error: `Insufficient stock for cheese: '${cheeseOption.name}'.` });
        }

        // Process vegetables / toppings if selected
        const rawVeggies = item.customSelections?.toppings || item.veggies || [];
        const veggieIds = rawVeggies.map((v) => v._id || v).filter(Boolean);
        let veggieOptions = [];
        if (veggieIds.length > 0) {
          veggieOptions = await PizzaOption.find({
            _id: { $in: veggieIds },
            isActive: true,
          });

          if (veggieOptions.length !== veggieIds.length) {
            return res.status(400).json({ error: 'One or more selected toppings are invalid or unavailable.' });
          }

          for (const veg of veggieOptions) {
            if (veg.stockQty < quantity) {
              return res.status(400).json({ error: `Insufficient stock for topping: '${veg.name}'.` });
            }
          }
        }

        const extraCheeseCost = item.customSelections?.extraCheese || item.extraCheese ? 40 : 0;
        const veggieSum = veggieOptions.reduce((acc, veg) => acc + veg.price, 0);
        const unitPrice = baseOption.price + sauceOption.price + cheeseOption.price + veggieSum + extraCheeseCost;
        const itemTotal = unitPrice * quantity;

        calculatedTotal += itemTotal;

        processedItems.push({
          itemType: 'customPizza',
          name: item.name || 'Custom Gourmet Pizza',
          size: item.size?.id || item.size || 'M',
          refId: null,
          base: baseOption._id,
          sauce: sauceOption._id,
          cheese: cheeseOption._id,
          veggies: veggieOptions.map((v) => v._id),
          quantity,
          itemPrice: unitPrice,
        });
      }
    }

    // Process optional loyalty points redemption token strictly server-side
    let discountAmount = 0;
    let pointsRedeemed = 0;

    if (req.body.redemptionToken) {
      const tokenVerification = verifyRedemptionToken(req.body.redemptionToken, req.user._id);
      if (!tokenVerification.valid) {
        return res.status(400).json({ error: tokenVerification.error });
      }

      // Check current user points in DB
      const user = await User.findById(req.user._id);
      if (!user || (user.loyaltyPoints || 0) < tokenVerification.pointsToRedeem) {
        return res.status(400).json({
          error: 'Insufficient loyalty points balance to apply this discount.',
        });
      }

      pointsRedeemed = tokenVerification.pointsToRedeem;
      discountAmount = Math.min(calculatedTotal, tokenVerification.discountAmount);
    }

    // Validate Delivery Radius (if coordinates are provided)
    let customerLat = parseFloat(req.body.latitude || req.body.deliveryAddress?.latitude);
    let customerLng = parseFloat(req.body.longitude || req.body.deliveryAddress?.longitude);
    let distanceKm = null;

    if (!isNaN(customerLat) && !isNaN(customerLng)) {
      const locationCheck = validateDeliveryLocation(customerLat, customerLng);
      if (!locationCheck.isDeliverable) {
        return res.status(400).json({
          error: `Sorry, we currently do not deliver to this location (${locationCheck.distanceKm} km away). Our delivery radius is ${locationCheck.maxRadiusKm} km from our kitchen.`,
          distanceKm: locationCheck.distanceKm,
          maxRadiusKm: locationCheck.maxRadiusKm,
        });
      }
      distanceKm = locationCheck.distanceKm;
    }

    const finalPayableTotal = Math.max(0, calculatedTotal - discountAmount);

    // Initialize Razorpay Order with amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.max(100, Math.round(finalPayableTotal * 100));
    const razorpayOrder = await createRazorpayOrder({
      amountInPaise,
      receipt: `order_${Date.now()}_${req.user._id.toString().slice(-4)}`,
      notes: {
        userId: req.user._id.toString(),
        clerkId: req.user.clerkId || '',
        totalItems: processedItems.length,
        pointsRedeemed,
        discountAmount,
        distanceKm: distanceKm || 0,
      },
    });

    // Create pending Order in MongoDB
    const newOrder = new Order({
      user: req.user._id,
      clerkUserId: req.user.clerkId || req.user.id || null,
      items: processedItems,
      subtotal: calculatedTotal,
      discountAmount,
      pointsRedeemed,
      totalAmount: finalPayableTotal,
      paymentStatus: 'pending',
      razorpayOrderId: razorpayOrder.id,
      status: 'Order Received',
      statusHistory: [{ status: 'Order Received', timestamp: new Date() }],
      latitude: !isNaN(customerLat) ? customerLat : null,
      longitude: !isNaN(customerLng) ? customerLng : null,
      deliveryDistanceKm: distanceKm,
      deliveryAddress: req.body.deliveryAddress || {},
    });

    await newOrder.save();

    // Deduct points only once order is actually created
    if (pointsRedeemed > 0) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { loyaltyPoints: -pointsRedeemed },
      });

      await LoyaltyTransaction.create({
        user: req.user._id,
        order: newOrder._id,
        type: 'redeemed',
        points: -pointsRedeemed,
        discountAmount,
        description: `Redeemed ${pointsRedeemed} points for ₹${discountAmount} discount on Order #${newOrder._id.toString().slice(-6).toUpperCase()}`,
      });
    }

    res.status(201).json({
      orderId: newOrder._id,
      razorpayOrderId: razorpayOrder.id,
      subtotal: calculatedTotal,
      discountAmount,
      pointsRedeemed,
      amount: finalPayableTotal,
      currency: 'INR',
      key_id: process.env.RAZORPAY_KEY_ID || 'dummy_razorpay_key_id',
    });
  } catch (error) {
    console.error('[Create Order Error]', error);
    res.status(500).json({ error: 'Server error while creating pizza order.' });
  }
};

/**
 * @desc    Verify Razorpay payment HMAC signature and finalize order + deduct stock + award loyalty points
 * @route   POST /api/orders/verify
 * @access  Private (Authenticated User)
 */
export const verifyPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  try {
    const order = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found or does not belong to user.' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(200).json({
        message: 'Order is already verified and paid.',
        order,
      });
    }

    // Cryptographic HMAC SHA-256 signature verification
    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_razorpay_key_secret';
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    let isSignatureValid = false;
    if (razorpay_signature && expectedSignature.length === razorpay_signature.length) {
      isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(razorpay_signature, 'utf-8')
      );
    }

    if (!isSignatureValid) {
      order.paymentStatus = 'failed';
      await order.save();
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // Signature verified! Update payment status
    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.status = 'Order Received';
    if (req.body.deliveryAddress) order.deliveryAddress = req.body.deliveryAddress;
    if (req.body.latitude) order.latitude = parseFloat(req.body.latitude);
    if (req.body.longitude) order.longitude = parseFloat(req.body.longitude);
    if (order.latitude && order.longitude) {
      const locationCheck = validateDeliveryLocation(order.latitude, order.longitude);
      order.deliveryDistanceKm = locationCheck.distanceKm;
    }
    order.statusHistory.push({ status: 'Order Received', timestamp: new Date() });
    await order.save();

    // Decrement stock quantity for each selected custom pizza ingredient
    for (const item of order.items) {
      if (item.itemType === 'customPizza' || item.base) {
        const qty = item.quantity;
        const ingredientIds = [item.base, item.sauce, item.cheese, ...(item.veggies || [])].filter(Boolean);

        await Promise.all(
          ingredientIds.map((id) =>
            PizzaOption.findByIdAndUpdate(id, {
              $inc: { stockQty: -qty },
            })
          )
        );
      }
    }

    // Award loyalty points: 1 point per ₹10 of totalAmount (rounded down)
    const pointsEarned = Math.floor(order.totalAmount / 10);

    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        loyaltyPoints: pointsEarned,
        lifetimeSpend: order.totalAmount,
      },
    });

    if (pointsEarned > 0) {
      await LoyaltyTransaction.create({
        user: req.user._id,
        order: order._id,
        type: 'earned',
        points: pointsEarned,
        discountAmount: 0,
        description: `Earned ${pointsEarned} points for Order #${order._id.toString().slice(-6).toUpperCase()}`,
      });
    }

    res.status(200).json({
      message: 'Payment verified, stock updated, and loyalty points awarded successfully.',
      order,
      pointsEarned,
    });
  } catch (error) {
    console.error('[Verify Payment Error]', error);
    res.status(500).json({ error: 'Server error during payment verification.' });
  }
};

/**
 * @desc    Get currently logged in user's orders with pagination and optional filters
 * @route   GET /api/orders/mine?page=1&limit=10&status=Delivered&from=2026-08-01&to=2026-08-30
 * @access  Private (Authenticated User)
 */
export const getMyOrders = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { user: req.user._id };

    // 1. Optional Status Filter
    if (req.query.status && req.query.status !== 'all' && req.query.status !== 'All') {
      query.status = req.query.status;
    }

    // 2. Optional Date Range Filters
    if (req.query.from || req.query.to) {
      query.createdAt = {};
      if (req.query.from) {
        const fromDate = new Date(req.query.from);
        if (!isNaN(fromDate.getTime())) {
          fromDate.setHours(0, 0, 0, 0);
          query.createdAt.$gte = fromDate;
        }
      }
      if (req.query.to) {
        const toDate = new Date(req.query.to);
        if (!isNaN(toDate.getTime())) {
          toDate.setHours(23, 59, 59, 999);
          query.createdAt.$lte = toDate;
        }
      }
    }

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit) || 1;

    const orders = await Order.find(query)
      .populate('items.base', 'name price type')
      .populate('items.sauce', 'name price type')
      .populate('items.cheese', 'name price type')
      .populate('items.veggies', 'name price type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
      pagination: {
        totalOrders,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('[Get My Orders Error]', error);
    res.status(500).json({ error: 'Server error while fetching orders.' });
  }
};

/**
 * @desc    Get full itemized details for a single user-owned order
 * @route   GET /api/orders/:id
 * @access  Private (Authenticated User)
 */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid order ID format.' });
    }

    const order = await Order.findById(id)
      .populate('items.base', 'name price type')
      .populate('items.sauce', 'name price type')
      .populate('items.cheese', 'name price type')
      .populate('items.veggies', 'name price type')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Verify ownership: User must own the order (or be admin)
    const isOwner = order.user._id
      ? order.user._id.toString() === req.user._id.toString()
      : order.user.toString() === req.user._id.toString();

    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view this order.' });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('[Get Order By ID Error]', error);
    res.status(500).json({ error: 'Server error while fetching order details.' });
  }
};
