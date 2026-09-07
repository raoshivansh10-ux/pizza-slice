import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Award, Sparkles, History, Zap, Shield, ChevronRight, TrendingUp } from 'lucide-react';
import LoyaltyHistoryModal from './LoyaltyHistoryModal';

const LoyaltyWidget = ({ onPointsUpdate }) => {
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const fetchLoyalty = async () => {
    try {
      const res = await api.get('/loyalty/me');
      setLoyaltyData(res.data.loyalty);
      setTransactions(res.data.transactions || []);
      if (onPointsUpdate) {
        onPointsUpdate(res.data.loyalty);
      }
    } catch (err) {
      console.warn('Could not fetch loyalty status:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyalty();
  }, []);

  if (loading || !loyaltyData) {
    return (
      <div className="loyalty-widget-loading">
        <div className="spinner-sm" />
        <span>Loading rewards...</span>
      </div>
    );
  }

  const {
    pointsBalance,
    rupeeEquivalent,
    tier,
    tierBadge,
    nextTier,
    progressPct,
    spendNeededForNextTier,
  } = loyaltyData;

  return (
    <>
      <div className={`loyalty-widget-card tier-${tier.toLowerCase()}`}>
        <div className="widget-header-row">
          <div className="tier-badge-pill">
            <Award size={15} />
            <span>{tierBadge}</span>
          </div>

          <button
            type="button"
            className="btn-view-history"
            onClick={() => setIsHistoryOpen(true)}
            title="View points transaction ledger"
          >
            <History size={14} />
            <span>History</span>
          </button>
        </div>

        {/* Balance Display */}
        <div className="widget-balance-block">
          <div className="balance-left">
            <span className="balance-lbl">Available Points</span>
            <div className="points-number-row">
              <span className="points-val">{pointsBalance}</span>
              <span className="points-unit">pts</span>
            </div>
          </div>

          <div className="balance-right">
            <span className="rupee-worth-badge">
              ≈ ₹{rupeeEquivalent} discount
            </span>
            <span className="earn-rate-sub">1 pt per ₹10 spent</span>
          </div>
        </div>

        {/* Tier Progress Bar */}
        {nextTier ? (
          <div className="tier-progress-section">
            <div className="progress-labels-row">
              <span className="progress-status-text">
                <TrendingUp size={12} />
                <span>₹{spendNeededForNextTier} more spend to unlock <strong>{nextTier}</strong></span>
              </span>
              <span className="progress-pct-num">{progressPct}%</span>
            </div>

            <div className="progress-track-bar">
              <div
                className="progress-fill-bar"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="vip-unlocked-banner">
            <Sparkles size={14} color="#facc15" />
            <span>Maximum VIP Tier Reached! Enjoy 1.5x points multiplier on all orders.</span>
          </div>
        )}
      </div>

      <LoyaltyHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        transactions={transactions}
        pointsBalance={pointsBalance}
        tier={tier}
      />
    </>
  );
};

export default LoyaltyWidget;
