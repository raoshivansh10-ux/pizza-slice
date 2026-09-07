import mongoose from 'mongoose';
import { validationResult } from 'express-validator';
import Review from '../models/Review.js';
import Order from '../models/Order.js';

/**
 * @desc    Submit a review for a delivered order
 * @route   POST /api/reviews
 * @access  Private (Authenticated User)
 */
export const createReview = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { orderId, rating, comment } = req.body;

  try {
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: 'Valid Order ID is required.' });
    }

    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
    }

    // 1. Fetch Order
    const order = await Order.findById(orderId)
      .populate('items.base', 'name')
      .populate('items.sauce', 'name')
      .populate('items.cheese', 'name')
      .populate('items.veggies', 'name');

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // 2. Strict Security: Verify Order Ownership
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only review orders placed by your account.' });
    }

    // 3. Strict Security: Verify Order Status is "Delivered"
    if (order.status !== 'Delivered') {
      return res.status(400).json({
        error: `Reviews can only be submitted for delivered orders (current status: '${order.status}').`,
      });
    }

    // 4. Strict Security: Prevent Duplicate Reviews
    const existingReview = await Review.findOne({ order: orderId });
    if (existingReview) {
      return res.status(400).json({ error: 'A review has already been submitted for this order.' });
    }

    // Extract pizza descriptions/varieties for summary tagging
    const pizzaVarieties = order.items.map((item, idx) => {
      const crust = item.base?.name || 'Hand Tossed';
      const sauce = item.sauce?.name || 'Marinara';
      const cheese = item.cheese?.name || 'Mozzarella';
      return `${crust} (${sauce}, ${cheese})`;
    });

    // 5. Create and Save Review
    const newReview = new Review({
      order: order._id,
      user: req.user._id,
      rating: ratingNum,
      comment: (comment || '').trim().slice(0, 500),
      pizzaVarieties,
    });

    await newReview.save();

    res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been submitted successfully.',
      review: newReview,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'A review has already been submitted for this order.' });
    }
    console.error('[Create Review Error]', error);
    res.status(500).json({ error: 'Server error while submitting review.' });
  }
};

/**
 * @desc    Get currently logged in user's submitted reviews
 * @route   GET /api/reviews/mine
 * @access  Private (Authenticated User)
 */
export const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .populate({
        path: 'order',
        select: 'totalAmount status createdAt items deliveryAddress',
        populate: [
          { path: 'items.base', select: 'name' },
          { path: 'items.sauce', select: 'name' },
          { path: 'items.cheese', select: 'name' },
          { path: 'items.veggies', select: 'name' },
        ],
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error('[Get My Reviews Error]', error);
    res.status(500).json({ error: 'Server error while fetching reviews.' });
  }
};

/**
 * @desc    Get public reviews summary (overall average rating, counts, distribution)
 * @route   GET /api/reviews/summary
 * @access  Public
 */
export const getReviewsSummary = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    const totalReviews = await Review.countDocuments();

    if (totalReviews === 0) {
      return res.status(200).json({
        success: true,
        summary: {
          averageRating: 5.0, // Default baseline for brand new artisan store
          totalReviews: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          recentReviews: [],
        },
      });
    }

    const aggregateResult = await Review.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    const averageRating = aggregateResult.length > 0
      ? Number(aggregateResult[0].avgRating.toFixed(1))
      : 5.0;

    const distributionAgg = await Review.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]);

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const item of distributionAgg) {
      if (ratingDistribution[item._id] !== undefined) {
        ratingDistribution[item._id] = item.count;
      }
    }

    res.status(200).json({
      success: true,
      summary: {
        averageRating,
        totalReviews,
        ratingDistribution,
        recentReviews: reviews.slice(0, 6),
      },
    });
  } catch (error) {
    console.error('[Get Reviews Summary Error]', error);
    res.status(500).json({ error: 'Server error while calculating reviews summary.' });
  }
};
