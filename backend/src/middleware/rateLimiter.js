import rateLimit from 'express-rate-limit';

/**
 * Authentication Rate Limiter
 * Restricts requests to 10 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

/**
 * OTP Send Rate Limiter
 * Restricts OTP dispatch requests to 5 requests per 15 minutes per IP
 */
export const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many OTP requests from this IP. Please try again after 15 minutes.',
  },
});

/**
 * OTP Verification Rate Limiter
 * Restricts verification attempts to 15 requests per 15 minutes per IP
 */
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many verification attempts from this IP. Please try again after 15 minutes.',
  },
});

