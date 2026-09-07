import mongoose from 'mongoose';

const sizePricingSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      enum: ['S', 'M', 'L'],
      required: [true, 'Size identifier is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price for size is required'],
      min: [0, 'Price cannot be negative'],
    },
  },
  { _id: false }
);

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Menu item name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Menu item description is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: {
        values: ['pizza', 'garlic-bread', 'sides', 'drinks', 'desserts', 'dips'],
        message: '{VALUE} is not a supported menu category',
      },
      required: [true, 'Menu item category is required'],
      index: true,
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80',
      trim: true,
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative'],
    },
    sizePricing: {
      type: [sizePricingSchema],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    badge: {
      type: String,
      enum: ['bestseller', 'popular', 'new', null],
      default: null,
    },
    rating: {
      type: Number,
      default: 4.8,
      min: [1, 'Rating must be at least 1.0'],
      max: [5, 'Rating cannot exceed 5.0'],
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative'],
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

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
export default MenuItem;
