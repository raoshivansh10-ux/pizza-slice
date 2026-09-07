import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import {
  Gift,
  Tag,
  Sparkles,
  Plus,
  Copy,
  Check,
  Award,
  ArrowRight,
  Pizza,
} from 'lucide-react';
import Particles from '../components/common/Particles';
import MenuImage from '../components/common/MenuImage';

const VOUCHERS = [
  {
    code: 'FEAST350',
    title: 'Flat ₹350 Off on Weekend Party Platter',
    desc: 'Valid on 2 Large Pizzas + Garlic Breadsticks + Mozzarella Dippers + 2 Lava Cakes.',
    minSpend: 'Min. order ₹1,200',
    expires: 'Valid this weekend',
  },
  {
    code: 'COUPLE130',
    title: 'Save ₹130 on Couples Combo',
    desc: 'Get 1 Medium Pizza + Cheesy Stuffed Garlic Bread + 2 Drinks at a special discounted price.',
    minSpend: 'Min. order ₹500',
    expires: 'Valid all week',
  },
  {
    code: 'VIPPIZZA',
    title: 'Double Loyalty Points on Artisan Pizzas',
    desc: 'Earn 2 points per ₹10 spent on all handcrafted artisan pizzas automatically.',
    minSpend: 'No minimum order',
    expires: 'Exclusive VIP Offer',
  },
];

const OffersPage = () => {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);
  const { addToCart, showToast } = useCart();

  useEffect(() => {
    setLoading(true);
    api
      .get('/combos')
      .then((res) => {
        setCombos(res.data?.combos || []);
      })
      .catch((err) => {
        console.error('Failed to load combos:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`📋 Copied code "${code}" to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleAddCombo = (combo) => {
    addToCart({
      itemType: 'combo',
      refId: combo._id,
      name: combo.name,
      price: combo.comboPrice,
      unitPrice: combo.comboPrice,
      image: combo.image,
      quantity: 1,
    });
  };

  return (
    <div className="offers-page">
      <div className="dashboard-container">
        
        {/* Header with Ember Particles */}
        <div className="section-header menu-header-with-particles">
          <div className="menu-header-particles">
            <Particles
              particleColors={['#007DC6', '#FFC220', '#FFFFFF', '#00a3ff']}
              particleCount={80}
              particleSpread={10}
              speed={0.06}
              particleBaseSize={70}
              moveParticlesOnHover={true}
              alphaParticles={true}
              disableRotation={false}
            />
          </div>

          <div className="section-header-content">
            <div className="badge">
              <Sparkles size={14} /> Exclusive Deals & Discounts
            </div>
            <h2>Special Offers & Value Combos</h2>
            <p>Save big on chef-curated party combos, meal deals, and exclusive promotional coupons</p>
          </div>
        </div>

        {/* 1. Combo Bundles Section */}
        <section className="offers-section">
          <div className="section-title-row">
            <div className="section-title-left">
              <span className="section-super-title">🎁 Handcrafted Bundles</span>
              <h2 className="section-heading">Featured Combo Deals</h2>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading hot combo offers...</p>
            </div>
          ) : combos.length === 0 ? (
            <p>No active combo offers at the moment.</p>
          ) : (
            <div className="combos-catalog-grid">
              {combos.map((combo) => (
                <div key={combo._id} className="combo-offer-card">
                  <div className="combo-card-badge">
                    <Tag size={13} />
                    <span>Save ₹{combo.discountValue}</span>
                  </div>

                  <div className="combo-card-img-wrap">
                    <MenuImage
                      src={combo.image}
                      alt={combo.name}
                      category="combos"
                      className="combo-card-img"
                    />
                  </div>

                  <div className="combo-card-content">
                    <div className="combo-card-top">
                      <h3 className="combo-title">{combo.name}</h3>
                      <p className="combo-desc">{combo.description}</p>
                    </div>

                    {combo.items && combo.items.length > 0 && (
                      <div className="combo-bundled-items">
                        <span className="bundle-label">Includes:</span>
                        <div className="bundle-chips">
                          {combo.items.map((it) => (
                            <span key={it._id || it.name} className="bundle-chip">
                              {it.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="combo-card-bottom">
                      <div className="combo-pricing-block">
                        <span className="original-price">₹{combo.originalPrice}</span>
                        <span className="combo-final-price">₹{combo.comboPrice}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddCombo(combo)}
                        className="btn btn-primary btn-sm btn-add-combo"
                      >
                        <Plus size={16} />
                        <span>Add Combo</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 2. Promo Coupons & Vouchers Section */}
        <section className="offers-section vouchers-section">
          <div className="section-title-row">
            <div className="section-title-left">
              <span className="section-super-title">🎟️ Promo Coupons</span>
              <h2 className="section-heading">Available Discount Vouchers</h2>
            </div>
          </div>

          <div className="vouchers-grid">
            {VOUCHERS.map((v) => (
              <div key={v.code} className="voucher-card">
                <div className="voucher-card-left">
                  <div className="voucher-icon-wrap">
                    <Gift size={22} color="#AA784C" />
                  </div>
                  <div className="voucher-info">
                    <h4 className="voucher-title">{v.title}</h4>
                    <p className="voucher-desc">{v.desc}</p>
                    <div className="voucher-meta">
                      <span className="voucher-spend">{v.minSpend}</span>
                      <span className="voucher-exp">• {v.expires}</span>
                    </div>
                  </div>
                </div>

                <div className="voucher-card-right">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(v.code)}
                    className={`btn-copy-code ${copiedCode === v.code ? 'copied' : ''}`}
                    title="Click to copy promo code"
                  >
                    {copiedCode === v.code ? (
                      <>
                        <Check size={14} />
                        <span>COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>{v.code}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default OffersPage;
