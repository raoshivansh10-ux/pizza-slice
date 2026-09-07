import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Pizza,
  CheckCircle2,
  Gift,
  Package,
  Clock,
  ChevronRight,
  LogIn,
  RotateCcw,
  ExternalLink,
  ChefHat,
  Truck,
  CheckCircle,
} from 'lucide-react';

const CartDrawer = () => {
  const {
    cartItems,
    loadingCart,
    removeFromCart,
    updateQuantity,
    addToCart,
    cartSubtotal,
    totalItemCount,
    isCartOpen,
    setIsCartOpen,
    cartTab,
    setCartTab,
    toastMessage,
    showToast,
  } = useCart();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [recentOrders, setRecentOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Fetch recent orders when Orders tab is active
  useEffect(() => {
    if (isCartOpen && cartTab === 'orders' && isAuthenticated) {
      setLoadingOrders(true);
      api
        .get('/orders/mine?limit=5')
        .then((res) => {
          setRecentOrders(res.data.orders || []);
        })
        .catch((err) => {
          console.warn('[CartDrawer] Failed to fetch orders:', err.message);
        })
        .finally(() => {
          setLoadingOrders(false);
        });
    }
  }, [isCartOpen, cartTab, isAuthenticated]);

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/order-summary');
  };

  const handleTrackOrder = (orderId) => {
    setIsCartOpen(false);
    navigate('/orders');
  };

  const handleReorder = (order) => {
    if (!order.items || order.items.length === 0) return;
    order.items.forEach((item) => {
      addToCart({
        name: item.name || (item.base ? 'Custom Artisan Pizza' : 'Pizza Order'),
        price: item.price || item.unitPrice || 0,
        unitPrice: item.unitPrice || item.price || 0,
        quantity: item.quantity || 1,
        itemType: item.itemType || (item.base ? 'customPizza' : 'menuItem'),
        base: item.base,
        sauce: item.sauce,
        cheese: item.cheese,
        toppings: item.toppings || item.veggies || [],
        size: item.size || 'Medium',
      });
    });
    setCartTab('cart');
    showToast('🍕 Items added to your cart!');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'order_received':
        return { label: 'Order Received', icon: <Clock size={12} />, className: 'status-badge-received' };
      case 'in_the_kitchen':
        return { label: 'In Kitchen', icon: <ChefHat size={12} />, className: 'status-badge-kitchen' };
      case 'sent_to_delivery':
        return { label: 'Out for Delivery', icon: <Truck size={12} />, className: 'status-badge-delivery' };
      case 'delivered':
        return { label: 'Delivered', icon: <CheckCircle size={12} />, className: 'status-badge-delivered' };
      default:
        return { label: status?.replace(/_/g, ' ') || 'Processing', icon: <Package size={12} />, className: 'status-badge-default' };
    }
  };

  const formatOrderDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return dateStr;
    }
  };

  return (
    <>
      {/* Real-time Toast notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="cart-toast"
          >
            <CheckCircle2 size={18} color="#AA784C" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-over Backdrop & Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="cart-drawer-overlay">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="cart-drawer-backdrop"
            />

            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="cart-drawer-panel"
            >
              {/* Header */}
              <div className="cart-header">
                <div className="cart-header-title">
                  <ShoppingBag size={20} color="#FFC220" />
                  <h3>Pizza Slice</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="cart-close-btn"
                  aria-label="Close panel"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Segmented Tab Switcher: Cart vs My Orders */}
              <div className="cart-drawer-tabs">
                <button
                  type="button"
                  onClick={() => setCartTab('cart')}
                  className={`cart-drawer-tab ${cartTab === 'cart' ? 'active' : ''}`}
                >
                  <ShoppingBag size={15} />
                  <span>Cart</span>
                  {totalItemCount > 0 && <span className="tab-badge">{totalItemCount}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setCartTab('orders')}
                  className={`cart-drawer-tab ${cartTab === 'orders' ? 'active' : ''}`}
                >
                  <Package size={15} />
                  <span>My Orders</span>
                  {recentOrders.length > 0 && cartTab !== 'orders' && (
                    <span className="tab-badge-dot" />
                  )}
                </button>
              </div>

              {/* TAB 1: CART ITEMS */}
              {cartTab === 'cart' && (
                <>
                  <div className="cart-body">
                    {loadingCart ? (
                      <div className="cart-loading-state" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px' }} />
                        <p>Loading your cart...</p>
                      </div>
                    ) : cartItems.length === 0 ? (
                      <div className="cart-empty-state">
                        <Pizza size={48} color="#AA784C" />
                        <h4>Your Cart is Empty</h4>
                        <p>Customize an artisan pizza or explore our chef-crafted menu!</p>
                        <div className="cart-empty-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCartOpen(false);
                              navigate('/menu');
                            }}
                            className="btn btn-primary btn-sm"
                          >
                            <span>Explore Menu</span>
                            <ArrowRight size={14} />
                          </button>
                          {isAuthenticated && (
                            <button
                              type="button"
                              onClick={() => setCartTab('orders')}
                              className="btn btn-secondary btn-sm"
                            >
                              <Package size={14} />
                              <span>View Past Orders</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="cart-items-stack">
                        {cartItems.map((item) => {
                          const itemPrice = item.unitPrice || item.price || 0;
                          const isCombo = item.itemType === 'combo';
                          const isCustom = item.itemType === 'customPizza' || item.base;

                          return (
                            <div key={item.cartId} className="cart-item-card">
                              <div className="cart-item-top">
                                <div className="cart-item-info">
                                  <h4 className="cart-item-name">{item.name}</h4>
                                  <div className="cart-item-tags-row">
                                    {isCombo && (
                                      <span className="cart-item-combo-badge">
                                        <Gift size={11} /> Combo Deal
                                      </span>
                                    )}
                                    {item.size && (
                                      <span className="cart-item-size-badge">
                                        Size: {typeof item.size === 'object' ? item.size.label : item.size}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="cart-item-price">₹{itemPrice * item.quantity}</span>
                              </div>

                              {/* Custom Pizza Specs */}
                              {isCustom && item.base && (
                                <div className="cart-item-specs">
                                  <div className="spec-row">
                                    <span className="spec-label">Crust:</span>
                                    <span className="spec-val">{item.base?.name || 'Classic Hand Tossed'}</span>
                                  </div>
                                  <div className="spec-row">
                                    <span className="spec-label">Sauce:</span>
                                    <span className="spec-val">{item.sauce?.name || 'San Marzano'}</span>
                                  </div>
                                  <div className="spec-row">
                                    <span className="spec-label">Cheese:</span>
                                    <span className="spec-val">
                                      {item.cheese?.name || 'Mozzarella'}
                                      {item.extraCheese ? ' + Extra Cheese (₹40)' : ''}
                                    </span>
                                  </div>

                                  {item.toppings && item.toppings.length > 0 && (
                                    <div className="spec-toppings">
                                      <span className="spec-label">Toppings:</span>
                                      <div className="spec-chips">
                                        {item.toppings.map((top) => (
                                          <span key={top._id || top.name || top} className="topping-chip">
                                            {typeof top === 'object' ? top.name : top}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Quantity & Delete Controls */}
                              <div className="cart-item-actions">
                                <div className="cart-qty-selector">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.cartId, -1)}
                                    className="cart-qty-btn"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="cart-qty-value">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.cartId, 1)}
                                    className="cart-qty-btn"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus size={14} />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeFromCart(item.cartId)}
                                  className="cart-item-remove-btn"
                                  title="Remove item"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Switch to orders banner */}
                        {isAuthenticated && (
                          <div className="cart-drawer-order-hint">
                            <span>Looking for recent orders?</span>
                            <button
                              type="button"
                              onClick={() => setCartTab('orders')}
                              className="btn-link-tab"
                            >
                              View My Orders <ChevronRight size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer with Checkout CTA */}
                  {cartItems.length > 0 && (
                    <div className="cart-footer">
                      <div className="cart-subtotal-row">
                        <span className="subtotal-label">Subtotal:</span>
                        <span className="subtotal-value">₹{cartSubtotal}</span>
                      </div>
                      <p className="cart-tax-notice">Taxes, delivery, and loyalty discounts applied at checkout</p>
                      <button type="button" onClick={handleCheckout} className="btn btn-primary btn-block btn-checkout">
                        <span>Proceed to Checkout</span>
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: MY ORDERS & LIVE TRACKING */}
              {cartTab === 'orders' && (
                <div className="cart-body drawer-orders-body">
                  {!isAuthenticated ? (
                    <div className="cart-empty-state">
                      <LogIn size={44} color="#AA784C" />
                      <h4>Sign In to View Orders</h4>
                      <p>Log in with your account to view past orders, track real-time delivery, and reorder with 1-click.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCartOpen(false);
                          navigate('/login');
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        <LogIn size={15} />
                        <span>Sign In</span>
                      </button>
                    </div>
                  ) : loadingOrders ? (
                    <div className="cart-loading-state" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                      <div className="spinner" style={{ margin: '0 auto 16px' }} />
                      <p>Fetching your orders...</p>
                    </div>
                  ) : recentOrders.length === 0 ? (
                    <div className="cart-empty-state">
                      <Package size={44} color="#AA784C" />
                      <h4>No Past Orders Found</h4>
                      <p>You haven't placed any orders yet. Try one of our signature pizzas!</p>
                      <button
                        type="button"
                        onClick={() => {
                          setCartTab('cart');
                          setIsCartOpen(false);
                          navigate('/menu');
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        <Pizza size={15} />
                        <span>Order Now</span>
                      </button>
                    </div>
                  ) : (
                    <div className="drawer-orders-list">
                      <div className="drawer-orders-header">
                        <span className="orders-header-title">Recent Orders</span>
                        <Link
                          to="/orders"
                          onClick={() => setIsCartOpen(false)}
                          className="orders-view-all-link"
                        >
                          <span>Full History</span>
                          <ExternalLink size={12} />
                        </Link>
                      </div>

                      {recentOrders.map((order) => {
                        const statusInfo = getStatusBadge(order.status);
                        const orderNum = order._id ? order._id.slice(-6).toUpperCase() : '---';
                        const itemsCount = (order.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0);

                        return (
                          <div key={order._id} className="drawer-order-card">
                            <div className="drawer-order-top">
                              <div className="order-id-date">
                                <span className="order-num">#{orderNum}</span>
                                <span className="order-date">{formatOrderDate(order.createdAt)}</span>
                              </div>
                              <span className={`status-pill ${statusInfo.className}`}>
                                {statusInfo.icon}
                                <span>{statusInfo.label}</span>
                              </span>
                            </div>

                            {/* Items Summary */}
                            <div className="drawer-order-items-preview">
                              {(order.items || []).slice(0, 3).map((item, idx) => (
                                <div key={idx} className="drawer-order-item-line">
                                  <span className="item-qty">{item.quantity || 1}x</span>
                                  <span className="item-name">{item.name || (item.base ? 'Custom Pizza' : 'Pizza')}</span>
                                </div>
                              ))}
                              {(order.items || []).length > 3 && (
                                <span className="drawer-order-more-items">
                                  +{(order.items || []).length - 3} more items
                                </span>
                              )}
                            </div>

                            {/* Price & Actions */}
                            <div className="drawer-order-footer">
                              <div className="drawer-order-price-wrap">
                                <span className="total-label">Total</span>
                                <span className="total-amount">₹{order.totalAmount || order.total || 0}</span>
                              </div>

                              <div className="drawer-order-actions">
                                <button
                                  type="button"
                                  onClick={() => handleReorder(order)}
                                  className="btn-order-reorder"
                                  title="Reorder items to Cart"
                                >
                                  <RotateCcw size={13} />
                                  <span>Reorder</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTrackOrder(order._id)}
                                  className="btn-order-track"
                                  title="View detailed tracking & review"
                                >
                                  <span>Track</span>
                                  <ChevronRight size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Full orders page banner */}
                      <div className="drawer-full-orders-banner">
                        <Link
                          to="/orders"
                          onClick={() => setIsCartOpen(false)}
                          className="btn btn-secondary btn-block btn-sm"
                        >
                          <Package size={14} />
                          <span>View Full Order History & Filters</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CartDrawer;
