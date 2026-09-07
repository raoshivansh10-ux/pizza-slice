import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  Pizza,
  Search,
  SlidersHorizontal,
  Bell,
  ShoppingBag,
  Star,
  Plus,
  ArrowRight,
  Sparkles,
  Tag,
  Gift,
  Clock,
  Layers,
  Utensils,
  Flame,
  Coffee,
  IceCream,
  Droplets,
  Check,
  ChevronRight,
} from 'lucide-react';

import Particles from '../components/common/Particles';
import MenuImage from '../components/common/MenuImage';
import { getPriceDetails } from '../utils/pricing';

const CATEGORY_CHIPS = [
  { id: 'all', label: 'All Items', icon: <Sparkles size={15} /> },
  { id: 'pizza', label: 'Pizzas', icon: <Pizza size={15} /> },
  { id: 'garlic-bread', label: 'Garlic Bread', icon: <Utensils size={15} /> },
  { id: 'sides', label: 'Sides', icon: <Flame size={15} /> },
  { id: 'dips', label: 'Dips', icon: <Droplets size={15} /> },
  { id: 'drinks', label: 'Drinks', icon: <Coffee size={15} /> },
  { id: 'desserts', label: 'Desserts', icon: <IceCream size={15} /> },
];

const PROMO_SLIDES = [
  {
    id: 1,
    title: 'Earn 2x Loyalty Points / Artisan Pizzas',
    subtitle: 'Get double VIP points on all handcrafted artisan pizzas',
    discount: '2X POINTS',
    tag: 'VIP REWARD',
    code: 'VIPPIZZA',
    bgGradient: 'linear-gradient(135deg, #007DC6 0%, #082644 100%)',
    price: 'Artisan Pizzas',
    origPrice: '',
    image: 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?auto=format&fit=crop&w=600&h=600&q=80',
    alt: 'Artisan pizza with fresh basil, cherry tomatoes, and mozzarella',
  },
  {
    id: 2,
    title: 'Weekend Party Platter',
    subtitle: '2 Large Pizzas + Garlic Bread + Dippers + 2 Lava Cakes',
    discount: 'SAVE ₹350',
    tag: 'LIMITED TIME DEAL',
    code: 'FEAST350',
    bgGradient: 'linear-gradient(135deg, #007DC6 0%, #b8860b 100%)',
    price: '₹1,190',
    origPrice: '₹1,540',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&h=600&q=80',
    alt: 'Loaded supreme party feast pizza with generous toppings',
  },
  {
    id: 3,
    title: 'Couples Pizza & Bread Feast',
    subtitle: '1 Medium Margherita + Cheesy Bread + 2 Iced Teas',
    discount: 'SAVE ₹130',
    tag: 'BEST VALUE',
    code: 'COUPLE130',
    bgGradient: 'linear-gradient(135deg, #082644 0%, #007DC6 100%)',
    price: '₹490',
    origPrice: '₹620',
    image: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&h=600&q=80',
    alt: 'Authentic classic Margherita pizza with fresh basil and mozzarella',
  },
];

const DashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { addToCart, totalItemCount, setIsCartOpen, showToast } = useCart();
  const navigate = useNavigate();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [popularItems, setPopularItems] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [comboOffers, setComboOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [sortBy, setSortBy] = useState('default');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [addedItemAnimId, setAddedItemAnimId] = useState(null);

  const carouselTimerRef = useRef(null);

  // 1. Fetch Popular Picks, Combos, and Initial Menu Catalog
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/menu/popular'),
      api.get('/combos'),
      api.get('/menu'),
    ])
      .then(([popRes, comboRes, menuRes]) => {
        setPopularItems(popRes.data?.popularItems || []);
        setComboOffers(comboRes.data?.combos || []);
        setCatalogItems(menuRes.data?.menuItems || []);
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // 2. Search & Category filtering with debounce
  useEffect(() => {
    const delayTimer = setTimeout(() => {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      api
        .get(`/menu?${params.toString()}`)
        .then((res) => {
          let items = res.data?.menuItems || [];

          // Client-side sort if active
          if (sortBy === 'price-asc') {
            items.sort((a, b) => a.basePrice - b.basePrice);
          } else if (sortBy === 'price-desc') {
            items.sort((a, b) => b.basePrice - a.basePrice);
          } else if (sortBy === 'rating-desc') {
            items.sort((a, b) => b.rating - a.rating);
          }

          setCatalogItems(items);
        })
        .catch((err) => {
          console.error('Failed to query menu catalog:', err);
        });
    }, 250);

    return () => clearTimeout(delayTimer);
  }, [searchQuery, selectedCategory, sortBy]);

  // 3. Auto-advancing promo carousel
  useEffect(() => {
    carouselTimerRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 4500);

    return () => clearInterval(carouselTimerRef.current);
  }, []);

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % PROMO_SLIDES.length);
  };

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + PROMO_SLIDES.length) % PROMO_SLIDES.length);
  };

  // 1-Click Quick Add to Cart for Popular & Catalog items
  const handleQuickAdd = (item, e) => {
    e.stopPropagation();
    setAddedItemAnimId(item._id);
    setTimeout(() => setAddedItemAnimId(null), 700);

    const chosenPrice =
      item.sizePricing && item.sizePricing.length > 0
        ? (item.sizePricing.find((s) => s.size === 'M') || item.sizePricing[0]).price
        : item.basePrice;

    const chosenSize =
      item.sizePricing && item.sizePricing.length > 0
        ? (item.sizePricing.find((s) => s.size === 'M') || item.sizePricing[0]).size
        : null;

    addToCart({
      itemType: 'menuItem',
      refId: item._id,
      name: item.name,
      size: chosenSize,
      price: chosenPrice,
      unitPrice: chosenPrice,
      image: item.image,
      quantity: 1,
    });
  };

  // Quick Add for Combos
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

  const greetingName = isAuthenticated && user?.name ? user.name.split(' ')[0] : 'Pizza Lover';

  return (
    <div className="home-dashboard-page">
      <div className="home-dashboard-container">
        
        {/* =========================================================================
            1. TOP HEADER
            ========================================================================= */}
        <header className="home-top-header">
          <div className="home-header-left">
            <div className="home-greeting-badge">
              <span className="home-greeting-text">
                Hi, {greetingName}! 👋
              </span>
            </div>
            <p className="home-location-subtext">What freshly baked goodness are you craving?</p>
          </div>

          <div className="home-header-actions">
            {/* Notification Bell */}
            <button
              type="button"
              className="home-icon-btn"
              title="Notifications"
              onClick={() => showToast('🔔 You have 2 fresh reward vouchers waiting!')}
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="home-notif-dot" />
            </button>

            {/* Live Cart Button with Item Badge */}
            <button
              type="button"
              className="home-cart-btn"
              onClick={() => setIsCartOpen(true)}
              aria-label="View Cart"
            >
              <ShoppingBag size={20} />
              {totalItemCount > 0 && (
                <motion.span
                  key={totalItemCount}
                  initial={{ scale: 0.6 }}
                  animate={{ scale: 1 }}
                  className="home-cart-badge"
                >
                  {totalItemCount}
                </motion.span>
              )}
            </button>
          </div>
        </header>

        {/* =========================================================================
            2. SEARCH & FILTER BAR
            ========================================================================= */}
        <div className="home-search-section">
          <div className="home-search-bar-wrap">
            <Search size={18} className="home-search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artisanal pizzas, garlic breads, sides, drinks..."
              className="home-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="home-search-clear-btn"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter/Sort Dropdown Toggle */}
          <div className="home-filter-dropdown-wrap">
            <button
              type="button"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`home-filter-btn ${sortBy !== 'default' ? 'active' : ''}`}
              title="Sort & Filter"
              aria-label="Sort and Filter"
            >
              <SlidersHorizontal size={18} />
            </button>

            {showFilterDropdown && (
              <div className="home-filter-menu">
                <span className="filter-menu-header">Sort Catalog:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy('default');
                    setShowFilterDropdown(false);
                  }}
                  className={`filter-option ${sortBy === 'default' ? 'selected' : ''}`}
                >
                  Featured Default
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy('rating-desc');
                    setShowFilterDropdown(false);
                  }}
                  className={`filter-option ${sortBy === 'rating-desc' ? 'selected' : ''}`}
                >
                  Highest Rated (⭐ 5.0)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy('price-asc');
                    setShowFilterDropdown(false);
                  }}
                  className={`filter-option ${sortBy === 'price-asc' ? 'selected' : ''}`}
                >
                  Price: Low to High
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortBy('price-desc');
                    setShowFilterDropdown(false);
                  }}
                  className={`filter-option ${sortBy === 'price-desc' ? 'selected' : ''}`}
                >
                  Price: High to Low
                </button>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            3. AUTO-ADVANCING PROMO BANNER CAROUSEL
            ========================================================================= */}
        <div className="home-promo-carousel-wrap">
          <div
            className="home-promo-slide"
            style={{ background: PROMO_SLIDES[activeSlide].bgGradient }}
          >
            <div className="promo-slide-left">
              <div className="promo-slide-tag-row">
                <span className="promo-badge-tag">
                  <Tag size={12} /> {PROMO_SLIDES[activeSlide].discount}
                </span>
                <span className="promo-pill-label">{PROMO_SLIDES[activeSlide].tag}</span>
              </div>
              <h3 className="promo-slide-title">{PROMO_SLIDES[activeSlide].title}</h3>
              <p className="promo-slide-subtitle">{PROMO_SLIDES[activeSlide].subtitle}</p>

              <div className="promo-pricing-row">
                <span className="promo-current-price">{PROMO_SLIDES[activeSlide].price}</span>
                {PROMO_SLIDES[activeSlide].origPrice && (
                  <span className="promo-orig-price">{PROMO_SLIDES[activeSlide].origPrice}</span>
                )}
                <span className="promo-code-chip">CODE: {PROMO_SLIDES[activeSlide].code}</span>
              </div>
            </div>

            <div className="promo-slide-right">
              <AnimatePresence mode="wait">
                <motion.img
                  key={PROMO_SLIDES[activeSlide].image}
                  src={PROMO_SLIDES[activeSlide].image}
                  alt={PROMO_SLIDES[activeSlide].alt}
                  className="promo-pizza-img"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                />
              </AnimatePresence>
            </div>
          </div>

          {/* Carousel Dots */}
          <div className="promo-carousel-dots">
            {PROMO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                className={`carousel-dot ${activeSlide === idx ? 'active' : ''}`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* =========================================================================
            4. HORIZONTAL SCROLLABLE CATEGORY CHIPS
            ========================================================================= */}
        <div className="home-category-chips-bar">
          {CATEGORY_CHIPS.map((chip) => {
            const isActive = selectedCategory === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedCategory(chip.id)}
                className={`home-category-chip ${isActive ? 'active' : ''}`}
              >
                <span className="chip-icon">{chip.icon}</span>
                <span className="chip-label">{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* =========================================================================
            5. "POPULAR PICKS" HORIZONTAL SLIDER
            ========================================================================= */}
        {!searchQuery && selectedCategory === 'all' && (
          <section className="home-popular-picks-section">
            <div className="section-title-row">
              <div className="section-title-left">
                <span className="section-super-title">🔥 Customer Favorites</span>
                <h2 className="section-heading">Popular Picks</h2>
              </div>
              <Link to="/menu" className="section-view-all-link">
                <span>View Full Menu</span>
                <ChevronRight size={16} />
              </Link>
            </div>

            <div className="popular-picks-slider">
              {popularItems.map((item) => (
                <div key={item._id} className="popular-product-card">
                  {/* Badge */}
                  {item.badge && (
                    <span className={`product-card-badge badge-${item.badge}`}>
                      {item.badge.toUpperCase()}
                    </span>
                  )}

                  {/* Thumbnail Image */}
                  <div className="popular-card-img-wrap">
                    <MenuImage
                      src={item.image}
                      alt={item.name}
                      category={item.category}
                      className="popular-card-img"
                    />
                  </div>

                  {/* Details */}
                  <div className="popular-card-body">
                    <div className="popular-card-rating">
                      <Star size={12} fill="#facc15" color="#facc15" />
                      <span>{item.rating.toFixed(1)}</span>
                      {item.ratingCount > 0 && <span className="rating-count">({item.ratingCount})</span>}
                    </div>

                    <h4 className="popular-card-title">{item.name}</h4>
                    <p className="popular-card-desc">{item.description}</p>
                  </div>

                  {/* Price & Circular Add-to-Cart Button */}
                  <div className="popular-card-footer">
                    {(() => {
                      const { price, originalPrice, discountPercent } = getPriceDetails(item);
                      return (
                        <div className="popular-price-wrap">
                          <div className="price-main-line">
                            <span className="popular-price-val">₹{price}</span>
                            <span className="popular-strike-val">₹{originalPrice}</span>
                          </div>
                          <span className="popular-discount-pill">{discountPercent}% OFF</span>
                        </div>
                      );
                    })()}

                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.88 }}
                      onClick={(e) => handleQuickAdd(item, e)}
                      className={`btn-circular-add ${addedItemAnimId === item._id ? 'added' : ''}`}
                      title="Add to Cart"
                      aria-label={`Add ${item.name} to cart`}
                    >
                      {addedItemAnimId === item._id ? <Check size={18} /> : <Plus size={18} />}
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* =========================================================================
            6. COMBO OFFERS BANNER SECTION
            ========================================================================= */}
        {!searchQuery && selectedCategory === 'all' && comboOffers.length > 0 && (
          <section className="home-combos-showcase-section">
            <div className="section-title-row">
              <div className="section-title-left">
                <span className="section-super-title">🎁 Big Savings</span>
                <h2 className="section-heading">Featured Combo Deals</h2>
              </div>
            </div>

            <div className="combos-banner-grid">
              {comboOffers.map((combo) => (
                <div key={combo._id} className="home-combo-banner-card">
                  <div className="combo-banner-badge">
                    <Tag size={13} />
                    <span>SAVE ₹{combo.discountValue}</span>
                  </div>

                  <div className="combo-banner-left">
                    <h3 className="combo-banner-title">{combo.name}</h3>
                    <p className="combo-banner-desc">{combo.description}</p>

                    {combo.items && combo.items.length > 0 && (
                      <div className="combo-banner-chips">
                        {combo.items.map((it) => (
                          <span key={it._id || it.name} className="combo-mini-chip">
                            {it.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="combo-banner-price-row">
                      <div className="combo-prices">
                        <span className="combo-strike-price">₹{combo.originalPrice}</span>
                        <span className="combo-act-price">₹{combo.comboPrice}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddCombo(combo)}
                        className="btn btn-primary btn-sm btn-combo-order"
                      >
                        <Plus size={16} />
                        <span>Order Now</span>
                      </button>
                    </div>
                  </div>

                  <div className="combo-banner-right">
                    <MenuImage
                      src={combo.image}
                      alt={combo.name}
                      category="combos"
                      className="combo-banner-img"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* =========================================================================
            7. CUSTOM PIZZA BUILDER ENTRY POINT
            ========================================================================= */}
        <section className="home-builder-hero-section">
          <div className="home-builder-hero-card">
            <div className="builder-hero-left">
              <div className="builder-hero-badge">
                <Sparkles size={14} /> Interactive 3D Real-time Visualizer
              </div>
              <h2 className="builder-hero-title">Build Your Own Custom Pizza</h2>
              <p className="builder-hero-desc">
                Craft a bespoke artisan pizza from scratch! Choose from 4 artisanal crusts, 4 signature sauces, 4 gourmet cheeses, and 10 fresh garden toppings with photorealistic radial placement.
              </p>

              <Link to="/builder" className="btn btn-primary btn-lg btn-launch-builder">
                <Pizza size={20} />
                <span>Launch Pizza Builder</span>
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="builder-hero-right">
              <div className="builder-glow-disc">
                <img
                  src="/images/pizza-base.png"
                  alt="Custom Pizza Builder"
                  className="builder-hero-img"
                />
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            8. FILTERED / SEARCHED MENU CATALOG GRID
            ========================================================================= */}
        <section className="home-catalog-section">
          <div className="section-title-row">
            <div className="section-title-left">
              <span className="section-super-title">
                {searchQuery
                  ? `Search Results for "${searchQuery}"`
                  : selectedCategory === 'all'
                  ? 'All Menu Selections'
                  : `${CATEGORY_CHIPS.find((c) => c.id === selectedCategory)?.label || 'Menu Items'}`}
              </span>
              <h2 className="section-heading">
                {searchQuery
                  ? `Found ${catalogItems.length} items`
                  : selectedCategory === 'all'
                  ? 'Explore the Full Kitchen'
                  : `Fresh ${CATEGORY_CHIPS.find((c) => c.id === selectedCategory)?.label}`}
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Fetching freshly prepared items...</p>
            </div>
          ) : catalogItems.length === 0 ? (
            <div className="catalog-empty-box">
              <Pizza size={40} color="#AA784C" />
              <h4>No matching items found</h4>
              <p>Try searching for different ingredients or reset your category filters.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="btn btn-primary btn-sm"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="home-catalog-grid">
              {catalogItems.map((item) => (
                <div key={item._id} className="home-catalog-card">
                  {item.badge && (
                    <span className={`product-card-badge badge-${item.badge}`}>
                      {item.badge.toUpperCase()}
                    </span>
                  )}

                  <div className="catalog-card-img-wrap">
                    <MenuImage
                      src={item.image}
                      alt={item.name}
                      category={item.category}
                      className="catalog-card-img"
                    />
                  </div>

                  <div className="catalog-card-content">
                    <div className="catalog-card-top-row">
                      <h4 className="catalog-card-title">{item.name}</h4>
                      <div className="catalog-card-rating">
                        <Star size={12} fill="#facc15" color="#facc15" />
                        <span>{item.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <p className="catalog-card-desc">{item.description}</p>

                    <div className="catalog-card-footer">
                      {(() => {
                        const { price, originalPrice, discountPercent } = getPriceDetails(item);
                        return (
                          <div className="catalog-price-wrap">
                            <div className="price-main-line">
                              <span className="catalog-price-val">₹{price}</span>
                              <span className="catalog-strike-val">₹{originalPrice}</span>
                              <span className="catalog-discount-pill">{discountPercent}% OFF</span>
                            </div>
                            {item.sizePricing && item.sizePricing.length > 1 && (
                              <span className="catalog-size-note">(from S to L)</span>
                            )}
                          </div>
                        );
                      })()}

                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.88 }}
                        onClick={(e) => handleQuickAdd(item, e)}
                        className={`btn-circular-add ${addedItemAnimId === item._id ? 'added' : ''}`}
                        title="Add to Cart"
                        aria-label={`Add ${item.name} to cart`}
                      >
                        {addedItemAnimId === item._id ? <Check size={18} /> : <Plus size={18} />}
                      </motion.button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default DashboardPage;
