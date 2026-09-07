import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { READY_MADE_PIZZAS } from '../../data/readyMadePizzas';
import { useCart } from '../../context/CartContext';
import PizzaCustomizationModal from './PizzaCustomizationModal';
import { getPriceDetails } from '../../utils/pricing';
import { Pizza, Sparkles, ChefHat, Plus, SlidersHorizontal, ArrowRight, X, Check, Flame } from 'lucide-react';

const OrderingSectionModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('ready-made'); // 'ready-made' | 'make-your-own'
  const [customizingPizza, setCustomizingPizza] = useState(null);
  const [isMakeYourOwnOpen, setIsMakeYourOwnOpen] = useState(false);
  const { addToCart } = useCart();

  if (!isOpen) return null;

  const handleQuickAdd = (pizza) => {
    addToCart({
      pizzaId: pizza.id,
      name: pizza.name,
      size: { id: 'medium', label: 'Medium (10")', multiplier: 1.0 },
      base: pizza.defaultBase,
      sauce: pizza.defaultSauce,
      cheese: pizza.defaultCheese,
      extraCheese: false,
      toppings: pizza.defaultToppings,
      removedToppings: [],
      price: pizza.basePrice,
      quantity: 1,
    });
  };

  return (
    <>
      <div className="ordering-modal-overlay">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="ordering-modal-backdrop"
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="ordering-modal-container"
        >
          {/* Header */}
          <div className="ordering-modal-header">
            <div className="header-info">
              <div className="header-badge">
                <Sparkles size={14} color="#AA784C" />
                <span>Handcrafted Italian Kitchen</span>
              </div>
              <h2>Order Fresh Artisanal Pizza</h2>
              <p>Choose from our signature artisan pizzas or craft your own masterpiece</p>
            </div>

            <button type="button" onClick={onClose} className="ordering-modal-close" aria-label="Close">
              <X size={24} />
            </button>
          </div>

          {/* Option Switcher Tabs */}
          <div className="ordering-tab-switcher">
            <button
              type="button"
              onClick={() => setActiveTab('ready-made')}
              className={`ordering-tab-btn ${activeTab === 'ready-made' ? 'active' : ''}`}
            >
              <Pizza size={18} />
              <span>🍕 Ready-Made Pizzas</span>
              <span className="tab-pill-count">{READY_MADE_PIZZAS.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('make-your-own')}
              className={`ordering-tab-btn ${activeTab === 'make-your-own' ? 'active' : ''}`}
            >
              <ChefHat size={18} />
              <span>🧑🍳 Make Your Own Pizza</span>
              <span className="tab-pill-highlight">Custom</span>
            </button>
          </div>

          {/* Tab 1: Ready-Made Pizzas Grid */}
          {activeTab === 'ready-made' && (
            <div className="ready-made-view">
              <div className="ready-made-grid">
                {READY_MADE_PIZZAS.map((pizza) => (
                  <motion.div
                    key={pizza.id}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="pizza-catalog-card"
                  >
                    {/* Pizza Image Frame */}
                    <div className="card-image-wrap">
                      <img src={pizza.image} alt={pizza.name} className="card-pizza-img" />
                      {(() => {
                        const { price, originalPrice, discountPercent } = getPriceDetails(pizza, pizza.basePrice);
                        return (
                          <div className="starting-price-tag">
                            <span className="price-tag-from">From ₹{price}</span>
                            <span className="price-tag-strike">₹{originalPrice}</span>
                            <span className="price-tag-disc">{discountPercent}% OFF</span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Content */}
                    <div className="card-body">
                      <div className="pizza-title-row">
                        <h3 className="pizza-title">{pizza.name}</h3>
                        <span className="pizza-rating-badge" title={`${pizza.reviewCount || 48} verified reviews`}>
                          ★ {pizza.rating || 4.9} <span className="rating-count-num">({pizza.reviewCount || 48})</span>
                        </span>
                      </div>
                      <p className="pizza-desc">{pizza.description}</p>

                      {/* Recipe Toppings Preview */}
                      <div className="recipe-tags-list">
                        {pizza.defaultToppings.map((top) => (
                          <span key={top._id} className="mini-recipe-tag">
                            {top.name}
                          </span>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="card-actions-row">
                        <button
                          type="button"
                          onClick={() => setCustomizingPizza(pizza)}
                          className="btn btn-secondary btn-sm btn-customize"
                        >
                          <SlidersHorizontal size={15} />
                          <span>Customize</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickAdd(pizza)}
                          className="btn btn-primary btn-sm btn-quick-add"
                        >
                          <Plus size={16} />
                          <span>Add to Cart</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Make Your Own Pizza Card / Starter */}
          {activeTab === 'make-your-own' && (
            <div className="make-your-own-view">
              <div className="myo-hero-card">
                <div className="myo-content">
                  <div className="myo-badge">
                    <ChefHat size={16} color="#872F20" />
                    <span>Total Creative Freedom</span>
                  </div>
                  <h2>Build Your Dream Pizza From Scratch</h2>
                  <p>
                    Layer your choice of slow-fermented crust, signature marinara or fire sauce, melted mozzarella,
                    and unlimited farm-fresh toppings with live layer-by-layer visual preview.
                  </p>

                  <div className="myo-steps-summary">
                    <div className="myo-step-item">
                      <span className="step-num">Step 1</span>
                      <span className="step-name">Choose Size (Small, Med, Large)</span>
                    </div>
                    <div className="myo-step-item">
                      <span className="step-num">Step 2</span>
                      <span className="step-name">Choose Base (Classic, Thin, Cheese Burst)</span>
                    </div>
                    <div className="myo-step-item">
                      <span className="step-num">Step 3</span>
                      <span className="step-name">Choose Sauce (Tomato, Spicy, BBQ, Alfredo)</span>
                    </div>
                    <div className="myo-step-item">
                      <span className="step-num">Step 4</span>
                      <span className="step-name">Add Multi-Select Toppings</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMakeYourOwnOpen(true)}
                    className="btn btn-primary btn-lg myo-launch-btn"
                  >
                    <ChefHat size={20} />
                    <span>Launch Custom Pizza Builder</span>
                    <ArrowRight size={18} />
                  </button>
                </div>

                <div className="myo-preview-visual">
                  <img
                    src="/images/pizzas/veggie_supreme.jpg"
                    alt="Custom pizza preview"
                    className="myo-sample-img"
                  />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Deep Customization Modal for Ready-Made Pizza */}
      <AnimatePresence>
        {customizingPizza && (
          <PizzaCustomizationModal
            pizza={customizingPizza}
            onClose={() => setCustomizingPizza(null)}
            isMakeYourOwn={false}
          />
        )}
      </AnimatePresence>

      {/* Customization Modal for Make Your Own Pizza */}
      <AnimatePresence>
        {isMakeYourOwnOpen && (
          <PizzaCustomizationModal
            pizza={READY_MADE_PIZZAS[0]}
            onClose={() => setIsMakeYourOwnOpen(false)}
            isMakeYourOwn={true}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default OrderingSectionModal;
