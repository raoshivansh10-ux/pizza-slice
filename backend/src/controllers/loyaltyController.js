import crypto from 'crypto';
import User from '../models/User.js';
import LoyaltyTransaction from '../models/LoyaltyTransaction.js';

const REDEMPTION_SECRET = process.env.JWT_SECRET || 'development_jwt_secret_key_12345';
export const POINTS_TO_INR_RATE = 0.5; // 100 points = ₹50

/**
 * Compute loyalty tier, progress bar, and multiplier from lifetime spend
 */
export const computeTierInfo = (lifetimeSpend = 0) => {
  const spend = Math.max(0, Number(lifetimeSpend) || 0);

  if (spend >= 6000) {
    return {
      tier: 'Gold',
      tierBadge: '🥇 Gold VIP',
      minSpend: 6000,
      nextTier: null,
      nextTierThreshold: null,
      progressPct: 100,
      spendNeededForNextTier: 0,
      multiplier: 1.5,
    };
  }

  if (spend >= 2000) {
    const progress = Math.min(100, Math.round(((spend - 2000) / (6000 - 2000)) * 100));
    return {
      tier: 'Silver',
      tierBadge: '🥈 Silver Member',
      minSpend: 2000,
      nextTier: 'Gold',
      nextTierThreshold: 6000,
      progressPct: progress,
      spendNeededForNextTier: Math.max(0, 6000 - spend),
      multiplier: 1.2,
    };
  }

  const progress = Math.min(100, Math.round((spend / 2000) * 100));
  return {
    tier: 'Bronze',
    tierBadge: '🥉 Bronze Member',
    minSpend: 0,
    nextTier: 'Silver',
    nextTierThreshold: 2000,
    progressPct: progress,
    spendNeededForNextTier: Math.max(0, 2000 - spend),
    multiplier: 1.0,
  };
};

/**
 * Cryptographically signed HMAC redemption token generator
 */
export const generateRedemptionToken = (userId, pointsToRedeem, discountAmount) => {
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes expiration
  const payload = `${userId}:${pointsToRedeem}:${discountAmount}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', REDEMPTION_SECRET).update(payload).digest('hex');
  const tokenData = Buffer.from(
    JSON.stringify({ userId, pointsToRedeem, discountAmount, expiresAt, signature })
  ).toString('base64');
  return { token: tokenData, expiresAt };
};

/**
 * Validate and unpack HMAC redemption token
 */
export const verifyRedemptionToken = (tokenString, currentUserId) => {
  try {
    if (!tokenString || typeof tokenString !== 'string') {
      return { valid: false, error: 'Redemption token is missing or invalid.' };
    }

    const decoded = JSON.parse(Buffer.from(tokenString, 'base64').toString('utf-8'));
    const { userId, pointsToRedeem, discountAmount, expiresAt, signature } = decoded;

    if (!userId || pointsToRedeem === undefined || discountAmount === undefined || !expiresAt || !signature) {
      return { valid: false, error: 'Malformed redemption token payload.' };
    }

    if (userId.toString() !== currentUserId.toString()) {
      return { valid: false, error: 'Redemption token does not belong to this user.' };
    }

    if (Date.now() > expiresAt) {
      return { valid: false, error: 'Redemption quote has expired. Please apply points again.' };
    }

    const payload = `${userId}:${pointsToRedeem}:${discountAmount}:${expiresAt}`;
    const expectedSig = crypto.createHmac('sha256', REDEMPTION_SECRET).update(payload).digest('hex');

    if (signature.length !== expectedSig.length) {
      return { valid: false, error: 'Invalid token signature length.' };
    }

    const isSigValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'utf-8'),
      Buffer.from(expectedSig, 'utf-8')
    );

    if (!isSigValid) {
      return { valid: false, error: 'Invalid or forged redemption token signature.' };
    }

    // Strict check: calculated discount must match server rate
    const calculatedDiscount = Math.round(Number(pointsToRedeem) * POINTS_TO_INR_RATE);
    if (Number(discountAmount) !== calculatedDiscount) {
      return { valid: false, error: 'Discount amount does not match server redemption rate.' };
    }

    return {
      valid: true,
      pointsToRedeem: Number(pointsToRedeem),
      discountAmount: Number(discountAmount),
    };
  } catch (err) {
    return { valid: false, error: 'Invalid redemption token encoding.' };
  }
};

/**
 * @desc    Get logged in user's loyalty status, tier, progress, and transaction history
 * @route   GET /api/loyalty/me
 * @access  Private (Authenticated User)
 */
export const getLoyaltyStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const points = user.loyaltyPoints || 0;
    const spend = user.lifetimeSpend || 0;
    const tierInfo = computeTierInfo(spend);

    const transactions = await LoyaltyTransaction.find({ user: user._id })
      .populate('order', 'totalAmount status createdAt')
      .sort({ createdAt: -1 })
      .limit(30);

    res.status(200).json({
      success: true,
      loyalty: {
        pointsBalance: points,
        rupeeEquivalent: Math.round(points * POINTS_TO_INR_RATE),
        lifetimeSpend: spend,
        ...tierInfo,
        conversionRate: {
          points: 100,
          inr: 50,
          ratePerPoint: POINTS_TO_INR_RATE,
        },
      },
      transactions,
    });
  } catch (error) {
    console.error('[Get Loyalty Status Error]', error);
    res.status(500).json({ error: 'Server error while fetching loyalty status.' });
  }
};

/**
 * @desc    Request a redemption quote and receive a signed HMAC redemption token (No points deducted yet)
 * @route   POST /api/loyalty/redeem
 * @access  Private (Authenticated User)
 */
export const redeemPointsQuote = async (req, res) => {
  try {
    const { pointsToRedeem } = req.body;
    const pointsNum = parseInt(pointsToRedeem, 10);

    if (isNaN(pointsNum) || pointsNum <= 0) {
      return res.status(400).json({ error: 'Please specify a positive number of points to redeem.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const availablePoints = user.loyaltyPoints || 0;
    if (pointsNum > availablePoints) {
      return res.status(400).json({
        error: `Insufficient points balance. You requested ${pointsNum} pts, but have ${availablePoints} pts available.`,
      });
    }

    // Server-side calculated discount: 100 points = ₹50 (1 pt = ₹0.50)
    const discountAmount = Math.round(pointsNum * POINTS_TO_INR_RATE);

    if (discountAmount <= 0) {
      return res.status(400).json({ error: 'Redemption points must result in at least ₹1 discount.' });
    }

    // Generate signed HMAC token
    const { token, expiresAt } = generateRedemptionToken(user._id, pointsNum, discountAmount);

    res.status(200).json({
      success: true,
      message: `Redemption quote calculated: ${pointsNum} points = ₹${discountAmount} discount.`,
      redemption: {
        pointsToRedeem: pointsNum,
        discountAmount,
        redemptionToken: token,
        expiresAt,
        availablePointsRemaining: availablePoints - pointsNum,
      },
    });
  } catch (error) {
    console.error('[Redeem Points Quote Error]', error);
    res.status(500).json({ error: 'Server error while calculating redemption quote.' });
  }
};
