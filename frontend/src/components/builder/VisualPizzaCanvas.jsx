import React, { forwardRef, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PersistentToppingCache,
  clampToppingPosition,
  MAX_ALLOWED_RADIUS,
  ALL_SYMMETRIC_SLOTS,
  RINGS_DEFINITION,
} from '../../utils/toppingSlots';
import Particles from '../common/Particles';

const VisualPizzaCanvas = forwardRef(
  ({ selectedBase, selectedSauce, selectedCheese, selectedVeggies = [], debugSlots = false }, forwardedRef) => {
    const internalCanvasRef = useRef(null);
    const canvasRef = forwardedRef || internalCanvasRef;

    // Check if debug mode is active via prop or URL query param
    const isDebugActive =
      debugSlots ||
      (typeof window !== 'undefined' &&
        (window.location.search.includes('debugSlots=true') ||
          window.__DEBUG_PIZZA_SLOTS === true));

    // Dynamic runtime measurement of the actual pizza container
    const [canvasDimensions, setCanvasDimensions] = useState({ width: 340, height: 340 });

    useEffect(() => {
      const el = canvasRef.current;
      if (!el) return;

      const updateDimensions = () => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setCanvasDimensions({ width: rect.width, height: rect.height });
        }
      };

      updateDimensions();

      const resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(el);

      return () => {
        resizeObserver.disconnect();
      };
    }, [canvasRef]);

    // Persistent allocation cache that survives across re-renders
    const cacheRef = useRef(null);
    if (!cacheRef.current) {
      cacheRef.current = new PersistentToppingCache();
    }

    // Synchronize selected toppings across all radial ring layers
    const toppingInstances = cacheRef.current.syncWithSelected(selectedVeggies);

    // Dynamic sauce tint overlay
    const getSauceOverlay = () => {
      if (!selectedSauce) return null;
      const name = selectedSauce.name.toLowerCase();
      if (name.includes('arrabiata') || name.includes('fire')) {
        return {
          bg: 'radial-gradient(circle, rgba(165, 30, 18, 0.45) 0%, rgba(135, 20, 10, 0.65) 75%, transparent 100%)',
          blend: 'multiply',
        };
      }
      if (name.includes('bbq')) {
        return {
          bg: 'radial-gradient(circle, rgba(95, 35, 20, 0.5) 0%, rgba(65, 20, 10, 0.7) 75%, transparent 100%)',
          blend: 'multiply',
        };
      }
      if (name.includes('alfredo') || name.includes('garlic')) {
        return {
          bg: 'radial-gradient(circle, rgba(255, 250, 235, 0.5) 0%, rgba(245, 235, 210, 0.3) 70%, transparent 100%)',
          blend: 'screen',
        };
      }
      if (name.includes('pesto') || name.includes('basil')) {
        return {
          bg: 'radial-gradient(circle, rgba(45, 75, 35, 0.5) 0%, rgba(30, 55, 22, 0.65) 75%, transparent 100%)',
          blend: 'multiply',
        };
      }
      return null;
    };

    // Dynamic cheese richness overlay
    const getCheeseOverlay = () => {
      if (!selectedCheese) return null;
      const name = selectedCheese.name.toLowerCase();
      if (name.includes('cheddar') || name.includes('four cheese')) {
        return {
          bg: 'radial-gradient(circle, rgba(255, 175, 45, 0.3) 0%, rgba(225, 140, 25, 0.22) 65%, transparent 95%)',
          blend: 'color-burn',
        };
      }
      if (name.includes('ricotta')) {
        return {
          bg: 'radial-gradient(circle, rgba(255, 255, 255, 0.35) 0%, rgba(250, 245, 235, 0.2) 60%, transparent 90%)',
          blend: 'soft-light',
        };
      }
      return null;
    };

    const sauceOverlay = getSauceOverlay();
    const cheeseOverlay = getCheeseOverlay();

    return (
      <div className="pizza-sticky-card">
        <div className="pizza-stage-wrapper">
          {/* Ambient Wood-Fired Glowing Embers & Micro-Particles */}
          <div className="pizza-stage-particles">
            <Particles
              particleColors={['#007DC6', '#FFC220', '#FFFFFF', '#00a3ff']}
              particleCount={110}
              particleSpread={8}
              speed={0.07}
              particleBaseSize={80}
              moveParticlesOnHover={true}
              particleHoverFactor={0.7}
              alphaParticles={true}
              disableRotation={false}
            />
          </div>

          {/* Main Realistic Pizza Disc Viewport */}
          <div
            ref={canvasRef}
            id="pizza-canvas"
            className="pizza-canvas-realistic"
          >
            {/* Layer 1: High-Res Real Wood-Fired Baked Pizza Base (Crust + Sauce + Bubbly Cheese) */}
            <div className="pizza-base-photorealistic">
              <img
                src="/images/pizza-base.png"
                alt="Freshly baked artisan pizza base"
                className="pizza-base-image"
                draggable={false}
              />

              {/* Layer 2: Dynamic Sauce Blend Tint */}
              <AnimatePresence>
                {sauceOverlay && (
                  <motion.div
                    key={selectedSauce._id || selectedSauce.name}
                    className="pizza-sauce-blend-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.85 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      background: sauceOverlay.bg,
                      mixBlendMode: sauceOverlay.blend,
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Layer 3: Dynamic Cheese Blend Tint */}
              <AnimatePresence>
                {cheeseOverlay && (
                  <motion.div
                    key={selectedCheese._id || selectedCheese.name}
                    className="pizza-cheese-blend-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.9 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      background: cheeseOverlay.bg,
                      mixBlendMode: cheeseOverlay.blend,
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Layer 4: Realistic Photographic Topping Pieces with Symmetric Cross-Ring Distribution */}
              <div className="toppings-realistic-container">
                <AnimatePresence>
                  {toppingInstances.map((inst, idx) => {
                    const { x: safeX, y: safeY } = clampToppingPosition(inst.x, inst.y, MAX_ALLOWED_RADIUS);

                    return (
                      <motion.div
                        key={inst.instanceId}
                        className={`topping-piece-item topping-${inst.key}`}
                        style={{
                          left: `${safeX}%`,
                          top: `${safeY}%`,
                          width: `${inst.widthPct}%`,
                          height: `${inst.heightPct}%`,
                          position: 'absolute',
                          transform: 'translate(-50%, -50%)',
                          pointerEvents: 'none',
                          zIndex: 10 + (idx % 12),
                        }}
                        initial={{
                          y: inst.initialDropY,
                          scale: 1.35,
                          rotate: inst.initialRotate,
                          opacity: 0,
                        }}
                        animate={{
                          y: 0,
                          scale: 1,
                          rotate: inst.rotation,
                          opacity: 1,
                        }}
                        exit={{
                          y: -15,
                          scale: 0.85,
                          opacity: 0,
                          transition: { duration: 0.18, ease: 'easeOut' },
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 220,
                          damping: 16,
                          mass: 0.85,
                          delay: (idx % 6) * 0.035,
                        }}
                      >
                        <img
                          src={inst.spriteUrl}
                          alt={inst.key}
                          className="topping-piece-image"
                          draggable={false}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Debug Slot Overlay: Visualizes concentric rings & radial slot grid */}
              {isDebugActive && (
                <div className="pizza-debug-slot-overlay">
                  {/* Concentric Guide Circles */}
                  {RINGS_DEFINITION.filter((r) => r.radius > 0).map((r) => (
                    <div
                      key={r.id}
                      className="debug-ring-guide"
                      style={{
                        width: `${r.radius * 2}%`,
                        height: `${r.radius * 2}%`,
                      }}
                      title={`${r.id}: r=${r.radius}% (${r.count} slots)`}
                    />
                  ))}

                  {/* All 49 Symmetrical Slot Nodes */}
                  {ALL_SYMMETRIC_SLOTS.map((slot) => (
                    <div
                      key={slot.id}
                      className={`debug-slot-dot ring-${slot.ring}`}
                      style={{
                        left: `${slot.x}%`,
                        top: `${slot.y}%`,
                      }}
                      title={`Slot #${slot.id} [${slot.ring}]: ${slot.angleDeg}° (r=${slot.radiusPct}%)`}
                    >
                      <span className="debug-slot-num">{slot.id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pizza Live Artisan Specs Badge */}
          <div className="pizza-live-caption">
            <div className="caption-badge">
              <span>
                {selectedBase?.name || 'Classic Hand Tossed'}
                {selectedSauce ? ` • ${selectedSauce.name}` : ''}
                {selectedCheese ? ` • ${selectedCheese.name}` : ''}
              </span>
            </div>
            <p className="caption-sub">
              {selectedVeggies.length > 0
                ? `${selectedVeggies.length} toppings selected (${toppingInstances.length} chef-sprinkled pieces)`
                : 'Select ingredients to layer your custom artisan pizza'}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

export const PizzaPreview = ({
  toppings = [],
  base = 'Classic Hand Tossed',
  sauce = 'Tomato Herb',
  cheese = 'Mozzarella',
  hideCaption = false,
  ...props
}) => {
  const selectedVeggies = toppings.map((t, idx) =>
    typeof t === 'string' ? { _id: `top-${t}-${idx}`, name: t } : t
  );
  const selectedBase = typeof base === 'string' ? { name: base } : base;
  const selectedSauce = typeof sauce === 'string' ? { name: sauce } : sauce;
  const selectedCheese = typeof cheese === 'string' ? { name: cheese } : cheese;

  return (
    <div className={`pizza-preview-wrap ${hideCaption ? 'hide-caption' : ''}`}>
      <VisualPizzaCanvas
        selectedBase={selectedBase}
        selectedSauce={selectedSauce}
        selectedCheese={selectedCheese}
        selectedVeggies={selectedVeggies}
        {...props}
      />
    </div>
  );
};

export default VisualPizzaCanvas;
