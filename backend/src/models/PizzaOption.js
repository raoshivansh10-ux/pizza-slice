import mongoose from 'mongoose';

const pizzaOptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Option name is required'],
      trim: true,
      maxlength: [100, 'Option name cannot exceed 100 characters'],
    },
    type: {
      type: String,
      required: [true, 'Option type is required'],
      enum: {
        values: ['base', 'sauce', 'cheese', 'veggie', 'meat'],
        message: '{VALUE} is not a valid pizza option type',
      },
      lowercase: true,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    stockQty: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      default: 50,
      min: [0, 'Stock quantity cannot be negative'],
    },
    lowStockThreshold: {
      type: Number,
      default: function () {
        return this.type === 'veggie' ? 15 : 20;
      },
      min: [0, 'Low stock threshold cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastNotifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual property to indicate whether item is below low stock threshold
pizzaOptionSchema.virtual('isLowStock').get(function () {
  return this.stockQty <= this.lowStockThreshold;
});

// Ensure virtuals are included in JSON serialization
pizzaOptionSchema.set('toJSON', { virtuals: true });
pizzaOptionSchema.set('toObject', { virtuals: true });

const PizzaOption = mongoose.model('PizzaOption', pizzaOptionSchema);
export default PizzaOption;
