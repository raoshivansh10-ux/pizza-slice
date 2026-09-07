import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * FlyingToppingPortal renders staggered multi-particle spring tosses purely for visual feedback.
 * Animation callbacks only trigger visual impact and remove DOM nodes; they NEVER mutate React selection state.
 */
const FlyingToppingPortal = ({ flyingGroups = [], onParticleLand, onGroupComplete }) => {
  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <div className="flying-toppings-portal">
      <AnimatePresence>
        {flyingGroups.map((group) => {
          return group.particles.map((particle, idx) => {
            const { particleId, startX, startY, targetX, targetY, icon, rotation } = particle;

            // Parabolic midpoint arc peak
            const midX = (startX + targetX) / 2 + (Math.random() * 40 - 20);
            const midY = Math.min(startY, targetY) - 100 - idx * 10;

            return (
              <motion.div
                key={particleId}
                className="flying-particle-item"
                initial={{
                  x: startX,
                  y: startY,
                  scale: 1,
                  rotate: 0,
                  opacity: 1,
                }}
                animate={{
                  x: [startX, midX, targetX],
                  y: [startY, midY, targetY],
                  scale: [1, 0.75, 0.5, 1.2, 1],
                  rotate: [0, rotation * 0.5, rotation, rotation],
                  opacity: [1, 1, 1, 0.95, 0],
                }}
                transition={{
                  duration: 0.52,
                  delay: idx * 0.045, // 45ms staggered launch
                  times: [0, 0.45, 0.85, 0.95, 1],
                  ease: ['easeOut', 'easeInOut', 'spring'],
                }}
                onAnimationComplete={() => {
                  if (idx === 0 && onParticleLand) {
                    onParticleLand(group.id); // Visual impact ripple & price scale-pop trigger
                  }
                  if (idx === group.particles.length - 1 && onGroupComplete) {
                    onGroupComplete(group.id); // Remove finished group from flyingGroups state
                  }
                }}
              >
                <div className="particle-badge">
                  <span>{icon}</span>
                </div>
              </motion.div>
            );
          });
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
};

export default FlyingToppingPortal;
