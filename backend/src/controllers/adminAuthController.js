import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import Admin from '../models/Admin.js';

/**
 * Helper to generate admin JWT and attach distinct admin_token httpOnly cookie
 */
const sendAdminTokenCookie = (admin, res, message = 'Admin login successful.') => {
  const token = jwt.sign(
    { id: admin._id, role: 'admin' },
    process.env.JWT_SECRET || 'development_jwt_secret_key_12345',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  };

  // Distinct cookie name to prevent session collision with regular customer users
  res.cookie('admin_token', token, cookieOptions);

  return res.status(200).json({
    message,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: 'admin',
    },
  });
};

/**
 * @desc    Authenticate admin user and set admin_token cookie
 * @route   POST /api/admin/login
 * @access  Restricted (Admin only credentials)
 */
export const adminLogin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { email, password } = req.body;

  try {
    // Look up exclusively in the Admin collection
    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');

    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid admin email or password.' });
    }

    sendAdminTokenCookie(admin, res);
  } catch (error) {
    console.error('[Admin Login Error]', error);
    res.status(500).json({ error: 'Server error during admin authentication.' });
  }
};

/**
 * @desc    Get currently logged in admin profile
 * @route   GET /api/admin/me
 * @access  Private / Admin only
 */
export const adminGetMe = async (req, res) => {
  res.status(200).json({
    admin: req.admin,
  });
};

/**
 * @desc    Log out admin and clear admin_token cookie
 * @route   POST /api/admin/logout
 * @access  Private / Admin only
 */
export const adminLogout = async (req, res) => {
  res.cookie('admin_token', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });

  res.status(200).json({ message: 'Admin logged out successfully.' });
};
