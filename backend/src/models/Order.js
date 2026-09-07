import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: ['menuItem', 'combo', 'customPizza'],
      default: 'customPizza',
    },
    name: {
      type: String,
      required: true,
      default: 'Artisan Pizza',
    },
    size: {
      type: String,
      default: 'M',
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    base: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PizzaOption',
      default: null,
    },
    sauce: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PizzaOption',
      default: null,
    },
    cheese: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PizzaOption',
      default: null,
    },
    veggies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PizzaOption',
      },
    ],
    quantity: {
      type: Number,
      required: [true, 'Item quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    itemPrice: {
      type: Number,
      required: [true, 'Item price is required'],
      min: [0, 'Item price cannot be negative'],
    },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: [
        'Order Received',
        'In Kitchen',
        'In the Kitchen',
        'Sent to Delivery',
        'Sent for Delivery',
        'Delivered',
      ],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Order must belong to a user'],
    },
    clerkUserId: {
      type: String,
      index: true,
      default: null,
    },
    items: {
      type: [orderItemSchema],
      required: [true, 'Order must contain at least one pizza or menu item'],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'Order items array cannot be empty',
      },
    },
    subtotal: {
      type: Number,
      min: [0, 'Subtotal cannot be negative'],
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: [0, 'Delivery fee cannot be negative'],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative'],
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative'],
    },
    pointsRedeemed: {
      type: Number,
      default: 0,
      min: [0, 'Points redeemed cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total order amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    status: {
      type: String,
      enum: [
        'Order Received',
        'In Kitchen',
        'In the Kitchen',
        'Sent to Delivery',
        'Sent for Delivery',
        'Delivered',
      ],
      default: 'Order Received',
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: () => [{ status: 'Order Received', timestamp: new Date() }],
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    razorpayOrderId: {
      type: String,
      required: [true, 'Razorpay order ID is required'],
      unique: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    deliveryAddress: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      pincode: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
