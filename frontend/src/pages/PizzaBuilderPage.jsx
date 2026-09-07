import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useBuilder } from '../context/BuilderContext';
import VisualPizzaCanvas from '../components/builder/VisualPizzaCanvas';
import {
  Layers,
  Droplets,
  Flame,
  Salad,
  Check,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  Pizza,
} from 'lucide-react';

const PizzaBuilderPage = () => {
  const navigate = useNavigate();
  const {
    options,
    loadingOptions,
    selectedBase,
    setSelectedBase,
    selectedSauce,
    setSelectedSauce,
    selectedCheese,
    setSelectedCheese,
    selectedVeggies,
    toggleVeggie,
    unitPrice,
    runningTotal,
    quantity,
    setQuantity,
  } = useBuilder();

  const [currentStep, setCurrentStep] = useState(1);
  const [isMobileScrolled, setIsMobileScrolled] = useState(false);
  const pizzaCanvasRef = useRef(null);

  // Mobile scroll listener to show sticky compact top bar
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth <= 900) {
        setIsMobileScrolled(window.scrollY > 280);
      } else {
        setIsMobileScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const steps = [
    { number: 1, title: 'Crust Base', icon: <Layers size={18} />, key: 'bases' },
    { number: 2, title: 'Sauce', icon: <Droplets size={18} />, key: 'sauces' },
    { number: 3, title: 'Cheese', icon: <Flame size={18} />, key: 'cheeses' },
    { number: 4, title: 'Vegetables', icon: <Salad size={18} />, key: 'veggies' },
  ];

  const handleNext = () => {
    if (currentStep === 1 && !selectedBase) return;
    if (currentStep === 2 && !selectedSauce) return;
    if (currentStep === 3 && !selectedCheese) return;

    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    } else {
      navigate('/order-summary');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const isStepValid = () => {
    if (currentStep === 1) return Boolean(selectedBase);
    if (currentStep === 2) return Boolean(selectedSauce);
    if (currentStep === 3) return Boolean(selectedCheese);
    if (currentStep === 4) return true;
    return false;
  };

  if (loadingOptions) {
    return (
      <div className="builder-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading fresh ingredients for pizza builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="builder-page">
      {/* Mobile Sticky Top Header (Collapses when scrolling past preview) */}
      <div className={`mobile-sticky-bar ${isMobileScrolled ? 'visible' : ''}`}>
        <div className="mobile-bar-content">
          <div className="mobile-pizza-thumb">
            <Pizza size={18} color="#FFC220" />
            <span>
              {selectedBase?.name ? selectedBase.name.split(' ')[0] : 'Hand Tossed'}
              {selectedVeggies.length > 0 ? ` + ${selectedVeggies.length} Vegs` : ''}
            </span>
          </div>
          <div className="mobile-price-cta">
            <span className="mobile-price">₹{runningTotal}</span>
            {selectedBase && selectedSauce && selectedCheese && (
              <button
                onClick={() => navigate('/order-summary')}
                className="btn btn-primary btn-xs"
              >
                <span>Checkout</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: LEFT = SCROLLABLE WIZARD, RIGHT = STICKY PIZZA PREVIEW */}
      <div className="builder-two-column-layout layout-right-preview">
        {/* =================================================================
            LEFT COLUMN: SCROLLABLE STEP WIZARD & OPTION CARDS
            ================================================================= */}
        <div className="builder-left-scroll-column">
          {/* Steps Progress Indicator */}
          <div className="steps-tracker">
            {steps.map((step) => {
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              return (
                <button
                  key={step.number}
                  className={`step-tab ${isActive ? 'active' : ''} ${
                    isCompleted ? 'completed' : ''
                  }`}
                  onClick={() => {
                    if (step.number < currentStep) setCurrentStep(step.number);
                  }}
                >
                  <div className="step-badge">
                    {isCompleted ? <Check size={14} /> : step.icon}
                  </div>
                  <span className="step-text">
                    <span className="step-num">Step {step.number}</span>
                    <span className="step-title">{step.title}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Step Content */}
          <div className="step-content">
            {/* Step 1: Base Crust */}
            {currentStep === 1 && (
              <div className="step-pane">
                <div className="pane-header">
                  <h2>Step 1: Choose Your Pizza Crust Base</h2>
                  <p>Select your favorite artisan hand-crafted base crust</p>
                </div>
                <div className="options-grid">
                  {options.bases.map((base) => {
                    const isSelected = selectedBase?._id === base._id;
                    return (
                      <div
                        key={base._id}
                        className={`option-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedBase(base)}
                      >
                        <div className="option-header">
                          <h4>{base.name}</h4>
                          <span className="option-price">₹{base.price}</span>
                        </div>
                        <div className="option-footer">
                          <span className="stock-info">{base.stockQty} in stock</span>
                          <div className={`selection-indicator ${isSelected ? 'selected' : ''}`}>
                            <Check size={16} style={{ opacity: isSelected ? 1 : 0 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Sauce */}
            {currentStep === 2 && (
              <div className="step-pane">
                <div className="pane-header">
                  <h2>Step 2: Pick Your Signature Sauce</h2>
                  <p>Choose an authentic house-crafted pizza sauce</p>
                </div>
                <div className="options-grid">
                  {options.sauces.map((sauce) => {
                    const isSelected = selectedSauce?._id === sauce._id;
                    return (
                      <div
                        key={sauce._id}
                        className={`option-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedSauce(sauce)}
                      >
                        <div className="option-header">
                          <h4>{sauce.name}</h4>
                          <span className="option-price">₹{sauce.price}</span>
                        </div>
                        <div className="option-footer">
                          <span className="stock-info">{sauce.stockQty} in stock</span>
                          <div className={`selection-indicator ${isSelected ? 'selected' : ''}`}>
                            <Check size={16} style={{ opacity: isSelected ? 1 : 0 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Cheese */}
            {currentStep === 3 && (
              <div className="step-pane">
                <div className="pane-header">
                  <h2>Step 3: Select Gourmet Cheese</h2>
                  <p>Select melted artisanal cheese for your crust</p>
                </div>
                <div className="options-grid">
                  {options.cheeses.map((cheese) => {
                    const isSelected = selectedCheese?._id === cheese._id;
                    return (
                      <div
                        key={cheese._id}
                        className={`option-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedCheese(cheese)}
                      >
                        <div className="option-header">
                          <h4>{cheese.name}</h4>
                          <span className="option-price">₹{cheese.price}</span>
                        </div>
                        <div className="option-footer">
                          <span className="stock-info">{cheese.stockQty} in stock</span>
                          <div className={`selection-indicator ${isSelected ? 'selected' : ''}`}>
                            <Check size={16} style={{ opacity: isSelected ? 1 : 0 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Vegetables */}
            {currentStep === 4 && (
              <div className="step-pane">
                <div className="pane-header">
                  <h2>Step 4: Load with Farm-Fresh Vegetables</h2>
                  <p>Tap toppings to chef-sprinkle them directly onto the cheese (multi-select)</p>
                </div>
                <div className="options-grid">
                  {options.veggies.map((veg) => {
                    const isSelected = selectedVeggies.some((v) => v._id === veg._id);
                    return (
                      <div
                        key={veg._id}
                        className={`option-card multi-select ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleVeggie(veg)}
                      >
                        <div className="option-header">
                          <h4>{veg.name}</h4>
                          <span className="option-price">+₹{veg.price}</span>
                        </div>
                        <div className="option-footer">
                          <span className="stock-info">{veg.stockQty} in stock</span>
                          <div className={`selection-indicator checkbox ${isSelected ? 'selected' : ''}`}>
                            <Check size={16} style={{ opacity: isSelected ? 1 : 0 }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Wizard Navigation Controls */}
            <div className="wizard-controls">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNext}
                disabled={!isStepValid()}
              >
                <span className="wizard-btn-label-desktop">{currentStep === 4 ? 'Proceed to Order Summary' : 'Next Step'}</span>
                <span className="wizard-btn-label-mobile">{currentStep === 4 ? 'Checkout' : 'Next Step'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* =================================================================
            RIGHT COLUMN: STICKY PIZZA PREVIEW & LIVE ORDER SUMMARY
            ================================================================= */}
        <div className="builder-right-sticky-column">
          <div className="sticky-preview-wrapper">
            {/* Interactive Visual Pizza Preview Canvas */}
            <VisualPizzaCanvas
              ref={pizzaCanvasRef}
              selectedBase={selectedBase}
              selectedSauce={selectedSauce}
              selectedCheese={selectedCheese}
              selectedVeggies={selectedVeggies}
            />

            {/* Sticky "Your Custom Pizza" Summary Card */}
            <div className="summary-card compact-summary-card">
              <div className="summary-header">
                <Sparkles size={18} color="#872F20" />
                <h3>Your Custom Pizza</h3>
              </div>

              <div className="summary-items">
                <div className="summary-row">
                  <span className="item-label">Crust:</span>
                  <span className="item-val">
                    {selectedBase ? (
                      <strong>{selectedBase.name} (₹{selectedBase.price})</strong>
                    ) : (
                      <em className="text-dim">Not selected</em>
                    )}
                  </span>
                </div>

                <div className="summary-row">
                  <span className="item-label">Sauce:</span>
                  <span className="item-val">
                    {selectedSauce ? (
                      <strong>{selectedSauce.name} (₹{selectedSauce.price})</strong>
                    ) : (
                      <em className="text-dim">Not selected</em>
                    )}
                  </span>
                </div>

                <div className="summary-row">
                  <span className="item-label">Cheese:</span>
                  <span className="item-val">
                    {selectedCheese ? (
                      <strong>{selectedCheese.name} (₹{selectedCheese.price})</strong>
                    ) : (
                      <em className="text-dim">Not selected</em>
                    )}
                  </span>
                </div>

                <div className="summary-row veggies-row">
                  <span className="item-label">Veggies ({selectedVeggies.length}):</span>
                  <div className="veggie-tags">
                    {selectedVeggies.length > 0 ? (
                      selectedVeggies.map((v) => (
                        <span key={v._id} className="veg-tag">
                          {v.name} (+₹{v.price})
                        </span>
                      ))
                    ) : (
                      <em className="text-dim">None selected</em>
                    )}
                  </div>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="qty-control">
                <label>Qty:</label>
                <div className="qty-btns">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="qty-btn"
                  >
                    -
                  </button>
                  <span className="qty-val">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="qty-btn"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Running Total */}
              <div className="summary-price-box">
                <div className="price-row total-row">
                  <span>Total Amount:</span>
                  <span className="total-amount">
                    ₹{runningTotal}
                  </span>
                </div>
              </div>

              {selectedBase && selectedSauce && selectedCheese && (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => navigate('/order-summary')}
                >
                  <ShoppingBag size={17} />
                  <span>Review & Checkout</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PizzaBuilderPage;
