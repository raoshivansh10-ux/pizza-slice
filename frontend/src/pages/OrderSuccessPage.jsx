import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Package,
  ShoppingBag,
  ArrowRight,
  Pizza,
  ChefHat,
  Clock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

const OrderSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const orderState = location.state || {};

  const orderId = orderState.orderId ? orderState.orderId.toString() : 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  const paymentId = orderState.paymentId || 'pay_' + Math.random().toString(36).substr(2, 8);
  const total = orderState.total || orderState.order?.totalAmount || 0;
  const shortOrderId = orderId.length > 8 ? orderId.slice(-8).toUpperCase() : orderId;

  return (
    <div className="order-success-page">
      <div className="order-success-container">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="order-success-card"
        >
          {/* Success Checkmark & Glow */}
          <div className="success-icon-wrap">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
              className="success-badge-circle"
            >
              <CheckCircle2 size={48} color="#22c55e" />
            </motion.div>
          </div>

          <h1 className="success-heading">Payment Successful 🎉</h1>
          <p className="success-subtitle">Your pizza is being prepared!</p>

          {/* Payment & Order Summary Card */}
          <div className="success-details-card">
            <div className="success-detail-row">
              <span className="detail-label">Order ID:</span>
              <span className="detail-val font-mono">#{shortOrderId}</span>
            </div>

            <div className="success-detail-row">
              <span className="detail-label">Payment ID:</span>
              <span className="detail-val font-mono">{paymentId}</span>
            </div>

            <div className="success-detail-row total-row">
              <span className="detail-label">Total Paid:</span>
              <span className="detail-val total-val">₹{total}</span>
            </div>

            <div className="success-detail-row verified-badge-row">
              <span className="verified-shield">
                <ShieldCheck size={14} /> Razorpay Verified Payment
              </span>
            </div>
          </div>

          {/* Kitchen Timeline Status */}
          <div className="success-timeline-preview">
            <div className="timeline-header">
              <ChefHat size={16} color="#F86015" />
              <span>Current Status: <strong>Order Received & In Kitchen</strong></span>
            </div>
            <p className="timeline-hint">
              Our master pizzaiolos are hand-stretching your dough with San Marzano tomatoes and artisanal cheeses.
            </p>
          </div>

          {/* Actions */}
          <div className="success-actions">
            <Link to="/orders" className="btn btn-primary btn-block">
              <Package size={18} />
              <span>Track Order Live</span>
              <ArrowRight size={16} />
            </Link>

            <Link to="/menu" className="btn btn-secondary btn-block">
              <Pizza size={18} />
              <span>Explore More Menu</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
