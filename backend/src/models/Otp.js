import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    otpHash: {
      type: String,
      required: [true, 'OTP hash is required'],
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatic TTL cleanup by MongoDB when expiresAt is reached
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastSentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookup of active OTPs by email
otpSchema.index({ email: 1, isUsed: 1, expiresAt: 1 });

const Otp = mongoose.model('Otp', otpSchema);

export default Otp;
