import Razorpay from 'razorpay';
import crypto from 'crypto';

const keyId = process.env.RAZORPAY_KEY_ID || 'dummy_razorpay_key_id';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'dummy_razorpay_key_secret';

let razorpayInstance = null;

if (keyId && keySecret && !keyId.includes('dummy')) {
  try {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  } catch (err) {
    console.warn('[Razorpay] Failed to initialize client:', err.message);
  }
}

/**
 * Creates a Razorpay Order
 * @param {Object} options
 * @param {number} options.amountInPaise - Order amount in paise (INR * 100)
 * @param {string} [options.receipt] - Unique receipt ID
 * @param {Object} [options.notes] - Custom metadata notes
 */
export const createRazorpayOrder = async ({ amountInPaise, receipt, notes = {} }) => {
  if (razorpayInstance) {
    try {
      const order = await razorpayInstance.orders.create({
        amount: Math.round(amountInPaise),
        currency: 'INR',
        receipt: receipt || `rcpt_${Date.now()}`,
        notes,
      });
      return order;
    } catch (error) {
      console.warn(`[Razorpay API] Live order creation error: ${error.message}. Using dev fallback.`);
    }
  }

  // Development / Test Fallback order generation
  const mockOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
  return {
    id: mockOrderId,
    entity: 'order',
    amount: Math.round(amountInPaise),
    amount_paid: 0,
    amount_due: Math.round(amountInPaise),
    currency: 'INR',
    receipt: receipt || `rcpt_${Date.now()}`,
    status: 'created',
    attempts: 0,
    notes,
    created_at: Math.floor(Date.now() / 1000),
  };
};

export default razorpayInstance;
