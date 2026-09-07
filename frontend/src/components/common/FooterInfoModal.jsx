import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Pizza,
  Store,
  MapPin,
  Clock,
  Phone,
  Mail,
  ShieldCheck,
  Award,
  Briefcase,
  Gift,
  FileText,
  Lock,
  Sparkles,
  CheckCircle,
  Copy,
  Search,
  ExternalLink,
  ChevronRight,
  Truck,
  Leaf,
  Users,
  CreditCard,
  Sliders,
  DollarSign,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';

const NEARBY_STORES = [
  {
    id: 1,
    name: 'Pizza Slice - Downtown Flagship',
    address: 'Shop 12-14, Connaught Place, Central Hub',
    distance: '1.2 km',
    time: '20-25 mins',
    status: 'Open Now • Closes 2:00 AM',
    phone: '+91 1800 208 1234',
  },
  {
    id: 2,
    name: 'Pizza Slice - Metro Square Kitchen',
    address: 'Ground Floor, Galleria Tower, Indiranagar',
    distance: '2.8 km',
    time: '25-30 mins',
    status: 'Open Now • Closes 1:00 AM',
    phone: '+91 1800 208 1234',
  },
  {
    id: 3,
    name: 'Pizza Slice - Tech Park Express',
    address: 'Food Court 2, Cyber Hub, Phase 3',
    distance: '4.5 km',
    time: '30-35 mins',
    status: 'Open Now • 24/7 Delivery',
    phone: '+91 1800 208 1234',
  },
];

const JOB_OPENINGS = [
  {
    id: 'job-1',
    role: 'Artisanal Pizza Chef / Pizzaiolo',
    dept: 'Kitchen Operations',
    type: 'Full-Time',
    loc: 'City Flagship Kitchens',
    desc: 'Expertise in wood-fired oven baking, 48-hr cold fermented dough stretching, and premium topping curation.',
  },
  {
    id: 'job-2',
    role: 'Fast Delivery Rider Partner',
    dept: 'Logistics Fleet',
    type: 'Flexible / Full-Time',
    loc: 'Multiple Local Hubs',
    desc: 'Guaranteed hourly incentives, fuel allowance, and thermal delivery safety equipment provided.',
  },
  {
    id: 'job-3',
    role: 'Shift Floor & Kitchen Lead',
    dept: 'Store Management',
    type: 'Full-Time',
    loc: 'Metropolitan Outlets',
    desc: 'Drive daily store excellence, food hygiene benchmarks, and fast order dispatch SLAs.',
  },
];

const PROMO_VOUCHERS = [
  {
    code: 'FEAST350',
    title: 'Weekend Party Feast',
    discount: 'Flat ₹350 OFF',
    minOrder: 'Min order ₹1,000',
    validity: 'Valid on all Combo Platter orders',
  },
  {
    code: 'COUPLE130',
    title: 'Couples Pizza Treat',
    discount: 'Flat ₹130 OFF',
    minOrder: 'Min order ₹450',
    validity: 'Valid on 1 Medium Pizza + Cheesy Bread',
  },
  {
    code: 'VIPPIZZA',
    title: '2X VIP Loyalty Points',
    discount: 'Double Rewards',
    minOrder: 'No min order',
    validity: 'Valid on all Handcrafted Artisan Pizzas',
  },
];

const FooterInfoModal = ({ modalType, onClose }) => {
  const { showToast } = useCart();

  // Balance enquiry state
  const [cardNumber, setCardNumber] = useState('');
  const [cardPin, setCardPin] = useState('');
  const [balanceResult, setBalanceResult] = useState(null);

  // Franchise form state
  const [franchiseForm, setFranchiseForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    carpetArea: '1200 - 1500 sq.ft',
    investment: '₹30 - 45 Lakhs',
  });
  const [franchiseSubmitted, setFranchiseSubmitted] = useState(false);

  // Store locator search
  const [storeQuery, setStoreQuery] = useState('');

  // Cookie preferences
  const [cookiePrefs, setCookiePrefs] = useState({
    essential: true,
    analytics: true,
    marketing: false,
    preferences: true,
  });

  // Copied code feedback
  const [copiedCode, setCopiedCode] = useState(null);

  if (!modalType) return null;

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`✅ Coupon code ${code} copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCheckBalance = (e) => {
    e.preventDefault();
    if (!cardNumber || !cardPin) {
      showToast('⚠️ Please enter both card number and PIN');
      return;
    }
    setBalanceResult({
      card: `•••• •••• •••• ${cardNumber.slice(-4) || '8821'}`,
      balance: '₹1,250.00',
      expiry: 'Valid till 31 Dec 2027',
      status: 'Active & Redeemable',
    });
  };

  const handleFranchiseSubmit = (e) => {
    e.preventDefault();
    setFranchiseSubmitted(true);
    showToast('🎉 Franchise inquiry submitted! Our expansion team will contact you within 24 hours.');
  };

  const handleSaveCookies = () => {
    showToast('🍪 Cookie preferences saved successfully!');
    onClose();
  };

  const filteredStores = NEARBY_STORES.filter(
    (s) =>
      s.name.toLowerCase().includes(storeQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(storeQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="footer-modal-backdrop" onClick={onClose}>
        <motion.div
          className="footer-modal-dialog"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="footer-modal-header">
            <div className="modal-header-branding">
              <div className="modal-header-icon-disc">
                {modalType === 'blog' && <FileText size={20} color="#FFC220" />}
                {modalType === 'investors' && <Award size={20} color="#FFC220" />}
                {modalType === 'ads' && <Sparkles size={20} color="#FFC220" />}
                {modalType === 'careers' && <Briefcase size={20} color="#FFC220" />}
                {modalType === 'sustainability' && <Leaf size={20} color="#10b981" />}
                {['restaurants', 'pizza-near-me', 'food-near-me'].includes(modalType) && (
                  <Store size={20} color="#007DC6" />
                )}
                {modalType === 'food-delivery' && <Truck size={20} color="#007DC6" />}
                {modalType === 'italian-food' && <Pizza size={20} color="#FFC220" />}
                {['gift-card', 'vouchers'].includes(modalType) && <Gift size={20} color="#FFC220" />}
                {modalType === 'balance-enquiry' && <CreditCard size={20} color="#007DC6" />}
                {modalType === 'pizza-party' && <Users size={20} color="#FFC220" />}
                {modalType === 'franchise' && <Award size={20} color="#007DC6" />}
                {['terms', 'privacy', 'disclaimer'].includes(modalType) && (
                  <ShieldCheck size={20} color="#007DC6" />
                )}
                {modalType === 'cookies' && <Sliders size={20} color="#FFC220" />}
                {modalType === 'security' && <Lock size={20} color="#10b981" />}
              </div>
              <div>
                <h3 className="modal-header-title">
                  {modalType === 'blog' && 'Pizza Slice Culinary Blog'}
                  {modalType === 'investors' && 'Investor Relations & Milestones'}
                  {modalType === 'ads' && 'Brand Campaigns & Advertisements'}
                  {modalType === 'careers' && 'Careers at Pizza Slice'}
                  {modalType === 'sustainability' && 'Eco-Friendly & Green Kitchen Pledge'}
                  {['restaurants', 'pizza-near-me', 'food-near-me'].includes(modalType) &&
                    'Find Nearby Pizza Slice Kitchens'}
                  {modalType === 'food-delivery' && '30-Minute Hot Delivery Promise'}
                  {modalType === 'italian-food' && 'Our Authentic Italian Craftsmanship'}
                  {modalType === 'gift-card' && 'Digital Gift Cards & Festive Packs'}
                  {modalType === 'balance-enquiry' && 'Gift Card Balance Checker'}
                  {modalType === 'pizza-party' && 'Virtual Pizza Party & Group Orders'}
                  {modalType === 'vouchers' && 'Exclusive E-Gift Promo Vouchers'}
                  {modalType === 'franchise' && 'Franchise & Business Partnership'}
                  {modalType === 'terms' && 'Terms & Conditions of Service'}
                  {modalType === 'privacy' && 'Privacy & Data Protection Policy'}
                  {modalType === 'disclaimer' && 'Allergen & Nutritional Disclaimer'}
                  {modalType === 'cookies' && 'Cookie & Privacy Preferences'}
                  {modalType === 'security' && 'Payment & Data Security Guarantee'}
                </h3>
                <p className="modal-header-sub">Pizza Slice Official Platform Information</p>
              </div>
            </div>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Content */}
          <div className="footer-modal-body">
            {/* 1. BLOG */}
            {modalType === 'blog' && (
              <div className="modal-blog-grid">
                <article className="modal-blog-card">
                  <div className="blog-card-tag">Artisan Baking</div>
                  <h4>The Science of 48-Hour Cold Fermentation Dough</h4>
                  <p>
                    Why our dough rises lighter, tastes richer, and yields the distinct crisp Neapolitan leopard crust without heavy bloating.
                  </p>
                  <span className="blog-date">4 min read • By Master Pizzaiolo Marco</span>
                </article>
                <article className="modal-blog-card">
                  <div className="blog-card-tag">Farm Fresh</div>
                  <h4>Sourcing 100% Real Dairy Buffalo Mozzarella</h4>
                  <p>
                    From ethical dairy farms to our stone ovens in 24 hours — how our cheese delivers the ultimate golden melt and cheese pull.
                  </p>
                  <span className="blog-date">3 min read • By Sourcing Director Priya</span>
                </article>
              </div>
            )}

            {/* 2. INVESTORS */}
            {modalType === 'investors' && (
              <div className="modal-info-stack">
                <div className="modal-metrics-row">
                  <div className="modal-metric-card">
                    <span className="metric-val">500+</span>
                    <span className="metric-lbl">Kitchen Outlets</span>
                  </div>
                  <div className="modal-metric-card">
                    <span className="metric-val">99.4%</span>
                    <span className="metric-lbl">On-Time Delivery</span>
                  </div>
                  <div className="modal-metric-card">
                    <span className="metric-val">4.9/5</span>
                    <span className="metric-lbl">Customer Rating</span>
                  </div>
                </div>
                <p className="modal-text">
                  Pizza Slice is India's fastest growing artisanal delivery-first pizza network, combining proprietary thermal IoT logistics with premium farm-to-crust recipes. For annual reports or corporate governance disclosures, reach out to our IR desk at <strong>ir@pizzaslice.com</strong>.
                </p>
              </div>
            )}

            {/* 3. ADS */}
            {modalType === 'ads' && (
              <div className="modal-info-stack">
                <div className="modal-ad-banner">
                  <span className="ad-badge">CURRENT CAMPAIGN</span>
                  <h4>"Hotter. Cheesier. Faster in 30."</h4>
                  <p>Watch our nationwide commercial spotlighting artisanal cheese bursts and instant thermal dispatch.</p>
                </div>
                <p className="modal-text">
                  For brand sponsorship inquiries, celebrity collaborations, and media partnerships, contact our creative marketing division at <strong>marketing@pizzaslice.com</strong>.
                </p>
              </div>
            )}

            {/* 4. CAREERS */}
            {modalType === 'careers' && (
              <div className="modal-info-stack">
                <p className="modal-intro-text">
                  Join our passionate culinary and tech fleet across India. Competitive compensation, health benefits, and fast-track career growth.
                </p>
                <div className="modal-jobs-list">
                  {JOB_OPENINGS.map((job) => (
                    <div key={job.id} className="modal-job-item">
                      <div className="job-meta">
                        <span className="job-dept">{job.dept} • {job.type}</span>
                        <h4 className="job-title">{job.role}</h4>
                        <p className="job-desc">{job.desc}</p>
                        <span className="job-loc"><MapPin size={13} /> {job.loc}</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => showToast(`Application initiated for ${job.role}! Send CV to careers@pizzaslice.com`)}
                      >
                        Apply Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. SUSTAINABILITY */}
            {modalType === 'sustainability' && (
              <div className="modal-info-stack">
                <div className="sustainability-highlights">
                  <div className="sust-box">
                    <Leaf size={24} color="#10b981" />
                    <h4>100% Recyclable Boxes</h4>
                    <p>FSC-certified unbleached Kraft paper packaging printed with non-toxic organic soy inks.</p>
                  </div>
                  <div className="sust-box">
                    <Truck size={24} color="#007DC6" />
                    <h4>EV Green Delivery</h4>
                    <p>65% of our inner-city order fleet runs on electric two-wheelers with zero urban tailpipe emissions.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 6. STORE LOCATOR */}
            {['restaurants', 'pizza-near-me', 'food-near-me'].includes(modalType) && (
              <div className="modal-store-locator">
                <div className="store-search-bar">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search by city, area, or pincode..."
                    value={storeQuery}
                    onChange={(e) => setStoreQuery(e.target.value)}
                  />
                </div>
                <div className="modal-stores-list">
                  {filteredStores.map((store) => (
                    <div key={store.id} className="modal-store-card">
                      <div className="store-card-info">
                        <div className="store-name-row">
                          <h4>{store.name}</h4>
                          <span className="store-dist-pill">{store.distance}</span>
                        </div>
                        <p className="store-address"><MapPin size={13} /> {store.address}</p>
                        <div className="store-status-row">
                          <span className="store-status">{store.status}</span>
                          <span className="store-time"><Clock size={13} /> Avg {store.time}</span>
                        </div>
                      </div>
                      <a href={`tel:${store.phone.replace(/[^0-9+]/g, '')}`} className="btn btn-secondary btn-sm">
                        <Phone size={14} /> Call Outlet
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. FOOD DELIVERY PROMISE */}
            {modalType === 'food-delivery' && (
              <div className="modal-info-stack">
                <div className="delivery-guarantee-card">
                  <div className="guarantee-icon-wrap">
                    <Clock size={32} color="#007DC6" />
                  </div>
                  <h3>30-Minute Hot Delivery Guarantee</h3>
                  <p>
                    If your handcrafted pizza takes longer than 30 minutes from oven dispatch to door, you receive 100% store loyalty credits on us.
                  </p>
                </div>
                <div className="delivery-features-grid">
                  <div className="del-feat">
                    <ShieldCheck size={20} color="#10b981" />
                    <span>Double-insulated heated thermal dispatch bags</span>
                  </div>
                  <div className="del-feat">
                    <MapPin size={20} color="#007DC6" />
                    <span>Real-time GPS rider tracking on your screen</span>
                  </div>
                </div>
              </div>
            )}

            {/* 8. ITALIAN FOOD HERITAGE */}
            {modalType === 'italian-food' && (
              <div className="modal-info-stack">
                <p className="modal-text">
                  Our kitchen adheres strictly to traditional Italian artisanal standards:
                </p>
                <ul className="modal-bullet-list">
                  <li><strong>San Marzano Tomatoes:</strong> Grown in volcanic Campania soil for balanced sweetness and low acidity.</li>
                  <li><strong>00 Grade Italian Flour:</strong> Milled fine for a tender, bubbly, digestible crust.</li>
                  <li><strong>Pure Extra Virgin Olive Oil:</strong> Cold-pressed to preserve natural fruitiness and aromas.</li>
                  <li><strong>Slow Fermentation:</strong> 48 hours in humidity-controlled proofing chambers.</li>
                </ul>
              </div>
            )}

            {/* 9. GIFT CARDS */}
            {modalType === 'gift-card' && (
              <div className="modal-info-stack">
                <p className="modal-text">
                  Treat friends and family to artisan pizzas with instant digital E-Gift Cards delivered via Email & SMS.
                </p>
                <div className="gift-denominations-row">
                  {['₹250', '₹500', '₹1,000', '₹2,500'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="gift-amt-btn"
                      onClick={() => showToast(`Selected ${amt} Gift Card! Checkout simulator ready.`)}
                    >
                      <Gift size={16} />
                      <span>{amt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 10. GIFT CARD BALANCE ENQUIRY */}
            {modalType === 'balance-enquiry' && (
              <div className="modal-info-stack">
                <form onSubmit={handleCheckBalance} className="balance-enquiry-form">
                  <div className="form-group">
                    <label>16-Digit Gift Card Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 5421 8832 9912 4431"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      maxLength={19}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>4-Digit Security PIN</label>
                    <input
                      type="password"
                      placeholder="••••"
                      value={cardPin}
                      onChange={(e) => setCardPin(e.target.value)}
                      maxLength={4}
                      className="form-input"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-block">
                    <Search size={16} /> Check Available Balance
                  </button>
                </form>

                {balanceResult && (
                  <div className="balance-result-card">
                    <div className="balance-row">
                      <span>Card: {balanceResult.card}</span>
                      <span className="balance-active-pill">{balanceResult.status}</span>
                    </div>
                    <div className="balance-main-val">{balanceResult.balance}</div>
                    <span className="balance-exp">{balanceResult.expiry}</span>
                  </div>
                )}
              </div>
            )}

            {/* 11. VIRTUAL PIZZA PARTY */}
            {modalType === 'pizza-party' && (
              <div className="modal-info-stack">
                <div className="party-hero-box">
                  <Users size={32} color="#FFC220" />
                  <h4>Host a Virtual Pizza Party</h4>
                  <p>Create a shared live order link, invite friends or colleagues, let everyone customize their slice, and auto-split the bill.</p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText('https://pizzaslice.delivery/party/host-9942');
                      showToast('🎉 Pizza Party Link generated & copied to clipboard!');
                    }}
                  >
                    <Copy size={16} /> Generate & Copy Party Link
                  </button>
                </div>
              </div>
            )}

            {/* 12. E-GIFT VOUCHERS */}
            {modalType === 'vouchers' && (
              <div className="modal-vouchers-grid">
                {PROMO_VOUCHERS.map((v) => (
                  <div key={v.code} className="modal-voucher-card">
                    <div className="voucher-left">
                      <span className="voucher-disc-badge">{v.discount}</span>
                      <h4 className="voucher-title">{v.title}</h4>
                      <p className="voucher-sub">{v.validity} • {v.minOrder}</p>
                    </div>
                    <button
                      type="button"
                      className={`btn-copy-voucher ${copiedCode === v.code ? 'copied' : ''}`}
                      onClick={() => handleCopyCode(v.code)}
                    >
                      {copiedCode === v.code ? <CheckCircle size={15} /> : <Copy size={15} />}
                      <span>{v.code}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 13. FRANCHISE QUERIES */}
            {modalType === 'franchise' && (
              <div className="modal-info-stack">
                {franchiseSubmitted ? (
                  <div className="franchise-success-box">
                    <CheckCircle size={40} color="#10b981" />
                    <h4>Thank You for Your Partnership Interest!</h4>
                    <p>Our Corporate Business Development Manager will review your city demographics and connect within 1 business day.</p>
                  </div>
                ) : (
                  <form onSubmit={handleFranchiseSubmit} className="franchise-form">
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label>Your Full Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rahul Verma"
                          value={franchiseForm.fullName}
                          onChange={(e) => setFranchiseForm({ ...franchiseForm, fullName: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Email Address *</label>
                        <input
                          type="email"
                          required
                          placeholder="rahul@example.com"
                          value={franchiseForm.email}
                          onChange={(e) => setFranchiseForm({ ...franchiseForm, email: e.target.value })}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label>Mobile Number *</label>
                        <input
                          type="tel"
                          required
                          placeholder="+91 98765 43210"
                          value={franchiseForm.phone}
                          onChange={(e) => setFranchiseForm({ ...franchiseForm, phone: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Target City / Location *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Pune, Mumbai, Bangalore"
                          value={franchiseForm.city}
                          onChange={(e) => setFranchiseForm({ ...franchiseForm, city: e.target.value })}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">
                      Submit Franchise Inquiry
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* 14. TERMS & CONDITIONS */}
            {modalType === 'terms' && (
              <div className="modal-legal-text">
                <h4>1. Ordering & Acceptance</h4>
                <p>All pizza orders placed through the website or app are subject to kitchen operational availability and confirmation by our local store dispatch team.</p>
                <h4>2. Pricing & Payments</h4>
                <p>Prices displayed are inclusive of GST where applicable. Delivery fees and packaging charges are computed transparently at final checkout.</p>
                <h4>3. 30-Minute Guarantee</h4>
                <p>Guaranteed 30-minute delivery is valid on standard orders under 5 pizzas and within designated radial delivery geo-fences under normal weather conditions.</p>
              </div>
            )}

            {/* 15. PRIVACY POLICY */}
            {modalType === 'privacy' && (
              <div className="modal-legal-text">
                <h4>Data Protection & Privacy Commitment</h4>
                <p>We respect your personal privacy. Customer details including address, mobile number, and order history are encrypted using AES-256 standard protocols.</p>
                <h4>No Third-Party Data Sharing</h4>
                <p>We do not sell or monetize personal customer records to external advertisers or brokers under any circumstance.</p>
              </div>
            )}

            {/* 16. DISCLAIMER */}
            {modalType === 'disclaimer' && (
              <div className="modal-legal-text">
                <h4>Food & Allergen Advisory</h4>
                <p>Our pizzas are prepared in kitchens where dairy, gluten, soy, and tree nuts may be handled. If you have severe allergies, please review full ingredient lists before placing orders.</p>
                <h4>Product Imagery</h4>
                <p>Photographs displayed in the menu catalog represent actual handcrafted artisan pizzas freshly prepared in our kitchens.</p>
              </div>
            )}

            {/* 17. COOKIE SETTINGS */}
            {modalType === 'cookies' && (
              <div className="modal-info-stack">
                <p className="modal-text">Manage your browser cookie settings for the Pizza Slice platform:</p>
                <div className="cookie-toggles-list">
                  <div className="cookie-toggle-row">
                    <div>
                      <strong>Essential Cookies (Always Active)</strong>
                      <p>Necessary for shopping cart state, authentication tokens, and checkout security.</p>
                    </div>
                    <input type="checkbox" checked disabled />
                  </div>
                  <div className="cookie-toggle-row">
                    <div>
                      <strong>Performance & Analytics</strong>
                      <p>Helps us understand page load speeds and optimize pizza builder responsiveness.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={cookiePrefs.analytics}
                      onChange={(e) => setCookiePrefs({ ...cookiePrefs, analytics: e.target.checked })}
                    />
                  </div>
                  <div className="cookie-toggle-row">
                    <div>
                      <strong>Personalized Deals & Promos</strong>
                      <p>Enables tailored voucher recommendations based on your favorite pizza toppings.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={cookiePrefs.preferences}
                      onChange={(e) => setCookiePrefs({ ...cookiePrefs, preferences: e.target.checked })}
                    />
                  </div>
                </div>
                <button type="button" onClick={handleSaveCookies} className="btn btn-primary btn-block">
                  Save Preferences
                </button>
              </div>
            )}

            {/* 18. SECURITY */}
            {modalType === 'security' && (
              <div className="modal-info-stack">
                <div className="security-badges-grid">
                  <div className="sec-card">
                    <Lock size={28} color="#10b981" />
                    <h4>256-Bit SSL Encryption</h4>
                    <p>All network traffic and API exchanges are encrypted end-to-end.</p>
                  </div>
                  <div className="sec-card">
                    <ShieldCheck size={28} color="#007DC6" />
                    <h4>PCI-DSS Compliant</h4>
                    <p>Credit/debit card credentials are processed directly through certified RBI-approved gateways.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="footer-modal-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close Window
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FooterInfoModal;
