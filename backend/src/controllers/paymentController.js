import crypto from 'crypto';
import { validationResult } from 'express-validator';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import PizzaOption from '../models/PizzaOption.js';
import LoyaltyTransaction from '../models/LoyaltyTransaction.js';
import { createRazorpayOrder } from '../config/razorpay.js';
import { computeItemServerPrice } from './cartController.js';
import { verifyRedemptionToken } from './loyaltyController.js';
import { getIO } from '../config/socket.js';

/**
 * @desc    Create Razorpay Order from server-calculated user cart
 * @route   POST /api/payment/create-order
 * @access  Private (Authenticated Clerk User)
 */
export const createPaymentOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const userId = req.user._id;
    const clerkId = req.user.clerkId || req.user.id;

    // 1. Fetch current user's persistent cart from MongoDB
    let userCart = await Cart.findOne({ user: userId });
    let rawItems = (userCart && userCart.items && userCart.items.length > 0) ? userCart.items : req.body.items;

    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty. Please add items before checkout.' });
    }

    // 2. Compute prices and item specs strictly on the server
    let calculatedSubtotal = 0;
    const processedItems = [];

    for (const item of rawItems) {
      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
      const verified = await computeItemServerPrice(item);
      const itemTotal = verified.unitPrice * quantity;
      calculatedSubtotal += itemTotal;

      processedItems.push({
        itemType: verified.itemType,
        name: verified.name,
        size: verified.size,
        refId: verified.refId,
        base: verified.customSelections?.base?._id || null,
        sauce: verified.customSelections?.sauce?._id || null,
        cheese: verified.customSelections?.cheese?._id || null,
        veggies: (verified.customSelections?.toppings || []).map((t) => t._id || t),
        quantity,
        itemPrice: verified.unitPrice,
      });
    }

    // 3. Process optional server-side loyalty points discount
    let discountAmount = 0;
    let pointsRedeemed = 0;

    if (req.body.redemptionToken) {
      const tokenVerification = verifyRedemptionToken(req.body.redemptionToken, userId);
      if (tokenVerification.valid) {
        const userDoc = await User.findById(userId);
        if (userDoc && (userDoc.loyaltyPoints || 0) >= tokenVerification.pointsToRedeem) {
          pointsRedeemed = tokenVerification.pointsToRedeem;
          discountAmount = Math.min(calculatedSubtotal, tokenVerification.discountAmount);
        }
      }
    }

    const deliveryFee = 0; // Free delivery promo
    const tax = 0; // Inclusive
    const finalPayableTotal = Math.max(0, calculatedSubtotal - discountAmount + deliveryFee + tax);

    // 4. Amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.max(100, Math.round(finalPayableTotal * 100));
    const receiptId = `rcpt_${Date.now()}_${userId.toString().slice(-4)}`;

    const razorpayOrder = await createRazorpayOrder({
      amountInPaise,
      receipt: receiptId,
      notes: {
        userId: userId.toString(),
        clerkId: clerkId || '',
        itemCount: processedItems.length,
        pointsRedeemed,
        discountAmount,
      },
    });

    // 5. Pre-save or update pending order record in MongoDB
    let existingPendingOrder = await Order.findOne({
      user: userId,
      paymentStatus: 'pending',
      razorpayOrderId: razorpayOrder.id,
    });

    if (!existingPendingOrder) {
      existingPendingOrder = new Order({
        user: userId,
        clerkUserId: clerkId,
        items: processedItems,
        subtotal: calculatedSubtotal,
        deliveryFee,
        tax,
        discountAmount,
        pointsRedeemed,
        totalAmount: finalPayableTotal,
        paymentStatus: 'pending',
        razorpayOrderId: razorpayOrder.id,
        status: 'Order Received',
        statusHistory: [{ status: 'Order Received', timestamp: new Date() }],
        deliveryAddress: req.body.deliveryAddress || {},
      });
      await existingPendingOrder.save();
    }

    res.status(200).json({
      success: true,
      order_id: razorpayOrder.id,
      razorpayOrderId: razorpayOrder.id,
      orderId: existingPendingOrder._id,
      amount: razorpayOrder.amount, // in paise
      finalAmount: finalPayableTotal, // in INR
      subtotal: calculatedSubtotal,
      discountAmount,
      deliveryFee,
      tax,
      currency: 'INR',
      key_id: process.env.RAZORPAY_KEY_ID || 'dummy_razorpay_key_id',
    });
  } catch (error) {
    console.error('[Payment create-order error]', error);
    res.status(500).json({ error: error.message || 'Failed to initialize payment order.' });
  }
};

/**
 * @desc    Verify Razorpay HMAC signature and finalize Order in database
 * @route   POST /api/payment/verify
 * @access  Private (Authenticated Clerk User)
 */
export const verifyPayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    deliveryAddress,
  } = req.body;

  try {
    const userId = req.user._id;
    const clerkId = req.user.clerkId || req.user.id;

    // 1. Verify HMAC SHA-256 signature using RAZORPAY_KEY_SECRET
    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_razorpay_key_secret';
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    let isSignatureValid = false;
    if (razorpay_signature && expectedSignature.length === razorpay_signature.length) {
      isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(razorpay_signature, 'utf-8')
      );
    } else if (secret.includes('dummy') && (razorpay_signature?.startsWith('sig_') || razorpay_signature === 'test_signature_valid')) {
      // In local development / test simulation mode without real Razorpay keys
      isSignatureValid = true;
    }

    if (!isSignatureValid) {
      console.warn(`[Razorpay Signature Mismatch] order: ${razorpay_order_id}`);
      await Order.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id, user: userId },
        { paymentStatus: 'failed' }
      );
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // 2. Locate or create the confirmed order
    let order = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
      user: userId,
    });

    if (!order) {
      // Fallback: If pending order was not pre-saved, construct from current user cart
      const userCart = await Cart.findOne({ user: userId });
      const rawItems = (userCart && userCart.items) || [];
      const processedItems = [];
      let subtotal = 0;

      for (const item of rawItems) {
        const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
        const verified = await computeItemServerPrice(item);
        subtotal += verified.unitPrice * qty;
        processedItems.push({
          itemType: verified.itemType,
          name: verified.name,
          size: verified.size,
          refId: verified.refId,
          base: verified.customSelections?.base?._id || null,
          sauce: verified.customSelections?.sauce?._id || null,
          cheese: verified.customSelections?.cheese?._id || null,
          veggies: (verified.customSelections?.toppings || []).map((t) => t._id || t),
          quantity: qty,
          itemPrice: verified.unitPrice,
        });
      }

      order = new Order({
        user: userId,
        clerkUserId: clerkId,
        items: processedItems,
        subtotal,
        totalAmount: subtotal,
        razorpayOrderId: razorpay_order_id,
        deliveryAddress: deliveryAddress || {},
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified.',
        orderId: order._id,
        paymentId: order.razorpayPaymentId || razorpay_payment_id,
        total: order.totalAmount,
        order,
      });
    }

    // 3. Mark as paid
    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.status = 'Order Received';
    if (!order.clerkUserId) {
      order.clerkUserId = clerkId;
    }
    if (deliveryAddress) {
      order.deliveryAddress = deliveryAddress;
    }
    order.statusHistory.push({ status: 'Order Received', timestamp: new Date() });
    await order.save();

    // 4. Decrement stock for ingredients of custom pizzas
    for (const item of order.items) {
      if (item.itemType === 'customPizza' || item.base) {
        const qty = item.quantity || 1;
        const ingredientIds = [item.base, item.sauce, item.cheese, ...(item.veggies || [])].filter(Boolean);
        await Promise.all(
          ingredientIds.map((id) =>
            PizzaOption.findByIdAndUpdate(id, { $inc: { stockQty: -qty } })
          )
        );
      }
    }

    // 5. Deduct redeemed points & award earned loyalty points
    if (order.pointsRedeemed > 0) {
      await User.findByIdAndUpdate(userId, {
        $inc: { loyaltyPoints: -order.pointsRedeemed },
      });
      await LoyaltyTransaction.create({
        user: userId,
        order: order._id,
        type: 'redeemed',
        points: -order.pointsRedeemed,
        discountAmount: order.discountAmount,
        description: `Redeemed ${order.pointsRedeemed} points for ₹${order.discountAmount} discount on Order #${order._id.toString().slice(-6).toUpperCase()}`,
      });
    }

    const pointsEarned = Math.floor(order.totalAmount / 10);
    await User.findByIdAndUpdate(userId, {
      $inc: {
        loyaltyPoints: pointsEarned,
        lifetimeSpend: order.totalAmount,
      },
    });

    if (pointsEarned > 0) {
      await LoyaltyTransaction.create({
        user: userId,
        order: order._id,
        type: 'earned',
        points: pointsEarned,
        discountAmount: 0,
        description: `Earned ${pointsEarned} points for Order #${order._id.toString().slice(-6).toUpperCase()}`,
      });
    }

    // 6. Real-time Socket.IO update for live tracking & Admin notification
    try {
      const io = getIO();
      io.emit('order:created', order);
      io.emit('order:status-updated', order);
    } catch (_) {}

    // 7. Clear ONLY this authenticated user's cart from MongoDB
    await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } }
    );

    res.status(200).json({
      success: true,
      message: 'Payment verified and order confirmed successfully.',
      orderId: order._id,
      paymentId: razorpay_payment_id,
      total: order.totalAmount,
      order,
    });
  } catch (error) {
    console.error('[Payment verify error]', error);
    res.status(500).json({ error: error.message || 'Payment verification failed.' });
  }
};
