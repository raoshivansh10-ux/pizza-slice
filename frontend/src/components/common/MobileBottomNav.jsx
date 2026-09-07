import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Home, Utensils, Pizza, Gift, User, ShieldCheck } from 'lucide-react';

const MobileBottomNav = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const currentPath = location.pathname;

  // Destination for Profile tab: /orders if logged in, else /login
  const profileTarget = isAuthenticated ? '/orders' : '/login';

  const isHomeActive = currentPath === '/';
  const isMenuActive = currentPath === '/menu';
  const isOrderActive = currentPath === '/builder';
  const isOffersActive = currentPath === '/offers';
  const isProfileActive =
    currentPath === '/orders' ||
    currentPath === '/login' ||
    currentPath === '/register' ||
    currentPath === '/forgot-password';

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <div className="mobile-bottom-nav-inner">
        {/* 1. Home Tab */}
        <NavLink
          to="/"
          className={`mobile-nav-item ${isHomeActive ? 'active' : ''}`}
          aria-label="Home"
        >
          <div className="mobile-nav-icon-wrap">
            <Home size={20} />
            {isHomeActive && (
              <motion.div
                layoutId="activePill"
                className="mobile-nav-active-indicator"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </div>
          <span className="mobile-nav-label">Home</span>
        </NavLink>

        {/* 2. Menu Tab */}
        <NavLink
          to="/menu"
          className={`mobile-nav-item ${isMenuActive ? 'active' : ''}`}
          aria-label="Menu"
        >
          <div className="mobile-nav-icon-wrap">
            <Utensils size={20} />
            {isMenuActive && (
              <motion.div
                layoutId="activePill"
                className="mobile-nav-active-indicator"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </div>
          <span className="mobile-nav-label">Menu</span>
        </NavLink>

        {/* 3. Center Elevated Order (Custom Builder) Button */}
        <NavLink
          to="/builder"
          className={`mobile-nav-center-wrap ${isOrderActive ? 'active' : ''}`}
          aria-label="Custom Pizza Builder"
        >
          <div className="mobile-center-circle-btn">
            <Pizza size={26} className="center-pizza-icon" />
            <div className="center-btn-glow" />
          </div>
          <span className="mobile-nav-label center-label">Custom</span>
        </NavLink>

        {/* 4. Offers Tab */}
        <NavLink
          to="/offers"
          className={`mobile-nav-item ${isOffersActive ? 'active' : ''}`}
          aria-label="Offers"
        >
          <div className="mobile-nav-icon-wrap">
            <Gift size={20} />
            <span className="mobile-offers-badge-dot" />
            {isOffersActive && (
              <motion.div
                layoutId="activePill"
                className="mobile-nav-active-indicator"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </div>
          <span className="mobile-nav-label">Offers</span>
        </NavLink>

        {/* 5. Profile Tab */}
        <NavLink
          to={profileTarget}
          className={`mobile-nav-item ${isProfileActive ? 'active' : ''}`}
          aria-label={isAuthenticated ? 'My Account' : 'Login'}
        >
          <div className="mobile-nav-icon-wrap">
            <User size={20} />
            {isProfileActive && (
              <motion.div
                layoutId="activePill"
                className="mobile-nav-active-indicator"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </div>
          <span className="mobile-nav-label">
            {isAuthenticated ? (user?.name ? user.name.split(' ')[0] : 'Profile') : 'Profile'}
          </span>
        </NavLink>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
