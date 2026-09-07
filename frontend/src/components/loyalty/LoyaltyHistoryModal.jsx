import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, ArrowDownLeft, ArrowUpRight, Calendar, Check } from 'lucide-react';

const LoyaltyHistoryModal = ({ isOpen, onClose, transactions = [], pointsBalance = 0, tier = 'Bronze' }) => {
  // Close on Escape key press and manage body scroll lock
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="loyalty-modal-overlay" onClick={onClose}>
        {/* Full-screen Darkened Backdrop */}
        <motion.div
          className="loyalty-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Centered Modal Dialog Card */}
        <motion.div
          className="loyalty-modal-container"
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()} // Prevent clicking inside modal from closing
        >
          {/* Header with Title and Clear Visible Close Button */}
          <div className="loyalty-modal-header">
            <div className="modal-header-title">
              <div className="loyalty-header-icon-wrap">
                <Award size={22} color="#F86015" />
              </div>
              <div>
                <h3>Loyalty Points Ledger</h3>
                <span className="modal-sub">
                  Current Balance: <strong className="pts-highlight">{pointsBalance} pts</strong> • {tier} Tier
                </span>
              </div>
            </div>
            <button
              type="button"
              className="loyalty-modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body with Transactions or Empty State */}
          <div className="loyalty-modal-body">
            {transactions.length === 0 ? (
              <div className="loyalty-empty-state">
                <div className="empty-award-circle">
                  <Award size={36} color="#F86015" />
                </div>
                <h4>No loyalty transactions yet</h4>
                <p>Earn 1 point for every ₹10 spent on our handcrafted artisan pizzas!</p>
              </div>
            ) : (
              <div className="loyalty-transactions-list">
                {transactions.map((tx) => {
                  const isEarned = tx.type === 'earned';
                  return (
                    <div key={tx._id} className={`loyalty-tx-card tx-${tx.type}`}>
                      <div className="tx-icon-wrap">
                        {isEarned ? (
                          <ArrowDownLeft size={16} color="#10b981" />
                        ) : (
                          <ArrowUpRight size={16} color="#ef4444" />
                        )}
                      </div>

                      <div className="tx-details">
                        <div className="tx-main-line">
                          <span className="tx-type-label">
                            {isEarned ? 'Points Earned' : 'Points Redeemed'}
                          </span>
                          <span className={`tx-points-value ${isEarned ? 'earned' : 'redeemed'}`}>
                            {isEarned ? `+${tx.points}` : `${tx.points}`} pts
                          </span>
                        </div>

                        <p className="tx-desc">
                          {tx.description || (isEarned ? 'Order reward' : 'Discount redemption')}
                        </p>

                        <div className="tx-meta-row">
                          <span>
                            <Calendar size={12} />
                            {new Date(tx.createdAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {tx.discountAmount > 0 && (
                            <span className="tx-discount-saved">Saved ₹{tx.discountAmount}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with Done Button */}
          <div className="loyalty-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary btn-block"
              style={{ padding: '10px 18px', fontSize: '14px', borderRadius: '10px' }}
            >
              <Check size={16} />
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default LoyaltyHistoryModal;
