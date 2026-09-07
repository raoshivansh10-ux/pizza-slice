import mongoose from 'mongoose';

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    type: {
      type: String,
      enum: ['earned', 'redeemed', 'adjusted'],
      required: [true, 'Transaction type is required'],
    },
    points: {
      type: Number,
      required: [true, 'Points quantity is required'],
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const LoyaltyTransaction = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);
export default LoyaltyTransaction;
