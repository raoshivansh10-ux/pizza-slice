import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    clerkId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: false,
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Don't return password by default in queries
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: [0, 'Loyalty points cannot be negative'],
    },
    lifetimeSpend: {
      type: Number,
      default: 0,
      min: [0, 'Lifetime spend cannot be negative'],
    },
    savedDeliveryLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      formattedAddress: { type: String, default: '', trim: true },
      houseNumber: { type: String, default: '', trim: true },
      street: { type: String, default: '', trim: true },
      locality: { type: String, default: '', trim: true },
      city: { type: String, default: '', trim: true },
      state: { type: String, default: '', trim: true },
      postalCode: { type: String, default: '', trim: true },
      phone: { type: String, default: '', trim: true },
      distanceKm: { type: Number, default: null },
      updatedAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate and hash email verification token (valid for 24 hours)
userSchema.methods.generateVerificationToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.verificationToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return rawToken;
};

// Generate and hash password reset token (valid for 1 hour)
userSchema.methods.generateResetPasswordToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return rawToken;
};

const User = mongoose.model('User', userSchema);
export default User;
