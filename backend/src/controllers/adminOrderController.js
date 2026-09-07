import { validationResult } from 'express-validator';
import Order from '../models/Order.js';
import { emitOrderStatusUpdate } from '../config/socket.js';

// Define status progression ranks (1 -> 2 -> 3 -> 4)
const STATUS_RANKS = {
  'Order Received': 1,
  'In Kitchen': 2,
  'In the Kitchen': 2,
  'Sent to Delivery': 3,
  'Sent for Delivery': 3,
  'Delivered': 4,
};

/**
 * @desc    Get all orders across the system (newest first, with user name/email)
 * @route   GET /api/admin/orders
 * @access  Private / Admin only
 */
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email role')
      .populate('items.base', 'name price type')
      .populate('items.sauce', 'name price type')
      .populate('items.cheese', 'name price type')
      .populate('items.veggies', 'name price type')
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error('[Admin Get Orders Error]', error);
    res.status(500).json({ error: 'Server error while fetching orders for admin.' });
  }
};

/**
 * @desc    Update order status with strict forward-only validation and real-time Socket.IO emission
 * @route   PUT /api/admin/orders/:id/status
 * @access  Private / Admin only
 */
export const updateOrderStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { id } = req.params;
  const { status: requestedStatus } = req.body;

  try {
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const currentRank = STATUS_RANKS[order.status] || 1;
    const requestedRank = STATUS_RANKS[requestedStatus];

    if (!requestedRank) {
      return res.status(400).json({
        error: `Invalid status: '${requestedStatus}'. Allowed statuses: 'Order Received', 'In Kitchen', 'Sent to Delivery', 'Delivered'.`,
      });
    }

    // Strict forward-only check
    if (requestedRank <= currentRank) {
      return res.status(400).json({
        error: `Invalid status transition: Order status cannot move backward or stay the same (Current: '${order.status}', Requested: '${requestedStatus}').`,
      });
    }

    // Update status and push to status history
    order.status = requestedStatus;
    order.statusHistory.push({
      status: requestedStatus,
      timestamp: new Date(),
    });

    await order.save();

    // Populate order details before emitting to the customer's socket room
    const populatedOrder = await Order.findById(order._id)
      .populate('items.base', 'name price type')
      .populate('items.sauce', 'name price type')
      .populate('items.cheese', 'name price type')
      .populate('items.veggies', 'name price type');

    // Emit real-time update to the user's socket room
    emitOrderStatusUpdate(order.user, populatedOrder);

    res.status(200).json({
      message: `Order status successfully updated to '${requestedStatus}'.`,
      order: populatedOrder,
    });
  } catch (error) {
    console.error('[Update Order Status Error]', error);
    res.status(500).json({ error: 'Server error while updating order status.' });
  }
};
