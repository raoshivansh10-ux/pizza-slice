import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useScroll } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { Pizza, ArrowRight } from 'lucide-react';

const TOTAL_FRAMES = 300;

// Format frame number to 4 digits: frame_0001.webp
const getFramePath = (index) => {
  const padIndex = String(index + 1).padStart(4, '0');
  return `/pizza/frames/frame_${padIndex}.webp`;
};

const PizzaScrollCanvas = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const imagesRef = useRef([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const animationFrameId = useRef(null);
  const { setIsOrderingModalOpen } = useCart();

  // Framer Motion Scroll Progress Hook
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Preload all 300 WebP frames
  useEffect(() => {
    let isMounted = true;
    const images = new Array(TOTAL_FRAMES);
    let count = 0;

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      img.onload = () => {
        if (!isMounted) return;
        count++;
        setLoadedCount(count);
        if (count >= 15 && !isReady) {
          setIsReady(true);
        }
      };
      img.onerror = () => {
        if (!isMounted) return;
        count++;
        setLoadedCount(count);
      };
      images[i] = img;
    }

    imagesRef.current = images;

    return () => {
      isMounted = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Draw frame to canvas maintaining high-DPI aspect ratio
  const renderFrame = useCallback((frameIndex) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imagesRef.current[frameIndex];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Calculate aspect fill / cover
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth = canvasWidth;
    let drawHeight = canvasHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > imgRatio) {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
      offsetY = (canvasHeight - drawHeight) / 2;
    } else {
      drawHeight = canvasHeight;
      drawWidth = canvasHeight * imgRatio;
      offsetX = (canvasWidth - drawWidth) / 2;
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }, []);

  // Sync frame rendering with window resize & DPI
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }

      renderFrame(currentFrame);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentFrame, renderFrame]);

  // Listen to scroll progression and scrub frames
  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (progress) => {
      const clampedProgress = Math.max(0, Math.min(1, progress));
      const frameIdx = Math.min(
        TOTAL_FRAMES - 1,
        Math.floor(clampedProgress * (TOTAL_FRAMES - 1))
      );

      setCurrentFrame(frameIdx);

      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      animationFrameId.current = requestAnimationFrame(() => {
        renderFrame(frameIdx);
      });
    });

    return () => unsubscribe();
  }, [scrollYProgress, renderFrame]);

  const progressPercent = Math.round((loadedCount / TOTAL_FRAMES) * 100);

  return (
    <div ref={containerRef} className="pizza-scroll-container">
      {/* Sticky Fullscreen Canvas Viewport */}
      <div className="pizza-scroll-sticky-viewport">
        {/* HTML5 Canvas */}
        <canvas ref={canvasRef} className="pizza-scroll-canvas" />

        {/* Ambient Dark Gradient Overlays */}
        <div className="canvas-gradient-overlay top-vignette" />
        <div className="canvas-gradient-overlay bottom-vignette" />

        {/* Preload Progress Bar (Only visible while loading initial frames) */}
        {!isReady && (
          <div className="canvas-loader-overlay">
            <div className="loader-box">
              <div className="spinner" />
              <h4>Loading Pizza Animation...</h4>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span>{progressPercent}% loaded</span>
            </div>
          </div>
        )}

        {/* Bottom Floating Bar: Centered Order CTA & Brand Badge */}
        <div className="scroll-controls-bar">
          {/* Central Order Button */}
          <button
            type="button"
            onClick={() => setIsOrderingModalOpen(true)}
            className="scroll-order-btn"
          >
            <Pizza size={20} />
            <span>Order</span>
            <ArrowRight size={18} />
          </button>

          {/* Right Brand Badge */}
          <div className="scroll-brand-badge">
            <Pizza size={28} color="#872F20" />
            <span className="brand-badge-name">
              Pizza<span className="brand-accent">Slice</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PizzaScrollCanvas;
