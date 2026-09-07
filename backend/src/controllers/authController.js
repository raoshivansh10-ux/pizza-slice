import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import { sendEmail, sendOtpEmail } from '../utils/sendEmail.js';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * Generate JWT and configure cookie options
 */
const sendTokenCookie = (user, res, message = 'Success') => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'development_jwt_secret_key_12345',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  };

  res.cookie('token', token, cookieOptions);

  return res.status(200).json({
    message,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
  });
};

/**
 * @desc    Register a new user and dispatch 6-digit OTP to their email
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { name, email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    console.log(`[OTP] Request received for: ${normalizedEmail}`);

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please log in.' });
    }

    let user = existingUser;
    if (user) {
      user.name = name.trim();
      user.password = password;
      await user.save();
    } else {
      user = new User({
        name: name.trim(),
        email: normalizedEmail,
        password,
        isVerified: false,
      });
      await user.save();
    }

    // 1. Check 60-second cooldown on active OTP
    const existingActiveOtp = await Otp.findOne({
      email: normalizedEmail,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (existingActiveOtp && existingActiveOtp.lastSentAt) {
      const elapsedMs = Date.now() - new Date(existingActiveOtp.lastSentAt).getTime();
      const cooldownMs = 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return res.status(429).json({
          error: `Please wait ${remainingSeconds}s before requesting a new verification code.`,
          retryAfter: remainingSeconds,
        });
      }
    }

    // 2. Invalidate previous OTPs for this email
    await Otp.updateMany(
      { email: normalizedEmail, isUsed: false },
      { $set: { isUsed: true } }
    );

    // 3. Generate cryptographically secure random 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();

    // 4. Secure SHA-256 hash (never store plain OTP in database)
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    // 5. Expiration time (10 minutes)
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // 6. Save OTP record
    await Otp.create({
      email: normalizedEmail,
      otpHash,
      expiresAt,
      attempts: 0,
      isUsed: false,
      lastSentAt: new Date(),
    });
    console.log(`[OTP] OTP record created for: ${normalizedEmail}`);

    // 7. Dispatch real email via configured provider
    const appName = process.env.APP_NAME || 'PizzaSlice';
    await sendOtpEmail({
      to: normalizedEmail,
      otp: rawOtp,
      expiryMinutes,
      appName,
    });

    // 8. Return response without revealing OTP
    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${normalizedEmail}.`,
      email: normalizedEmail,
      expiresInMinutes: expiryMinutes,
    });
  } catch (error) {
    console.error(`[OTP Error] Registration dispatch failed for ${normalizedEmail}:`, error.message);
    return res.status(500).json({
      error: `Failed to send verification code: ${error.message}. Please check email credentials in backend/.env.`,
    });
  }
};

/**
 * @desc    Legacy token verification fallback (deprecated)
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
export const verifyEmail = async (req, res) => {
  return res.status(400).json({
    error: 'Link-based verification has been replaced with 6-digit Email OTP codes. Please sign in or register with OTP.',
    useOtp: true,
  });
};

/**
 * @desc    Authenticate user, reject unverified, and return httpOnly cookie
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Account not verified yet. Please switch to the "Email OTP" tab to verify your account with a 6-digit code.',
        unverified: true,
        email: user.email,
      });
    }

    sendTokenCookie(user, res, 'Login successful.');
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({ error: 'Server error during login. Please try again later.' });
  }
};

/**
 * @desc    Request password reset link (doesn't reveal if email exists)
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    let resetToken = null;
    let resetUrl = null;

    if (user) {
      resetToken = user.generateResetPasswordToken();
      await user.save();

      resetUrl = `${CLIENT_URL}/reset-password/${resetToken}`;

      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request - Pizza Slice',
        text: `Hello ${user.name},\n\nYou requested a password reset. Please use the following link to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #f97316;">Password Reset Request</h2>
            <p>Hello ${user.name},</p>
            <p>You recently requested to reset your password for your Pizza Slice account. Click the button below to proceed:</p>
            <div style="margin: 25px 0;">
              <a href="${resetUrl}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #666; font-size: 13px; word-break: break-all;">${resetUrl}</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour. If you did not request a password reset, please ignore this message.</p>
          </div>
        `,
        actionUrl: resetUrl,
      });
    }

    // Always return 200 with the exact same message to avoid email enumeration
    res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent.',
      ...(process.env.NODE_ENV !== 'production' && resetToken && {
        devResetUrl: resetUrl,
        devToken: resetToken,
      }),
    });
  } catch (error) {
    console.error('[Forgot Password Error]', error);
    res.status(500).json({ error: 'Server error while processing password reset request.' });
  }
};

/**
 * @desc    Reset password using valid reset token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { token } = req.params;
  const { password } = req.body;

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      message: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('[Reset Password Error]', error);
    res.status(500).json({ error: 'Server error during password reset.' });
  }
};

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  res.status(200).json({
    user: req.user,
  });
};

/**
 * @desc    Log user out and clear token cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logout = async (req, res) => {
  res.cookie('token', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });

  res.status(200).json({ message: 'Logged out successfully.' });
};

/**
 * @desc    Generate secure 6-digit OTP, store SHA-256 hash, and send real email
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
export const sendOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { email } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // 1. Check for 60s cooldown from last request to prevent spamming
    const existingActiveOtp = await Otp.findOne({
      email: normalizedEmail,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (existingActiveOtp && existingActiveOtp.lastSentAt) {
      const elapsedMs = Date.now() - new Date(existingActiveOtp.lastSentAt).getTime();
      const cooldownMs = 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return res.status(429).json({
          error: `Please wait ${remainingSeconds}s before requesting a new verification code.`,
          retryAfter: remainingSeconds,
        });
      }
    }

    // 2. Invalidate previous active OTPs for this email so previous codes cannot be used
    await Otp.updateMany(
      { email: normalizedEmail, isUsed: false },
      { $set: { isUsed: true } }
    );

    // 3. Cryptographically secure random 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();

    // 4. Secure SHA-256 hash (never store plain OTP in database)
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');

    // 5. Expiration time (10 minutes)
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // 6. Save OTP record with TTL index
    await Otp.create({
      email: normalizedEmail,
      otpHash,
      expiresAt,
      attempts: 0,
      isUsed: false,
      lastSentAt: new Date(),
    });

    // 7. Dispatch real email via configured provider (Gmail SMTP / Resend / SendGrid)
    const appName = process.env.APP_NAME || 'Pizza Slice';
    await sendOtpEmail({
      to: normalizedEmail,
      otp: rawOtp,
      expiryMinutes,
      appName,
    });

    // 8. Return response without revealing the OTP or sensitive data
    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
      expiresInMinutes: expiryMinutes,
    });
  } catch (error) {
    console.error('[Send OTP Error]', error.message);
    return res.status(500).json({
      error: 'Failed to send verification code. Please check your email configuration.',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Verify 6-digit OTP, authenticate user, and issue JWT cookie
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
export const verifyOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { email, otp, name } = req.body;
  const normalizedEmail = email.trim().toLowerCase();
  const cleanedOtp = otp ? otp.toString().trim() : '';

  if (!/^\d{6}$/.test(cleanedOtp)) {
    return res.status(400).json({ error: 'Verification code must be exactly 6 digits.' });
  }

  try {
    console.log(`[OTP] Verification request received for: ${normalizedEmail}`);

    // 1. Find active unused OTP record
    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      isUsed: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        error: 'No active verification code found for this email. Please request a new code.',
      });
    }

    // 2. Check if expired
    if (new Date() > new Date(otpRecord.expiresAt)) {
      otpRecord.isUsed = true;
      await otpRecord.save();
      return res.status(400).json({
        error: 'Code expired. Please request a new code.',
        isExpired: true,
      });
    }

    // 3. Brute force check (maximum 5 attempts)
    const MAX_ATTEMPTS = 5;
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      otpRecord.isUsed = true;
      await otpRecord.save();
      return res.status(429).json({
        error: 'Too many incorrect attempts. This code has been deactivated. Please request a new code.',
        isLocked: true,
      });
    }

    // 4. Verify SHA-256 hash match
    const candidateHash = crypto.createHash('sha256').update(cleanedOtp).digest('hex');

    if (candidateHash !== otpRecord.otpHash) {
      otpRecord.attempts += 1;
      await otpRecord.save();

      const remainingAttempts = MAX_ATTEMPTS - otpRecord.attempts;
      if (remainingAttempts <= 0) {
        otpRecord.isUsed = true;
        await otpRecord.save();
        return res.status(429).json({
          error: 'Too many incorrect attempts. This code has been deactivated. Please request a new code.',
          isLocked: true,
        });
      }

      return res.status(400).json({
        error: `Invalid verification code. (${remainingAttempts} ${remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining)`,
        remainingAttempts,
      });
    }

    // 5. Code is valid! Mark as used to prevent replay attacks
    otpRecord.isUsed = true;
    await otpRecord.save();

    // 6. Look up or auto-create user account (seamless verified access)
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const displayName = name && name.trim().length > 0
        ? name.trim()
        : normalizedEmail.split('@')[0];

      const randomPassword = crypto.randomBytes(16).toString('hex') + 'A1!';

      user = new User({
        name: displayName,
        email: normalizedEmail,
        password: randomPassword,
        isVerified: true,
      });
      await user.save();
    } else if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    console.log(`[OTP] Verification successful for: ${normalizedEmail}`);

    // 7. Issue session token cookie and return user payload
    return sendTokenCookie(user, res, 'Verification successful! Welcome to PizzaSlice.');
  } catch (error) {
    console.error('[Verify OTP Error]', error);
    return res.status(500).json({ error: 'Server error during OTP verification. Please try again.' });
  }
};

