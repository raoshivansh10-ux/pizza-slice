import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    cartId: {
      type: String,
      required: true,
      default: () => `cart-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    itemType: {
      type: String,
      enum: ['menuItem', 'combo', 'customPizza'],
      required: [true, 'Item type is required'],
      default: 'menuItem',
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      refPath: 'items.itemRefModel',
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    size: {
      type: String,
      default: 'M',
    },
    quantity: {
      type: Number,
      required: [true, 'Item quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    image: {
      type: String,
      default: '',
    },
    customSelections: {
      base: { type: mongoose.Schema.Types.Mixed, default: null },
      sauce: { type: mongoose.Schema.Types.Mixed, default: null },
      cheese: { type: mongoose.Schema.Types.Mixed, default: null },
      toppings: { type: Array, default: [] },
      removedToppings: { type: Array, default: [] },
      extraCheese: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required for persistent cart'],
      unique: true,
      index: true,
    },
    clerkId: {
      type: String,
      sparse: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
