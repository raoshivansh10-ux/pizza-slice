import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

/**
 * Middleware to restrict access exclusively to authenticated Administrators
 * Reads the distinct 'admin_token' httpOnly cookie or Authorization Bearer header
 */
export const adminOnly = async (req, res, next) => {
  try {
    let token = null;

    // 1. Extract from distinct 'admin_token' httpOnly cookie
    if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    }
    // 2. Fallback to Authorization Bearer header
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        error: 'Admin authorization required. No admin session token found.',
      });
    }

    // Verify JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'development_jwt_secret_key_12345'
    );

    // Verify role claim
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden: Access restricted exclusively to Administrators.',
      });
    }

    // Retrieve Admin record from dedicated Admin collection
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) {
      return res.status(403).json({
        error: 'Forbidden: Admin account not found or deactivated.',
      });
    }

    req.admin = admin;
    req.user = admin; // Compatibility for shared utilities if needed
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid admin authentication token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Admin session expired. Please log in again.' });
    }
    return res.status(500).json({ error: 'Internal admin authorization error.' });
  }
};

export default adminOnly;
