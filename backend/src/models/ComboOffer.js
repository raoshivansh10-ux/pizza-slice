import mongoose from 'mongoose';

const comboOfferSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Combo offer name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Combo offer description is required'],
      trim: true,
    },
    image: {
      type: String,
      default: '/images/combos/combo-party.png',
      trim: true,
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem',
        required: [true, 'Combo item reference is required'],
      },
    ],
    discountType: {
      type: String,
      enum: {
        values: ['percent', 'fixed'],
        message: '{VALUE} is not a valid discount type',
      },
      required: [true, 'Discount type is required'],
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative'],
    },
    originalPrice: {
      type: Number,
      required: [true, 'Original cumulative price is required'],
      min: [0, 'Original price cannot be negative'],
    },
    comboPrice: {
      type: Number,
      required: [true, 'Combo price is required'],
      min: [0, 'Combo price cannot be negative'],
    },
    validUntil: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const ComboOffer = mongoose.model('ComboOffer', comboOfferSchema);
export default ComboOffer;
