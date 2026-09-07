import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useBuilder } from '../context/BuilderContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import VisualPizzaCanvas from '../components/builder/VisualPizzaCanvas';
import {
  CreditCard,
  MapPin,
  Pizza,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  Award,
  Sparkles,
  X,
  Tag,
  Gift,
  Utensils,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const OrderSummaryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, cartSubtotal, updateQuantity, removeFromCart, clearCart } = useCart();
  const {
    selectedBase,
    selectedSauce,
    selectedCheese,
    selectedVeggies,
    runningTotal: builderTotal,
    resetBuilder,
  } = useBuilder();

  // If cart has items, use cartItems; otherwise if builder has selections, use builder fallback
  const isDirectBuilder = cartItems.length === 0 && selectedBase && selectedSauce && selectedCheese;

  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '123 Gourmet Way, Floor 2',
    city: 'Mumbai',
    pincode: '400001',
    phone: '+91 9876543210',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverOrderInfo, setServerOrderInfo] = useState(null);
  const [testModalData, setTestModalData] = useState(null);

  // Loyalty Program State
  const [loyaltyInfo, setLoyaltyInfo] = useState(null);
  const [pointsInput, setPointsInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redemptionError, setRedemptionError] = useState('');
  const [appliedRedemption, setAppliedRedemption] = useState(null);

  useEffect(() => {
    if (cartItems.length === 0 && !isDirectBuilder) {
      navigate('/menu');
    }
  }, [cartItems.length, isDirectBuilder, navigate]);

  // Fetch customer's loyalty status
  useEffect(() => {
    api
      .get('/loyalty/me')
      .then((res) => {
        setLoyaltyInfo(res.data.loyalty);
      })
      .catch((err) => {
        console.warn('Could not fetch loyalty status:', err.message);
      });
  }, []);

  const handleAddressChange = (field, value) => {
    setDeliveryAddress((prev) => ({ ...prev, [field]: value }));
  };

  // Authoritative server-side loyalty points redemption quote & token
  const handleApplyLoyaltyPoints = async (pointsToUse) => {
    const pts = parseInt(pointsToUse || pointsInput, 10);
    setRedemptionError('');

    if (isNaN(pts) || pts <= 0) {
      setRedemptionError('Please enter a valid number of points to redeem.');
      return;
    }

    if (pts > (loyaltyInfo?.pointsBalance || 0)) {
      setRedemptionError(`You only have ${loyaltyInfo?.pointsBalance || 0} points available.`);
      return;
    }

    try {
      setRedeeming(true);
      const res = await api.post('/loyalty/redeem', { pointsToRedeem: pts });
      setAppliedRedemption(res.data.redemption);
      setPointsInput(pts.toString());
    } catch (err) {
      setRedemptionError(err.response?.data?.error || err.message || 'Could not apply points.');
    } finally {
      setRedeeming(false);
    }
  };

  const handleRemoveRedemption = () => {
    setAppliedRedemption(null);
    setPointsInput('');
    setRedemptionError('');
  };

  // Subtotal from Cart (or Builder fallback)
  const effectiveSubtotal = cartItems.length > 0 ? cartSubtotal : builderTotal;
  const appliedDiscount = appliedRedemption ? appliedRedemption.discountAmount : 0;
  const finalPayableTotal = Math.max(0, effectiveSubtotal - appliedDiscount);

  // Initiate Razorpay Checkout Flow via POST /api/payment/create-order
  const handleProceedToPayment = async () => {
    setError('');
    setLoading(true);

    try {
      let itemsPayload = [];

      if (cartItems.length > 0) {
        itemsPayload = cartItems.map((item) => ({
          itemType: item.itemType || 'menuItem',
          name: item.name,
          size: typeof item.size === 'object' ? item.size.label : item.size || 'M',
          refId: item.refId || undefined,
          base: item.customSelections?.base?._id || item.base?._id || item.base || undefined,
          sauce: item.customSelections?.sauce?._id || item.sauce?._id || item.sauce || undefined,
          cheese: item.customSelections?.cheese?._id || item.cheese?._id || item.cheese || undefined,
          veggies: (item.customSelections?.toppings || item.toppings || []).map((t) => t._id || t).filter(Boolean),
          quantity: item.quantity || 1,
          customSelections: item.customSelections || undefined,
        }));
      } else if (isDirectBuilder) {
        itemsPayload = [
          {
            itemType: 'customPizza',
            name: 'Custom Artisan Pizza',
            base: selectedBase._id,
            sauce: selectedSauce._id,
            cheese: selectedCheese._id,
            veggies: selectedVeggies.map((v) => v._id),
            quantity: 1,
          },
        ];
      }

      const orderPayload = {
        items: itemsPayload,
        deliveryAddress,
        redemptionToken: appliedRedemption?.redemptionToken || undefined,
      };

      // 1. Create order on server and retrieve Razorpay order details
      const res = await api.post('/payment/create-order', orderPayload);
      const { order_id, razorpayOrderId, orderId, amount, currency, key_id, finalAmount } = res.data;
      const activeRazorpayOrderId = order_id || razorpayOrderId;
      setServerOrderInfo(res.data);

      const activeKey = import.meta.env.VITE_RAZORPAY_KEY_ID || key_id || '';
      const isRealRazorpayKey = Boolean(activeKey && (activeKey.startsWith('rzp_test_') || activeKey.startsWith('rzp_live_')));

      // 2. If a real Razorpay key is present, open standard Razorpay Checkout
      if (isRealRazorpayKey) {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Could not load Razorpay SDK from CDN.');
        }

        const options = {
          key: activeKey,
          amount: amount, // in paise
          currency: currency || 'INR',
          name: 'Pizza Slice Delivery',
          description: `Order #${(orderId || activeRazorpayOrderId).toString().slice(-6).toUpperCase()}`,
          order_id: activeRazorpayOrderId,
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: deliveryAddress.phone,
          },
          theme: {
            color: '#F86015',
          },
          handler: async function (paymentResponse) {
            await verifyAndFinalize(paymentResponse, orderId, finalAmount || amount / 100);
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
              console.log('[Razorpay] Modal dismissed. Cart preserved.');
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          setError(`Payment Failed: ${resp.error?.description || 'Transaction cancelled.'} Cart items preserved.`);
          setLoading(false);
        });
        rzp.open();
      } else {
        // 3. Sandbox Test Simulation Modal when running in test mode with dummy keys
        setLoading(false);
        setTestModalData({
          activeRazorpayOrderId,
          orderId,
          amountPaise: amount,
          finalAmount: finalAmount || amount / 100,
          currency: currency || 'INR',
          customerName: user?.name || 'Customer',
          customerEmail: user?.email || 'customer@pizzaslice.app',
          customerPhone: deliveryAddress.phone,
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Payment initiation failed.');
      setLoading(false);
    }
  };

  const handleSimulateTestPaymentSuccess = async () => {
    if (!testModalData) return;
    const { activeRazorpayOrderId, orderId, finalAmount } = testModalData;
    setTestModalData(null);
    const simulatedPaymentId = `pay_test_${Date.now()}`;
    const simulatedSignature = `sig_test_${Date.now()}`;
    await verifyAndFinalize(
      {
        razorpay_order_id: activeRazorpayOrderId,
        razorpay_payment_id: simulatedPaymentId,
        razorpay_signature: simulatedSignature,
      },
      orderId,
      finalAmount
    );
  };

  const handleSimulateTestPaymentFailure = () => {
    setTestModalData(null);
    setError('Payment Failed: Simulated test bank decline. Your cart items remain saved.');
    setLoading(false);
  };

  const verifyAndFinalize = async (paymentData, orderId, totalAmount) => {
    try {
      setLoading(true);
      const verifyRes = await api.post('/payment/verify', {
        orderId,
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
        deliveryAddress,
      });

      // Clear user cart only upon successful server payment verification
      clearCart();
      resetBuilder();

      const verifiedOrderId = verifyRes.data?.orderId || orderId;
      const verifiedPaymentId = verifyRes.data?.paymentId || paymentData.razorpay_payment_id;
      const verifiedTotal = verifyRes.data?.total || totalAmount;

      navigate('/order-success', {
        state: {
          orderId: verifiedOrderId,
          paymentId: verifiedPaymentId,
          total: verifiedTotal,
          order: verifyRes.data?.order,
        },
      });
    } catch (err) {
      setError(`Payment verification failed: ${err.response?.data?.error || err.message}. Your cart items remain saved.`);
    } finally {
      setLoading(false);
    }
  };

  const itemsToRender = cartItems.length > 0 ? cartItems : isDirectBuilder ? [{
    cartId: 'direct-builder',
    name: 'Custom Artisan Pizza',
    itemType: 'customPizza',
    quantity: 1,
    unitPrice: builderTotal,
    base: selectedBase,
    sauce: selectedSauce,
    cheese: selectedCheese,
    toppings: selectedVeggies,
  }] : [];

  return (
    <div className="summary-page">
      <div className="summary-page-container">
        <div className="page-header">
          <Link to="/menu" className="back-link">
            <ArrowLeft size={18} />
            <span>Back to Menu</span>
          </Link>
          <h2>Order Summary & Checkout</h2>
          <p>Review your itemized selections, apply loyalty discounts, and confirm delivery address</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="summary-grid">
          {/* Left Column: Itemized Cart Breakdown */}
          <div className="card-panel">
            <div className="panel-header">
              <Pizza size={22} color="#E31837" />
              <h3>Items in Your Order ({itemsToRender.reduce((acc, i) => acc + i.quantity, 0)})</h3>
            </div>

            <div className="summary-items-list">
              {itemsToRender.map((item) => {
                const itemPrice = item.unitPrice || item.price || 0;
                const isCombo = item.itemType === 'combo';
                const isCustom = item.itemType === 'customPizza' || item.base;

                return (
                  <div key={item.cartId} className="summary-item-row">
                    <div className="summary-item-left">
                      <div className="summary-item-title-wrap">
                        <h4 className="summary-item-name">{item.name}</h4>
                        <div className="summary-item-tags">
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

                      {/* Custom Pizza Specs */}
                      {isCustom && item.base && (
                        <div className="summary-custom-specs">
                          <span>Crust: {item.base.name || 'Classic'}</span>
                          <span>• Sauce: {item.sauce?.name || 'San Marzano'}</span>
                          <span>• Cheese: {item.cheese?.name || 'Mozzarella'}</span>
                          {item.toppings && item.toppings.length > 0 && (
                            <span>• Toppings: {item.toppings.map((t) => t.name || t).join(', ')}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="summary-item-right">
                      <div className="summary-qty-controls">
                        {cartItems.length > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.cartId, -1)}
                              className="btn-qty-mini"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="summary-qty-val">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.cartId, 1)}
                              className="btn-qty-mini"
                            >
                              <Plus size={12} />
                            </button>
                          </>
                        )}
                      </div>
                      <span className="summary-item-cost">₹{itemPrice * item.quantity}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Points-Based Loyalty Redemption Box */}
            {loyaltyInfo && loyaltyInfo.pointsBalance > 0 && (
              <div className="summary-loyalty-redemption-box">
                <div className="redemption-header">
                  <div className="redemption-title-row">
                    <Award size={18} color="#AA784C" />
                    <h4>Redeem Loyalty Points</h4>
                  </div>
                  <span className="available-pts-badge">
                    {loyaltyInfo.pointsBalance} pts available (≈ ₹{loyaltyInfo.rupeeEquivalent})
                  </span>
                </div>

                {appliedRedemption ? (
                  <div className="applied-redemption-card">
                    <div className="applied-info">
                      <Tag size={16} color="#a3b87c" />
                      <div>
                        <strong>{appliedRedemption.pointsToRedeem} Points Applied</strong>
                        <span>Saving ₹{appliedRedemption.discountAmount} on this order</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveRedemption}
                      className="btn-remove-redemption"
                      title="Remove applied points"
                    >
                      <X size={15} />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : (
                  <div className="redemption-input-block">
                    <div className="quick-points-presets">
                      {loyaltyInfo.pointsBalance >= 50 && (
                        <button
                          type="button"
                          onClick={() => handleApplyLoyaltyPoints(50)}
                          className="btn-pts-preset"
                        >
                          50 pts (₹25)
                        </button>
                      )}
                      {loyaltyInfo.pointsBalance >= 100 && (
                        <button
                          type="button"
                          onClick={() => handleApplyLoyaltyPoints(100)}
                          className="btn-pts-preset"
                        >
                          100 pts (₹50)
                        </button>
                      )}
                      {loyaltyInfo.pointsBalance >= 200 && (
                        <button
                          type="button"
                          onClick={() => handleApplyLoyaltyPoints(200)}
                          className="btn-pts-preset"
                        >
                          200 pts (₹100)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleApplyLoyaltyPoints(loyaltyInfo.pointsBalance)}
                        className="btn-pts-preset highlight"
                      >
                        Max ({loyaltyInfo.pointsBalance} pts)
                      </button>
                    </div>

                    <div className="custom-pts-input-row">
                      <input
                        type="number"
                        placeholder="Enter points (e.g. 50)"
                        value={pointsInput}
                        onChange={(e) => setPointsInput(e.target.value)}
                        min={1}
                        max={loyaltyInfo.pointsBalance}
                        className="points-number-input"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyLoyaltyPoints(pointsInput)}
                        disabled={redeeming}
                        className="btn btn-secondary btn-sm btn-apply-points"
                      >
                        {redeeming ? 'Applying...' : 'Apply Points'}
                      </button>
                    </div>

                    {redemptionError && (
                      <div className="redemption-error-msg">
                        <AlertCircle size={13} />
                        <span>{redemptionError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Total Calculation Breakdown */}
            <div className="total-calculation-box">
              <div className="calc-row">
                <span className="calc-lbl">Subtotal:</span>
                <span className="calc-val">₹{effectiveSubtotal}</span>
              </div>

              {appliedDiscount > 0 && (
                <div className="calc-row discount-row">
                  <span className="calc-lbl">Loyalty Discount ({appliedRedemption.pointsToRedeem} pts):</span>
                  <span className="calc-val discount-val">-₹{appliedDiscount}</span>
                </div>
              )}

              <div className="calc-divider" />

              <div className="calc-row grand-total-row">
                <span className="calc-lbl">Total Payable Amount:</span>
                <span className="grand-total">₹{finalPayableTotal}</span>
              </div>

              <div className="points-will-earn-sub">
                <Sparkles size={13} color="#AA784C" />
                <span>You will earn <strong>{Math.floor(finalPayableTotal / 10)} loyalty points</strong> on this order</span>
              </div>
            </div>
          </div>

          {/* Right Column: Delivery & Checkout Panel */}
          <div className="card-panel">
            <div className="panel-header">
              <MapPin size={22} color="#AA784C" />
              <h3>Delivery Details</h3>
            </div>

            <div className="address-form">
              <div className="form-group">
                <label>Street Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={deliveryAddress.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  placeholder="Street, Building, Flat"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    className="form-input"
                    value={deliveryAddress.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Pincode</label>
                  <input
                    type="text"
                    className="form-input"
                    value={deliveryAddress.pincode}
                    onChange={(e) => handleAddressChange('pincode', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Contact Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={deliveryAddress.phone}
                  onChange={(e) => handleAddressChange('phone', e.target.value)}
                  required
                />
              </div>

              <div className="security-notice">
                <ShieldCheck size={18} color="#AA784C" />
                <span>Secured with Razorpay 256-bit cryptographic verification</span>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-block btn-pay"
                onClick={handleProceedToPayment}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spin-icon" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    <span>Pay ₹{finalPayableTotal} with Razorpay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Razorpay Test Simulation Modal (Active when using test/sandbox mode) */}
        {testModalData && (
          <div className="rzp-simulator-overlay">
            <div className="rzp-simulator-card">
              <div className="rzp-sim-header">
                <div className="rzp-brand-badge">
                  <span className="rzp-logo-text">Razorpay</span>
                  <span className="rzp-test-tag">TEST MODE</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTestModalData(null)}
                  className="rzp-sim-close"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="rzp-sim-body">
                <div className="rzp-amount-box">
                  <span className="rzp-amount-label">Amount Payable</span>
                  <span className="rzp-amount-val">₹{testModalData.finalAmount}</span>
                  <span className="rzp-order-ref">Order #{testModalData.activeRazorpayOrderId}</span>
                </div>

                <div className="rzp-customer-info">
                  <div className="rzp-info-line">
                    <span className="lbl">Customer:</span>
                    <span className="val">{testModalData.customerName}</span>
                  </div>
                  <div className="rzp-info-line">
                    <span className="lbl">Email:</span>
                    <span className="val">{testModalData.customerEmail}</span>
                  </div>
                  <div className="rzp-info-line">
                    <span className="lbl">Phone:</span>
                    <span className="val">{testModalData.customerPhone}</span>
                  </div>
                </div>

                <div className="rzp-sim-actions">
                  <button
                    type="button"
                    onClick={handleSimulateTestPaymentSuccess}
                    className="btn btn-primary btn-block"
                  >
                    <CheckCircle size={16} />
                    <span>Simulate Successful Payment</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSimulateTestPaymentFailure}
                    className="btn btn-secondary btn-block rzp-btn-fail"
                  >
                    <span>Simulate Payment Failure</span>
                  </button>
                </div>

                <p className="rzp-sim-note">
                  💡 <strong>Tip:</strong> To test with Razorpay's live popup, add your real Test Key ID from <code>dashboard.razorpay.com</code> in <code>.env</code>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderSummaryPage;
