import jwt from 'jsonwebtoken';
import { createClerkClient } from '@clerk/backend';
import User from '../models/User.js';

const clerkSecretKey = process.env.CLERK_SECRET_KEY || '';
const clerkClient = clerkSecretKey ? createClerkClient({ secretKey: clerkSecretKey }) : null;

/**
 * Protect routes: Verifies Clerk Authentication JWT Token (or legacy admin JWT)
 * and synchronizes user with MongoDB User model by clerkId
 */
export const protect = async (req, res, next) => {
  try {
    let token = null;

    // 1. Extract from Authorization Bearer header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2. Fallback to httpOnly cookies
    else if (req.cookies && (req.cookies.token || req.cookies.__session)) {
      token = req.cookies.token || req.cookies.__session;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required. Please log in to continue.',
      });
    }

    let clerkId = null;
    let tokenPayload = null;

    // Try decoding/verifying token
    try {
      if (clerkClient && clerkSecretKey) {
        // Full server-side cryptographic verification via Clerk Backend SDK
        const verified = await clerkClient.verifyToken(token);
        tokenPayload = verified;
        clerkId = verified.sub;
      } else {
        // Fallback/Local Dev mode: decode token claims
        tokenPayload = jwt.decode(token);
        if (tokenPayload && (tokenPayload.sub || tokenPayload.id)) {
          clerkId = tokenPayload.sub || tokenPayload.id;
        }
      }
    } catch (clerkErr) {
      // If token is a legacy custom JWT (e.g. from admin)
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'development_jwt_secret_key_12345');
        tokenPayload = decoded;
        clerkId = decoded.id;
      } catch (jwtErr) {
        return res.status(401).json({ error: 'Invalid or expired authentication session.' });
      }
    }

    if (!clerkId && !tokenPayload) {
      return res.status(401).json({ error: 'Invalid authentication session.' });
    }

    // 1. First search user by Clerk ID
    let user = await User.findOne({ clerkId });

    // 2. If not found by clerkId, check by MongoDB _id (legacy users)
    if (!user && clerkId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(clerkId);
    }

    // 3. Auto-provision/sync customer record in MongoDB for new Clerk users
    if (!user && clerkId) {
      let email = tokenPayload?.email || (tokenPayload?.primary_email_address_id ? `${clerkId}@clerk.user` : `${clerkId}@customer.pizzaslice.app`);
      
      // If clerkClient is available, fetch full user details from Clerk API
      if (clerkClient) {
        try {
          const clerkUser = await clerkClient.users.getUser(clerkId);
          if (clerkUser) {
            email = clerkUser.emailAddresses?.[0]?.emailAddress || email;
          }
        } catch (fetchErr) {
          // ignore lookup error and proceed with defaults
        }
      }

      // Check if user already exists with this email to link accounts
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        existingUser.clerkId = clerkId;
        user = await existingUser.save();
      } else {
        const name = tokenPayload?.name || tokenPayload?.fullName || 'Pizza Customer';
        user = await User.create({
          clerkId,
          name,
          email,
          role: 'user',
          isVerified: true,
          loyaltyPoints: 50, // Welcome signup bonus!
        });
      }
    }

    if (!user) {
      return res.status(401).json({
        error: 'User belonging to this authentication session could not be found.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    return res.status(500).json({ error: 'Internal authentication error.' });
  }
};

/**
 * Restrict access to specific roles (e.g. 'admin')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `User role '${req.user?.role || 'guest'}' is not authorized to access this resource.`,
      });
    }
    next();
  };
};
