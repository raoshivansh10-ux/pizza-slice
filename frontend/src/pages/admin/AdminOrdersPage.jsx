import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import AdminNavbar from '../../components/admin/AdminNavbar';
import {
  ShoppingBag,
  RotateCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  ArrowRight,
  Package,
  Flame,
  Truck,
  Loader2,
} from 'lucide-react';

const STATUS_RANKS = {
  'Order Received': 1,
  'In Kitchen': 2,
  'In the Kitchen': 2,
  'Sent to Delivery': 3,
  'Sent for Delivery': 3,
  'Delivered': 4,
};

const NEXT_STATUS_OPTIONS = [
  { value: 'In Kitchen', label: 'In Kitchen', rank: 2 },
  { value: 'Sent to Delivery', label: 'Sent to Delivery', rank: 3 },
  { value: 'Delivered', label: 'Delivered', rank: 4 },
];

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/orders');
      setOrders(res.data.orders || []);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      setFeedback({ type: '', text: '' });

      const res = await api.put(`/admin/orders/${orderId}/status`, {
        status: newStatus,
      });

      setFeedback({
        type: 'success',
        text: `Order #${orderId.slice(-6).toUpperCase()} status updated to '${newStatus}'! Emitted to live Socket.IO room.`,
      });

      // Update order in local state
      setOrders((prev) =>
        prev.map((ord) => (ord._id === orderId ? res.data.order : ord))
      );
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Order Received':
        return <Package size={14} />;
      case 'In Kitchen':
      case 'In the Kitchen':
        return <Flame size={14} color="#F86015" />;
      case 'Sent to Delivery':
      case 'Sent for Delivery':
        return <Truck size={14} color="#9ABC04" />;
      case 'Delivered':
        return <CheckCircle size={14} color="#19532B" />;
      default:
        return <Clock size={14} />;
    }
  };

  return (
    <div className="admin-page">
      <AdminNavbar />
      <div className="admin-container">
        <div className="admin-page-header">
          <div>
            <h2>📦 Orders Management & Kitchen Fulfillment</h2>
            <p>Advance order statuses with strict forward-only progression and real-time Socket.IO dispatch</p>
          </div>
          <button onClick={fetchOrders} className="btn btn-secondary btn-sm" disabled={loading}>
            <RotateCw size={15} className={loading ? 'spin-icon' : ''} />
            <span>Refresh Orders</span>
          </button>
        </div>

        {feedback.text && (
          <div className={`alert ${feedback.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            {feedback.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            <span>{feedback.text}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading all orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-orders-card">
            <ShoppingBag size={48} color="#64748b" />
            <h3>No Customer Orders</h3>
            <p>No orders have been placed in the system yet.</p>
          </div>
        ) : (
          <div className="admin-orders-list">
            {orders.map((order) => {
              const currentRank = STATUS_RANKS[order.status] || 1;
              const isDelivered = order.status === 'Delivered';
              const isUpdating = updatingId === order._id;

              return (
                <div key={order._id} className="admin-order-card">
                  <div className="admin-order-header">
                    <div className="order-main-info">
                      <div className="order-id-tag">
                        <h3>Order #{order._id.slice(-6).toUpperCase()}</h3>
                        <span className={`status-badge-pill rank-${currentRank}`}>
                          {getStatusIcon(order.status)}
                          <span>{order.status}</span>
                        </span>
                        <span className={`payment-pill ${order.paymentStatus}`}>
                          {order.paymentStatus}
                        </span>
                      </div>
                      <div className="customer-info">
                        <User size={14} />
                        <strong>{order.user?.name || 'Customer'}</strong> ({order.user?.email || 'N/A'})
                      </div>
                    </div>

                    <div className="order-header-right">
                      <div className="order-amount-pill">₹{order.totalAmount}</div>
                      <span className="order-date">
                        {new Date(order.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="admin-order-items">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="admin-item-row">
                        <span>
                          <strong>x{item.quantity}</strong> {item.base?.name} Crust + {item.sauce?.name} + {item.cheese?.name}
                          {item.veggies?.length > 0 &&
                            ` + [${item.veggies.map((v) => v.name).join(', ')}]`}
                        </span>
                        <span>₹{item.itemPrice * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Forward-Only Status Transition Controls */}
                  <div className="status-progression-bar">
                    <span className="advance-label">Advance Status:</span>
                    <div className="advance-buttons">
                      {NEXT_STATUS_OPTIONS.map((opt) => {
                        const isPastOrCurrent = opt.rank <= currentRank;
                        const isNextImmediate = opt.rank === currentRank + 1;

                        return (
                          <button
                            key={opt.value}
                            onClick={() => handleStatusChange(order._id, opt.value)}
                            disabled={isPastOrCurrent || isUpdating}
                            className={`btn btn-xs ${
                              isNextImmediate
                                ? 'btn-primary'
                                : isPastOrCurrent
                                ? 'btn-disabled'
                                : 'btn-secondary'
                            }`}
                            title={
                              isPastOrCurrent
                                ? 'Cannot transition backward or repeat current status'
                                : `Advance to ${opt.label}`
                            }
                          >
                            {isUpdating && opt.rank === currentRank + 1 ? (
                              <Loader2 size={13} className="spin-icon" />
                            ) : (
                              <ArrowRight size={13} />
                            )}
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrdersPage;
