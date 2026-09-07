import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { AVAILABLE_SIZES, ALL_EXTRA_TOPPINGS } from '../../data/readyMadePizzas';
import VisualPizzaCanvas from '../builder/VisualPizzaCanvas';
import { X, Check, Plus, Minus, Pizza, ShoppingBag, Sparkles, Flame, Layers, Droplets } from 'lucide-react';

const BASES_LIST = [
  { _id: 'b-classic', name: 'Classic Hand Tossed', price: 50 },
  { _id: 'b-thin', name: 'Crispy Thin Crust', price: 60 },
  { _id: 'b-burst', name: 'Cheese Burst Crust', price: 120 },
  { _id: 'b-wheat', name: 'Whole Wheat Organic Crust', price: 75 },
  { _id: 'b-glutenfree', name: 'Gluten-Free Artisan Crust', price: 130 },
];

const SAUCES_LIST = [
  { _id: 's-marzano', name: 'Classic San Marzano Marinara', price: 30 },
  { _id: 's-arrabiata', name: 'Spicy Arrabiata Fire Sauce', price: 35 },
  { _id: 's-bbq', name: 'Smoky Texas BBQ', price: 40 },
  { _id: 's-alfredo', name: 'Creamy Garlic Alfredo', price: 45 },
  { _id: 's-pesto', name: 'Fresh Basil Pesto', price: 50 },
];

const CHEESES_LIST = [
  { _id: 'c-mozzarella', name: 'Fior Di Latte Mozzarella', price: 60 },
  { _id: 'c-cheddar', name: 'Aged Cheddar & Mozzarella', price: 70 },
  { _id: 'c-gouda', name: 'Smoked Gouda', price: 80 },
  { _id: 'c-ricotta', name: 'Herbed Ricotta', price: 75 },
];

const PizzaCustomizationModal = ({ pizza, onClose, isMakeYourOwn = false }) => {
  const { addToCart } = useCart();

  // Selected state
  const [selectedSize, setSelectedSize] = useState(AVAILABLE_SIZES[1]); // Default Medium
  const [selectedBase, setSelectedBase] = useState(pizza?.defaultBase || BASES_LIST[0]);
  const [selectedSauce, setSelectedSauce] = useState(pizza?.defaultSauce || SAUCES_LIST[0]);
  const [selectedCheese, setSelectedCheese] = useState(pizza?.defaultCheese || CHEESES_LIST[0]);
  const [hasExtraCheese, setHasExtraCheese] = useState(false);

  // Ready-made recipe toppings management (active vs removed)
  const initialRecipeToppings = pizza?.defaultToppings || [];
  const [activeRecipeToppings, setActiveRecipeToppings] = useState(initialRecipeToppings);
  const [extraToppings, setExtraToppings] = useState([]);

  // For Make Your Own
  const [customToppings, setCustomToppings] = useState([]);

  // Calculate removed recipe toppings for ready-made
  const removedRecipeToppings = useMemo(() => {
    if (isMakeYourOwn) return [];
    return initialRecipeToppings
      .filter((t) => !activeRecipeToppings.some((at) => at._id === t._id))
      .map((t) => t.name);
  }, [initialRecipeToppings, activeRecipeToppings, isMakeYourOwn]);

  // Combined active toppings for live canvas preview & cart
  const allActiveToppings = useMemo(() => {
    if (isMakeYourOwn) {
      return customToppings;
    }
    return [...activeRecipeToppings, ...extraToppings];
  }, [isMakeYourOwn, customToppings, activeRecipeToppings, extraToppings]);

  // Live Price Calculation
  const unitPrice = useMemo(() => {
    let basePrice = isMakeYourOwn
      ? selectedBase.price + selectedSauce.price + selectedCheese.price
      : pizza.basePrice;

    // Apply size multiplier / offset
    const sizeAdjusted = Math.round(basePrice * selectedSize.multiplier);

    // Crust upgrade offset if base is cheese burst or gluten-free
    let crustOffset = 0;
    if (!isMakeYourOwn && selectedBase._id !== pizza?.defaultBase?._id) {
      crustOffset = Math.max(0, selectedBase.price - (pizza?.defaultBase?.price || 50));
    }

    // Extra toppings cost
    const extraToppingsTotal = isMakeYourOwn
      ? customToppings.reduce((sum, t) => sum + t.price, 0)
      : extraToppings.reduce((sum, t) => sum + t.price, 0);

    // Extra cheese cost
    const extraCheeseCost = hasExtraCheese ? 40 : 0;

    return sizeAdjusted + crustOffset + extraToppingsTotal + extraCheeseCost;
  }, [
    isMakeYourOwn,
    pizza,
    selectedSize,
    selectedBase,
    selectedSauce,
    selectedCheese,
    customToppings,
    extraToppings,
    hasExtraCheese,
  ]);

  // Handle Recipe Topping Toggle (Remove / Restore)
  const toggleRecipeTopping = (topping) => {
    setActiveRecipeToppings((prev) => {
      const exists = prev.some((t) => t._id === topping._id);
      if (exists) {
        return prev.filter((t) => t._id !== topping._id);
      } else {
        return [...prev, topping];
      }
    });
  };

  // Handle Extra Topping Toggle
  const toggleExtraTopping = (topping) => {
    if (isMakeYourOwn) {
      setCustomToppings((prev) => {
        const exists = prev.some((t) => t._id === topping._id);
        return exists ? prev.filter((t) => t._id !== topping._id) : [...prev, topping];
      });
    } else {
      setExtraToppings((prev) => {
        const exists = prev.some((t) => t._id === topping._id);
        return exists ? prev.filter((t) => t._id !== topping._id) : [...prev, topping];
      });
    }
  };

  // Add to Cart
  const handleAddToCart = () => {
    const customizedItem = {
      pizzaId: pizza?.id || 'custom-pizza',
      name: isMakeYourOwn ? 'Make Your Own Custom Pizza' : pizza.name,
      size: selectedSize,
      base: selectedBase,
      sauce: selectedSauce,
      cheese: selectedCheese,
      extraCheese: hasExtraCheese,
      toppings: allActiveToppings,
      removedToppings: removedRecipeToppings,
      price: unitPrice,
      quantity: 1,
    };

    addToCart(customizedItem);
    onClose();
  };

  return (
    <div className="customize-modal-overlay">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="customize-modal-backdrop"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="customize-modal-container"
      >
        {/* Modal Header */}
        <div className="customize-modal-header">
          <div className="customize-title-group">
            <span className="customize-pill">
              <Sparkles size={14} color="#872F20" />
              {isMakeYourOwn ? 'Handcrafted From Scratch' : 'Customizing Recipe'}
            </span>
            <h2>{isMakeYourOwn ? 'Make Your Own Pizza' : pizza?.name}</h2>
            <p>{isMakeYourOwn ? 'Pick your crust, sauce, cheese and favorite toppings' : pizza?.description}</p>
          </div>
          <button type="button" onClick={onClose} className="customize-close-btn">
            <X size={22} />
          </button>
        </div>

        {/* Modal Body: 2 Columns (Left: Controls, Right: Sticky Live Canvas & Summary) */}
        <div className="customize-modal-body">
          {/* Controls Column */}
          <div className="customize-controls-col">
            {/* 1. Size Selection */}
            <div className="customize-section">
              <div className="section-title-row">
                <span className="step-num-badge">1</span>
                <h3>Choose Size</h3>
              </div>
              <div className="size-options-grid">
                {AVAILABLE_SIZES.map((size) => {
                  const isSelected = selectedSize.id === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`size-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="size-card-header">
                        <span className="size-label">{size.label}</span>
                        {size.priceOffset !== 0 && (
                          <span className="size-offset">
                            {size.priceOffset > 0 ? `+₹${size.priceOffset}` : `-₹${Math.abs(size.priceOffset)}`}
                          </span>
                        )}
                      </div>
                      <span className="size-serves">{size.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Base / Crust Selection */}
            <div className="customize-section">
              <div className="section-title-row">
                <span className="step-num-badge">2</span>
                <h3>Choose Base Crust</h3>
              </div>
              <div className="chips-grid">
                {BASES_LIST.map((base) => {
                  const isSelected = selectedBase._id === base._id;
                  return (
                    <button
                      key={base._id}
                      type="button"
                      onClick={() => setSelectedBase(base)}
                      className={`select-chip ${isSelected ? 'selected' : ''}`}
                    >
                      <Layers size={15} />
                      <span>{base.name}</span>
                      <span className="chip-price">₹{base.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Sauce Selection */}
            <div className="customize-section">
              <div className="section-title-row">
                <span className="step-num-badge">3</span>
                <h3>Choose Sauce</h3>
              </div>
              <div className="chips-grid">
                {SAUCES_LIST.map((sauce) => {
                  const isSelected = selectedSauce._id === sauce._id;
                  return (
                    <button
                      key={sauce._id}
                      type="button"
                      onClick={() => setSelectedSauce(sauce)}
                      className={`select-chip ${isSelected ? 'selected' : ''}`}
                    >
                      <Droplets size={15} />
                      <span>{sauce.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Cheese & Extra Cheese */}
            <div className="customize-section">
              <div className="section-title-row">
                <span className="step-num-badge">4</span>
                <h3>Choose Cheese & Extra Cheese</h3>
              </div>
              <div className="chips-grid">
                {CHEESES_LIST.map((cheese) => {
                  const isSelected = selectedCheese._id === cheese._id;
                  return (
                    <button
                      key={cheese._id}
                      type="button"
                      onClick={() => setSelectedCheese(cheese)}
                      className={`select-chip ${isSelected ? 'selected' : ''}`}
                    >
                      <Flame size={15} />
                      <span>{cheese.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Extra Cheese Toggle Card */}
              <div
                className={`extra-cheese-card ${hasExtraCheese ? 'active' : ''}`}
                onClick={() => setHasExtraCheese(!hasExtraCheese)}
              >
                <div className="cheese-toggle-left">
                  <div className="checkbox-box">{hasExtraCheese && <Check size={14} />}</div>
                  <div>
                    <h4>Add Extra Molten Mozzarella</h4>
                    <p>Double cheese layer baked golden for maximum pull</p>
                  </div>
                </div>
                <span className="extra-price">+₹40</span>
              </div>
            </div>

            {/* 5. Toppings Customization */}
            <div className="customize-section">
              <div className="section-title-row">
                <span className="step-num-badge">5</span>
                <h3>{isMakeYourOwn ? 'Add Farm-Fresh Toppings' : 'Customize Recipe Toppings'}</h3>
              </div>

              {/* For Ready-Made: Show default recipe toppings with Remove (-) / Restore (+) */}
              {!isMakeYourOwn && initialRecipeToppings.length > 0 && (
                <div className="recipe-toppings-block">
                  <span className="sub-section-label">Original Recipe Ingredients:</span>
                  <div className="recipe-toppings-grid">
                    {initialRecipeToppings.map((top) => {
                      const isActive = activeRecipeToppings.some((t) => t._id === top._id);
                      return (
                        <div
                          key={top._id}
                          className={`recipe-topping-item ${isActive ? 'active' : 'removed'}`}
                        >
                          <span className="topping-name">{top.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleRecipeTopping(top)}
                            className={`toggle-topping-btn ${isActive ? 'btn-remove' : 'btn-restore'}`}
                          >
                            {isActive ? (
                              <>
                                <Minus size={13} />
                                <span>Remove</span>
                              </>
                            ) : (
                              <>
                                <Plus size={13} />
                                <span>Restore</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Available Extra Toppings Grid */}
              <div className="extra-toppings-block">
                <span className="sub-section-label">
                  {isMakeYourOwn ? 'Select Toppings (Multi-Select):' : 'Add Extra Toppings:'}
                </span>
                <div className="extra-toppings-grid">
                  {ALL_EXTRA_TOPPINGS.map((top) => {
                    const isSelected = isMakeYourOwn
                      ? customToppings.some((t) => t._id === top._id)
                      : extraToppings.some((t) => t._id === top._id);

                    // Check if it's already in active recipe toppings
                    const isAlreadyInRecipe =
                      !isMakeYourOwn && activeRecipeToppings.some((t) => t._id === top._id);

                    if (isAlreadyInRecipe) return null;

                    return (
                      <button
                        key={top._id}
                        type="button"
                        onClick={() => toggleExtraTopping(top)}
                        className={`topping-choice-card ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="choice-checkbox">
                          {isSelected && <Check size={14} />}
                        </div>
                        <span className="choice-name">{top.name}</span>
                        <span className="choice-price">+₹{top.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Visual Pizza Preview & Sticky Summary */}
          <div className="customize-preview-col">
            <div className="preview-sticky-box">
              {/* Visual Pizza Canvas */}
              <div className="modal-canvas-wrapper">
                <VisualPizzaCanvas
                  selectedBase={selectedBase}
                  selectedSauce={selectedSauce}
                  selectedCheese={selectedCheese}
                  selectedVeggies={allActiveToppings}
                  isImpactActive={false}
                />
              </div>

              {/* Order Summary Card */}
              <div className="customize-summary-card">
                <div className="summary-card-header">
                  <Pizza size={18} color="#872F20" />
                  <h4>Your Pizza Configuration</h4>
                </div>

                <div className="summary-breakdown">
                  <div className="breakdown-row">
                    <span className="lbl">Size:</span>
                    <span className="val">{selectedSize.label}</span>
                  </div>
                  <div className="breakdown-row">
                    <span className="lbl">Crust:</span>
                    <span className="val">{selectedBase.name}</span>
                  </div>
                  <div className="breakdown-row">
                    <span className="lbl">Sauce:</span>
                    <span className="val">{selectedSauce.name}</span>
                  </div>
                  <div className="breakdown-row">
                    <span className="lbl">Cheese:</span>
                    <span className="val">
                      {selectedCheese.name}
                      {hasExtraCheese ? ' (Extra Mozzarella +₹40)' : ''}
                    </span>
                  </div>
                  <div className="breakdown-row">
                    <span className="lbl">Toppings ({allActiveToppings.length}):</span>
                    <span className="val">
                      {allActiveToppings.length > 0
                        ? allActiveToppings.map((t) => t.name).join(', ')
                        : 'None'}
                    </span>
                  </div>

                  {removedRecipeToppings.length > 0 && (
                    <div className="breakdown-row text-removed">
                      <span className="lbl">Removed:</span>
                      <span className="val">{removedRecipeToppings.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Total Price & Add to Cart */}
                <div className="summary-total-footer">
                  <div className="total-price-box">
                    <span className="total-lbl">Total Amount:</span>
                    <span className="total-num">₹{unitPrice}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="btn btn-primary btn-block btn-add-cart"
                  >
                    <ShoppingBag size={18} />
                    <span>Add to Cart • ₹{unitPrice}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PizzaCustomizationModal;
