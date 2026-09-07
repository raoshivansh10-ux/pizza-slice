import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { useBuilder } from '../context/BuilderContext';
import LoyaltyWidget from '../components/loyalty/LoyaltyWidget';
import {
  ShoppingBag,
  CheckCircle,
  Truck,
  Flame,
  Package,
  RotateCw,
  MapPin,
  Calendar,
  Zap,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Pizza,
  AlertCircle,
  Star,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

const ORDER_STAGES = [
  { id: 'Order Received', label: 'Order Received', icon: <Package size={17} /> },
  { id: 'In Kitchen', label: 'In Kitchen', icon: <Flame size={17} /> },
  { id: 'Sent to Delivery', label: 'Sent to Delivery', icon: <Truck size={17} /> },
  { id: 'Delivered', label: 'Delivered', icon: <CheckCircle size={17} /> },
];

const getStageIndex = (status) => {
  if (status === 'Delivered') return 3;
  if (status === 'Sent to Delivery' || status === 'Sent for Delivery') return 2;
  if (status === 'In Kitchen' || status === 'In the Kitchen') return 1;
  return 0; // Order Received
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Order Received', label: 'Order Received' },
  { value: 'In Kitchen', label: 'In Kitchen' },
  { value: 'Sent to Delivery', label: 'Sent to Delivery' },
  { value: 'Delivered', label: 'Delivered' },
];

const MyOrdersPage = () => {
  const navigate = useNavigate();
  const { loadPizzaConfiguration } = useBuilder();

  // State
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    totalOrders: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastLiveUpdateId, setLastLiveUpdateId] = useState(null);

  // Filters State
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);

  // Expanded order IDs state (Set)
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [reorderSuccessMsg, setReorderSuccessMsg] = useState('');

  // Reviews State: Map of orderId -> review object
  const [reviewsMap, setReviewsMap] = useState(new Map());
  const [submittingReviewOrderId, setSubmittingReviewOrderId] = useState(null);
  const [reviewFormState, setReviewFormState] = useState({}); // orderId -> { rating: 5, hoverRating: 0, comment: '', error: '' }

  // Fetch reviews submitted by this customer
  const fetchMyReviews = useCallback(async () => {
    try {
      const res = await api.get('/reviews/mine');
      const map = new Map();
      (res.data.reviews || []).forEach((r) => {
        const oId = r.order?._id || r.order;
        if (oId) map.set(oId.toString(), r);
      });
      setReviewsMap(map);
    } catch (err) {
      console.warn('Could not fetch user reviews:', err.message);
    }
  }, []);

  // Fetch orders from API with pagination & filters
  const fetchOrders = useCallback(
    async (isBackground = false) => {
      try {
        if (!isBackground) setRefreshing(true);

        const params = new URLSearchParams();
        params.append('page', currentPage);
        params.append('limit', pageLimit);

        if (statusFilter && statusFilter !== 'all') {
          params.append('status', statusFilter);
        }
        if (fromDate) {
          params.append('from', fromDate);
        }
        if (toDate) {
          params.append('to', toDate);
        }

        const res = await api.get(`/orders/mine?${params.toString()}`);
        setOrders(res.data.orders || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to fetch order history.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentPage, pageLimit, statusFilter, fromDate, toDate]
  );

  // Fetch when page or filters change
  useEffect(() => {
    fetchOrders();
    fetchMyReviews();
  }, [fetchOrders, fetchMyReviews]);

  // Real-time Socket.IO Listener
  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    const handleStatusUpdated = (updatedOrder) => {
      setOrders((prev) =>
        prev.map((order) => (order._id === updatedOrder._id ? { ...order, ...updatedOrder } : order))
      );
      setLastLiveUpdateId(updatedOrder._id);
      setTimeout(() => setLastLiveUpdateId(null), 3500);
    };

    if (socket.connected) {
      setSocketConnected(true);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('order:status-updated', handleStatusUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('order:status-updated', handleStatusUpdated);
    };
  }, []);

  // Toggle Order Accordion Expansion
  const toggleOrderExpand = (orderId) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  // 1-Click Reorder Action: Loads past pizza configuration into Pizza Builder
  const handleReorderItem = async (item) => {
    try {
      const loaded = await loadPizzaConfiguration({
        base: item.base?._id || item.base,
        sauce: item.sauce?._id || item.sauce,
        cheese: item.cheese?._id || item.cheese,
        veggies: (item.veggies || []).map((v) => v._id || v),
        quantity: item.quantity || 1,
      });

      if (loaded) {
        setReorderSuccessMsg('Pizza recipe loaded into builder! Redirecting...');
        setTimeout(() => {
          navigate('/builder');
        }, 800);
      }
    } catch (err) {
      setError('Could not load recipe for reorder. Please build from menu.');
    }
  };

  // Review handlers
  const handleRatingChange = (orderId, rating) => {
    setReviewFormState((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], rating, error: '' },
    }));
  };

  const handleRatingHover = (orderId, hoverRating) => {
    setReviewFormState((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], hoverRating },
    }));
  };

  const handleCommentChange = (orderId, comment) => {
    setReviewFormState((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], comment, error: '' },
    }));
  };

  const handleSubmitReview = async (orderId) => {
    const form = reviewFormState[orderId] || { rating: 5, comment: '' };
    const rating = form.rating || 5;
    const comment = form.comment || '';

    try {
      setSubmittingReviewOrderId(orderId);
      const res = await api.post('/reviews', { orderId, rating, comment });

      // Update reviews map locally
      setReviewsMap((prev) => {
        const next = new Map(prev);
        next.set(orderId, res.data.review);
        return next;
      });

      setReorderSuccessMsg('Thank you! Your verified review has been submitted.');
      setTimeout(() => setReorderSuccessMsg(''), 4000);
    } catch (err) {
      setReviewFormState((prev) => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          error: err.response?.data?.error || err.message || 'Failed to submit review.',
        },
      }));
    } finally {
      setSubmittingReviewOrderId(null);
    }
  };

  // Quick Date Filter Presets
  const setQuickDatePreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setFromDate(start.toISOString().split('T')[0]);
    setToDate(end.toISOString().split('T')[0]);
    setCurrentPage(1);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setStatusFilter('all');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleLimitChange = (newLimit) => {
    setPageLimit(newLimit);
    setCurrentPage(1);
  };

  return (
    <div className="orders-dashboard-page">
      <div className="orders-dashboard-container">
        {/* Page Header */}
        <div className="dashboard-header-block">
          <div className="header-text-group">
            <div className="header-badge-row">
              <span className="badge badge-brand">
                <ShoppingBag size={14} /> My Orders & Live Tracking
              </span>
              <span
                className={`socket-pill ${socketConnected ? 'connected' : 'disconnected'}`}
                title={socketConnected ? 'Live updates active' : 'Connecting...'}
              >
                <span className="pulse-dot" />
                {socketConnected ? 'Live Kitchen Sync' : 'Reconnecting'}
              </span>
            </div>
            <h2>Order History & Itemized Details</h2>
            <p>Track your artisan pizzas in real-time, view recipe breakdowns, submit verified reviews, and reorder favorites in 1-click</p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              onClick={() => fetchOrders(false)}
              disabled={refreshing}
              className="btn btn-secondary btn-sm"
              title="Refresh order history"
            >
              <RotateCw size={15} className={refreshing ? 'spin-icon' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
            <Link to="/menu" className="btn btn-primary btn-sm">
              <Pizza size={15} />
              <span>Order New Pizza</span>
            </Link>
          </div>
        </div>

        {/* Loyalty Status & Tier Progress Widget */}
        <div className="orders-loyalty-section">
          <LoyaltyWidget />
        </div>

        {/* Reorder / Review Success Banner */}
        {reorderSuccessMsg && (
          <div className="reorder-banner-alert">
            <CheckCircle size={16} />
            <span>{reorderSuccessMsg}</span>
          </div>
        )}

        {/* Enhanced Filter Bar: Status Chips + Date Pickers */}
        <div className="order-history-filter-bar">
          <div className="filter-bar-top">
            <div className="filter-title-group">
              <Filter size={16} color="#C09164" />
              <span className="filter-title">Filter Orders:</span>
            </div>

            {/* Status Filter Chips */}
            <div className="status-chips-group">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleStatusFilterChange(opt.value)}
                  className={`status-chip-btn ${statusFilter === opt.value ? 'active' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-bar-bottom">
            {/* Date Range Controls */}
            <div className="date-filter-group">
              <span className="date-label">Date Range:</span>
              <div className="date-inputs-pair">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="date-input"
                  title="From Date"
                />
                <span className="date-sep">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="date-input"
                  title="To Date"
                />
              </div>

              {/* Quick Presets */}
              <div className="date-presets-group">
                <button
                  type="button"
                  onClick={() => setQuickDatePreset(0)}
                  className="btn-preset-chip"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDatePreset(7)}
                  className="btn-preset-chip"
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDatePreset(30)}
                  className="btn-preset-chip"
                >
                  30 Days
                </button>
              </div>
            </div>

            {/* Reset Filters */}
            {(statusFilter !== 'all' || fromDate || toDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-reset-filters"
                title="Reset all filters"
              >
                <X size={14} />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}

        {/* Main Orders List State */}
        {loading ? (
          <div className="orders-loading-state">
            <div className="spinner"></div>
            <p>Loading your order history from kitchen database...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="orders-empty-state">
            <div className="empty-icon-wrap">
              <ShoppingBag size={48} color="#C09164" />
            </div>
            <h3>No Orders Found</h3>
            <p>
              {statusFilter !== 'all' || fromDate || toDate
                ? 'No past orders matched your selected filters. Try clearing your filters or changing dates.'
                : "You haven't placed any artisan pizza orders yet. Explore our handcrafted menu or build your own custom pizza!"}
            </p>
            <div className="empty-actions">
              {statusFilter !== 'all' || fromDate || toDate ? (
                <button type="button" onClick={handleResetFilters} className="btn btn-secondary">
                  <X size={15} />
                  <span>Clear Filters</span>
                </button>
              ) : null}
              <Link to="/menu" className="btn btn-primary">
                <Pizza size={16} />
                <span>Explore Artisan Pizzas</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="orders-timeline-stack">
            {orders.map((order) => {
              const currentStageIdx = getStageIndex(order.status);
              const isDelivered = currentStageIdx === 3;
              const isUpdatedLive = lastLiveUpdateId === order._id;
              const isExpanded = expandedOrders.has(order._id);
              const hasReview = reviewsMap.has(order._id);
              const userReview = reviewsMap.get(order._id);

              return (
                <div
                  key={order._id}
                  className={`order-tracking-card ${isUpdatedLive ? 'live-flash' : ''} ${
                    isDelivered ? 'order-card-delivered' : ''
                  }`}
                >
                  {/* Order Summary Header (Clickable to Expand/Collapse) */}
                  <div
                    className="order-card-header"
                    onClick={() => toggleOrderExpand(order._id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="order-header-left">
                      <div className="order-title-row">
                        <h3>Order #{order._id.slice(-6).toUpperCase()}</h3>
                        <span className={`payment-pill ${order.paymentStatus}`}>
                          {order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus}
                        </span>
                        <span className={`status-badge-stage stage-${currentStageIdx}`}>
                          {isDelivered ? <CheckCircle size={13} /> : <span className="live-dot" />}
                          {order.status}
                        </span>
                      </div>
                      <div className="order-meta-row">
                        <span>
                          <Calendar size={14} />
                          {new Date(order.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>• {order.items?.length || 1} Pizza item{order.items?.length !== 1 ? 's' : ''}</span>
                        {order.deliveryAddress?.city && (
                          <span>
                            <MapPin size={14} />
                            {order.deliveryAddress.street}, {order.deliveryAddress.city}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="order-header-right">
                      <div className="order-total-block">
                        <span className="amount-label">Total Paid</span>
                        <span className="amount-value">₹{order.totalAmount}</span>
                      </div>
                      <button
                        type="button"
                        className="btn-expand-toggle"
                        aria-label={isExpanded ? 'Collapse order' : 'Expand order'}
                      >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* 4-Stage Visual Timeline */}
                  <div className="timeline-container">
                    <div className="timeline-track">
                      {ORDER_STAGES.map((stage, idx) => {
                        const isPast = idx <= currentStageIdx;
                        const isCurrent = idx === currentStageIdx;

                        const historyEntry = order.statusHistory?.find(
                          (h) => getStageIndex(h.status) === idx
                        );

                        return (
                          <div
                            key={stage.id}
                            className={`timeline-step ${isPast ? 'completed' : ''} ${
                              isCurrent ? 'current' : ''
                            }`}
                          >
                            <div className="timeline-node">{stage.icon}</div>
                            <div className="timeline-info">
                              <span className="stage-title">{stage.label}</span>
                              {historyEntry && (
                                <span className="stage-time">
                                  {new Date(historyEntry.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customer Review Section (Only for Delivered Orders) */}
                  {isDelivered && (
                    <div className="order-review-section">
                      {hasReview ? (
                        // Display submitted verified review
                        <div className="submitted-review-card">
                          <div className="review-header-row">
                            <div className="review-stars-display">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`star-icon-filled ${
                                    star <= (userReview?.rating || 5) ? 'active' : ''
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                              <span className="review-score-num">
                                {userReview?.rating}.0
                              </span>
                            </div>
                            <span className="review-badge-verified">
                              <CheckCircle size={13} /> Verified Customer Review
                            </span>
                            <span className="review-date">
                              {new Date(userReview?.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          {userReview?.comment && (
                            <p className="review-comment-text">
                              "{userReview?.comment}"
                            </p>
                          )}
                        </div>
                      ) : (
                        // Interactive "Rate this order" prompt
                        <div className="rate-order-prompt-box">
                          <div className="rate-prompt-header">
                            <div className="prompt-title">
                              <Sparkles size={16} color="#AA784C" />
                              <h5>Rate & Review Your Pizza Order</h5>
                            </div>
                            <span className="rate-sub">
                              How was the crust, taste and delivery?
                            </span>
                          </div>

                          <div className="star-rating-selector">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const currentRating = reviewFormState[order._id]?.rating || 5;
                              const currentHover = reviewFormState[order._id]?.hoverRating || 0;
                              const isFilled =
                                currentHover > 0 ? star <= currentHover : star <= currentRating;

                              return (
                                <button
                                  key={star}
                                  type="button"
                                  className={`star-select-btn ${isFilled ? 'star-filled' : ''}`}
                                  onClick={() => handleRatingChange(order._id, star)}
                                  onMouseEnter={() => handleRatingHover(order._id, star)}
                                  onMouseLeave={() => handleRatingHover(order._id, 0)}
                                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                                >
                                  ★
                                </button>
                              );
                            })}
                            <span className="rating-label-text">
                              {reviewFormState[order._id]?.hoverRating ||
                                reviewFormState[order._id]?.rating ||
                                5}{' '}
                              / 5 Stars
                            </span>
                          </div>

                          <div className="review-comment-field">
                            <textarea
                              placeholder="Share your thoughts on the pizza flavor, crispiness, sauce or delivery (optional)..."
                              value={reviewFormState[order._id]?.comment || ''}
                              onChange={(e) => handleCommentChange(order._id, e.target.value)}
                              maxLength={500}
                              rows={2}
                              className="review-textarea"
                            />
                          </div>

                          {reviewFormState[order._id]?.error && (
                            <div className="review-error-pill">
                              <AlertCircle size={13} />
                              <span>{reviewFormState[order._id].error}</span>
                            </div>
                          )}

                          <div className="review-submit-row">
                            <button
                              type="button"
                              onClick={() => handleSubmitReview(order._id)}
                              disabled={submittingReviewOrderId === order._id}
                              className="btn btn-primary btn-sm btn-submit-review"
                            >
                              {submittingReviewOrderId === order._id ? (
                                <>
                                  <RotateCw size={14} className="spin-icon" />
                                  <span>Submitting Review...</span>
                                </>
                              ) : (
                                <>
                                  <Star size={14} />
                                  <span>Submit Verified Review</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expandable Itemized Breakdown & Reorder Action */}
                  <div className={`order-expandable-details ${isExpanded ? 'expanded' : ''}`}>
                    <div className="itemized-breakdown-header">
                      <h4>Itemized Recipe & Pricing Breakdown</h4>
                      <span className="text-muted text-xs">
                        Click "Reorder" to load recipe into Pizza Builder with live stock & price validation
                      </span>
                    </div>

                    <div className="itemized-pizzas-list">
                      {order.items.map((item, idx) => {
                        const itemBasePrice = item.base?.price || 0;
                        const itemSaucePrice = item.sauce?.price || 0;
                        const itemCheesePrice = item.cheese?.price || 0;
                        const veggiesList = item.veggies || [];
                        const itemUnitPrice =
                          item.itemPrice ||
                          itemBasePrice +
                            itemSaucePrice +
                            itemCheesePrice +
                            veggiesList.reduce((s, v) => s + (v.price || 0), 0);
                        const itemSubtotal = itemUnitPrice * item.quantity;

                        return (
                          <div key={idx} className="itemized-pizza-card">
                            <div className="itemized-card-top">
                              <div className="pizza-recipe-specs">
                                <div className="recipe-title-line">
                                  <Pizza size={16} color="#872F20" />
                                  <h5>Custom Artisan Pizza #{idx + 1}</h5>
                                  <span className="qty-pill">Qty: {item.quantity}</span>
                                </div>

                                <div className="recipe-ingredients-grid">
                                  <div className="spec-item">
                                    <span className="spec-lbl">Crust:</span>
                                    <span className="spec-val">
                                      {item.base?.name || 'Classic Hand Tossed'} (₹{itemBasePrice})
                                    </span>
                                  </div>
                                  <div className="spec-item">
                                    <span className="spec-lbl">Sauce:</span>
                                    <span className="spec-val">
                                      {item.sauce?.name || 'San Marzano Marinara'} (₹{itemSaucePrice})
                                    </span>
                                  </div>
                                  <div className="spec-item">
                                    <span className="spec-lbl">Cheese:</span>
                                    <span className="spec-val">
                                      {item.cheese?.name || 'Fior Di Latte Mozzarella'} (₹{itemCheesePrice})
                                    </span>
                                  </div>
                                </div>

                                {/* Active Toppings Chips */}
                                <div className="recipe-toppings-wrap">
                                  <span className="spec-lbl">Toppings ({veggiesList.length}):</span>
                                  <div className="toppings-chips-list">
                                    {veggiesList.length > 0 ? (
                                      veggiesList.map((v) => (
                                        <span key={v._id || v.name} className="hist-topping-chip">
                                          {v.name} (+₹{v.price || 0})
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-dim text-xs">No extra toppings</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Pricing & Reorder Action */}
                              <div className="pizza-recipe-pricing">
                                <div className="price-calc-box">
                                  <span className="unit-calc">
                                    ₹{itemUnitPrice} × {item.quantity}
                                  </span>
                                  <span className="subtotal-calc">₹{itemSubtotal}</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReorderItem(item);
                                  }}
                                  className="btn-reorder-item"
                                  title="Reorder this exact pizza configuration"
                                >
                                  <RotateCw size={14} />
                                  <span>Reorder</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Delivery & Payment Metadata Footer */}
                    <div className="order-metadata-footer">
                      <div className="meta-block">
                        <strong>Delivery Address:</strong> {order.deliveryAddress?.street},{' '}
                        {order.deliveryAddress?.city}{' '}
                        {order.deliveryAddress?.pincode ? `(${order.deliveryAddress.pincode})` : ''} •
                        Phone: {order.deliveryAddress?.phone || 'N/A'}
                      </div>
                      {order.razorpayPaymentId && (
                        <div className="meta-block">
                          <strong>Payment ID:</strong> {order.razorpayPaymentId}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="orders-pagination-bar">
                <div className="pagination-info">
                  Showing page <strong>{pagination.currentPage}</strong> of{' '}
                  <strong>{pagination.totalPages}</strong> ({pagination.totalOrders} total orders)
                </div>

                <div className="pagination-buttons">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={!pagination.hasPrevPage}
                    className="btn-page-nav"
                  >
                    Previous
                  </button>

                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`btn-page-num ${pagination.currentPage === pageNum ? 'active' : ''}`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={!pagination.hasNextPage}
                    className="btn-page-nav"
                  >
                    Next
                  </button>
                </div>

                <div className="page-limit-selector">
                  <label>Per page:</label>
                  <select
                    value={pageLimit}
                    onChange={(e) => handleLimitChange(parseInt(e.target.value, 10))}
                    className="limit-select"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;
