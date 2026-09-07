import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useBuilder } from '../context/BuilderContext';
import {
  Pizza,
  Sparkles,
  Layers,
  Flame,
  Droplets,
  Salad,
  ArrowRight,
  Plus,
  Star,
  Gift,
  Coffee,
  IceCream,
  Utensils,
  Check,
  Tag,
  Filter,
} from 'lucide-react';
import Particles from '../components/common/Particles';
import MenuImage from '../components/common/MenuImage';
import { getPriceDetails } from '../utils/pricing';

const CATEGORY_TABS = [
  { id: 'pizza', label: 'Artisan Pizzas', icon: <Pizza size={17} /> },
  { id: 'garlic-bread', label: 'Garlic Breads', icon: <Utensils size={17} /> },
  { id: 'sides', label: 'Sides & Dippers', icon: <Flame size={17} /> },
  { id: 'dips', label: 'Dips & Seasonings', icon: <Droplets size={17} /> },
  { id: 'drinks', label: 'Beverages', icon: <Coffee size={17} /> },
  { id: 'desserts', label: 'Desserts', icon: <IceCream size={17} /> },
  { id: 'combos', label: 'Value Combos', icon: <Gift size={17} /> },
  { id: 'ingredients', label: 'Kitchen Stocks', icon: <Layers size={17} /> },
];

const DIETARY_TAGS = [
  { id: 'all', label: 'All Selections' },
  { id: 'vegetarian', label: '🌱 Vegetarian' },
  { id: 'gluten-free', label: '🌾 Gluten-Free' },
  { id: 'bestseller', label: '🔥 Bestsellers' },
];

const MenuPage = () => {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'pizza';
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [activeDietary, setActiveDietary] = useState('all');
  const [menuItems, setMenuItems] = useState([]);
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && CATEGORY_TABS.some((t) => t.id === cat)) {
      setActiveCategory(cat);
    }
  }, [searchParams]);

  // Size selections per item: { [itemId]: 'S' | 'M' | 'L' }
  const [selectedSizes, setSelectedSizes] = useState({});

  const { addToCart } = useCart();
  const { options, loadingOptions } = useBuilder();

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get('/menu-items'), api.get('/combos')])
      .then(([menuRes, comboRes]) => {
        setMenuItems(menuRes.data.menuItems || []);
        setCombos(comboRes.data.combos || []);
      })
      .catch((err) => {
        console.error('Failed to load menu data:', err);
        setError('Could not load menu catalog. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSizeChange = (itemId, size) => {
    setSelectedSizes((prev) => ({ ...prev, [itemId]: size }));
  };

  const getItemPrice = (item) => {
    if (!item.sizePricing || item.sizePricing.length === 0) {
      return item.basePrice;
    }
    const chosenSize = selectedSizes[item._id] || (item.sizePricing.find((s) => s.size === 'M') ? 'M' : item.sizePricing[0].size);
    const sizeObj = item.sizePricing.find((s) => s.size === chosenSize);
    return sizeObj ? sizeObj.price : item.basePrice;
  };

  const handleAddMenuItemToCart = (item) => {
    const chosenSize =
      selectedSizes[item._id] ||
      (item.sizePricing && item.sizePricing.find((s) => s.size === 'M') ? 'M' : item.sizePricing?.[0]?.size || 'M');
    const price = getItemPrice(item);

    addToCart({
      itemType: 'menuItem',
      refId: item._id,
      name: item.name,
      size: chosenSize,
      price,
      unitPrice: price,
      image: item.image,
      quantity: 1,
    });
  };

  const handleAddComboToCart = (combo) => {
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

  const filteredMenuItems = menuItems.filter((item) => {
    if (item.category !== activeCategory) return false;
    if (activeDietary === 'all') return true;
    if (activeDietary === 'bestseller') return item.badge === 'bestseller';
    return item.tags && item.tags.includes(activeDietary);
  });

  return (
    <div className="menu-page">
      <div className="dashboard-container">
        <section className="menu-section">
          {/* Header with Ambient Wood-Fired Embers */}
          <div className="section-header menu-header-with-particles">
            <div className="menu-header-particles">
              <Particles
                particleColors={['#007DC6', '#FFC220', '#FFFFFF', '#00a3ff']}
                particleCount={90}
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
                <Sparkles size={14} /> Handcrafted Italian Menu & Bundles
              </div>
              <h2>Artisan Pizza & Gourmet Dining</h2>
              <p>Explore chef-crafted pizzas, garlic breads, sides, dips, refreshing coolers, and value party combos</p>
            </div>
          </div>

          {/* Interactive Category Filter Navigation */}
          <div className="menu-category-nav-bar">
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  className={`menu-category-tab-btn ${isActive ? 'active' : ''}`}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span className="tab-label">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Dietary Filter Chips Bar (For standard food items) */}
          {activeCategory !== 'combos' && activeCategory !== 'ingredients' && (
            <div className="dietary-filters-bar">
              {DIETARY_TAGS.map((diet) => (
                <button
                  key={diet.id}
                  type="button"
                  onClick={() => setActiveDietary(diet.id)}
                  className={`dietary-chip ${activeDietary === diet.id ? 'active' : ''}`}
                >
                  <span>{diet.label}</span>
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Preparing menu selections...</p>
            </div>
          ) : error ? (
            <div className="alert alert-error">
              <p>{error}</p>
            </div>
          ) : (
            <>
              {/* Category: Combos */}
              {activeCategory === 'combos' && (
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

                        {/* Bundled Items Pills */}
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
                            onClick={() => handleAddComboToCart(combo)}
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

              {/* Category: Standard Menu Items (Pizzas, Garlic Bread, Sides, Dips, Drinks, Desserts) */}
              {activeCategory !== 'combos' && activeCategory !== 'ingredients' && (
                <div className="menu-items-catalog-grid">
                  {filteredMenuItems.map((item) => {
                    const price = getItemPrice(item);
                    const currentSize =
                      selectedSizes[item._id] ||
                      (item.sizePricing && item.sizePricing.find((s) => s.size === 'M') ? 'M' : item.sizePricing?.[0]?.size || 'M');

                    return (
                      <div key={item._id} className="menu-product-card">
                        {item.badge && (
                          <div className={`product-badge-tag badge-${item.badge}`}>
                            <Sparkles size={11} />
                            <span>{item.badge.toUpperCase()}</span>
                          </div>
                        )}

                        <div className="menu-card-img-wrap">
                          <MenuImage
                            src={item.image}
                            alt={item.name}
                            category={item.category}
                            className="menu-card-img"
                          />
                        </div>

                        <div className="product-card-top">
                          <div className="product-title-row">
                            <h3 className="product-title">{item.name}</h3>
                            <div className="product-rating-badge">
                              <Star size={12} fill="#facc15" color="#facc15" />
                              <span>{item.rating.toFixed(1)}</span>
                              {item.ratingCount > 0 && <span className="rating-count">({item.ratingCount})</span>}
                            </div>
                          </div>

                          <p className="product-description">{item.description}</p>
                        </div>

                        {/* Size Pricing Selector (if item has multiple sizes) */}
                        {item.sizePricing && item.sizePricing.length > 1 && (
                          <div className="size-pricing-selector">
                            <span className="size-label">Select Size:</span>
                            <div className="size-buttons-group">
                              {item.sizePricing.map((s) => (
                                <button
                                  key={s.size}
                                  type="button"
                                  onClick={() => handleSizeChange(item._id, s.size)}
                                  className={`btn-size-chip ${currentSize === s.size ? 'active' : ''}`}
                                >
                                  <span className="size-name">{s.size}</span>
                                  <span className="size-cost">₹{s.price}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="product-card-footer">
                          {(() => {
                            const { originalPrice, discountPercent } = getPriceDetails(item, price);
                            return (
                              <div className="price-display">
                                <div className="price-row-wrap">
                                  <span className="price-val">₹{price}</span>
                                  <span className="price-strike-val">₹{originalPrice}</span>
                                  <span className="price-discount-pill">{discountPercent}% OFF</span>
                                </div>
                              </div>
                            );
                          })()}

                          <button
                            type="button"
                            onClick={() => handleAddMenuItemToCart(item)}
                            className="btn btn-primary btn-sm btn-add-item"
                          >
                            <Plus size={16} />
                            <span>Add to Cart</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Category: Raw Kitchen Stocks */}
              {activeCategory === 'ingredients' && (
                <div className="categories-stack">
                  {[
                    { key: 'bases', title: 'Artisanal Crust Bases', icon: <Layers size={20} color="#007DC6" /> },
                    { key: 'sauces', title: 'Signature Sauces', icon: <Droplets size={20} color="#007DC6" /> },
                    { key: 'cheeses', title: 'Gourmet Cheeses', icon: <Flame size={20} color="#FFC220" /> },
                    { key: 'veggies', title: 'Fresh Garden Veggies', icon: <Salad size={20} color="#10b981" /> },
                  ].map(({ key, title, icon }) => {
                    const items = options[key] || [];
                    return (
                      <div key={key} className="category-block">
                        <div className="category-header">
                          <div className="category-icon">{icon}</div>
                          <h3>{title}</h3>
                          <span className="count-badge">{items.length} varieties</span>
                        </div>

                        <div className="ingredients-grid">
                          {items.map((it) => (
                            <div key={it._id} className="ingredient-card">
                              <div className="card-top">
                                <h4 className="item-name">{it.name}</h4>
                                <span className="price-tag">₹{it.price}</span>
                              </div>
                              <div className="card-bottom">
                                <span
                                  className={`stock-badge ${
                                    it.stockQty <= it.lowStockThreshold ? 'low-stock' : 'in-stock'
                                  }`}
                                >
                                  {it.stockQty <= it.lowStockThreshold
                                    ? `Low Stock (${it.stockQty} left)`
                                    : 'Available in Kitchen'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default MenuPage;
