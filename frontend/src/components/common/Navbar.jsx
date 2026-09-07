import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import api from '../../services/api';
import {
  Pizza,
  ShoppingBag,
  User,
  LogOut,
  Award,
  LogIn,
  UserPlus,
  Settings,
  Package,
} from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';
import LoyaltyHistoryModal from '../loyalty/LoyaltyHistoryModal';

const Navbar = () => {
  const { user, isAuthenticated, logout, openUserProfile } = useAuth();
  const { totalItemCount, setIsCartOpen, setIsOrderingModalOpen } = useCart();
  const navigate = useNavigate();

  const [loyalty, setLoyalty] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoyaltyOpen, setIsLoyaltyOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      api
        .get('/loyalty/me')
        .then((res) => {
          setLoyalty(res.data.loyalty);
          setTransactions(res.data.transactions || []);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="nav-container">
        {/* Brand Logo & Name */}
        <Link to="/" className="nav-brand">
          <div className="brand-icon">
            <Pizza size={26} color="#FFC220" />
          </div>
          <span className="brand-name">
            Pizza<span className="brand-accent">Slice</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="nav-links">
          <Link to="/menu" className="nav-link">
            Menu
          </Link>
          <button
            type="button"
            onClick={() => setIsOrderingModalOpen(true)}
            className="nav-link highlight"
          >
            <Pizza size={16} />
            <span>Order Pizza</span>
          </button>
        </nav>

        <div className="nav-actions">
          {/* Cart Button with Live Badge */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="btn-cart-nav"
            aria-label="Open shopping cart"
          >
            <ShoppingBag size={18} />
            <span className="cart-nav-label">Cart</span>
            {totalItemCount > 0 && <span className="cart-badge-count">{totalItemCount}</span>}
          </button>

          {/* Authenticated User Menu */}
          {isAuthenticated ? (
            <div className="user-menu">
              {/* Loyalty Points Pill */}
              {loyalty && (
                <button
                  type="button"
                  onClick={() => setIsLoyaltyOpen(true)}
                  className={`nav-loyalty-pill tier-${loyalty.tier.toLowerCase()}`}
                  title={`${loyalty.pointsBalance} Loyalty Points (${loyalty.tier} Member) - Click for history`}
                >
                  <Award size={14} />
                  <span className="loyalty-pts">{loyalty.pointsBalance} pts</span>
                  <span className="loyalty-tier-badge">{loyalty.tier}</span>
                </button>
              )}

              {/* Merged User Avatar & Name Clerk Account Button */}
              <div className="clerk-user-btn-wrap" title={`${user?.name || 'Customer'} - Manage Account`}>
                <UserButton
                  showName={true}
                  afterSignOutUrl="/login"
                  appearance={{
                    elements: {
                      rootBox: 'pizza-clerk-root-box',
                      userButtonBox: 'pizza-user-btn-box',
                      userButtonTrigger: 'pizza-user-btn-trigger',
                      userButtonAvatarBox: 'pizza-user-avatar',
                      userButtonOuterIdentifier: 'pizza-user-name',
                      userButtonPopoverCard: 'pizza-clerk-card',
                    },
                  }}
                >
                  <UserButton.MenuItems>
                    <UserButton.Link
                      label="My Orders"
                      labelIcon={<Package size={15} />}
                      href="/orders"
                    />
                    <UserButton.Action
                      label="Manage Account"
                      labelIcon={<Settings size={15} />}
                      onClick={() => openUserProfile && openUserProfile()}
                    />
                  </UserButton.MenuItems>
                </UserButton>
              </div>
            </div>
          ) : (
            /* Unauthenticated Account Dropdown */
            <div className="account-dropdown-wrapper" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                className={`btn-account-nav ${isAccountMenuOpen ? 'active' : ''}`}
                aria-label="Account options"
                aria-expanded={isAccountMenuOpen}
              >
                <User size={18} />
                <span className="account-nav-label">Account</span>
              </button>

              {isAccountMenuOpen && (
                <div className="account-dropdown-menu">
                  <div className="account-dropdown-header">
                    <span className="account-dropdown-title">Welcome to PizzaSlice</span>
                    <span className="account-dropdown-subtitle">Sign in or create account</span>
                  </div>
                  <div className="account-dropdown-actions">
                    <Link
                      to="/login"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="account-menu-item login-item"
                    >
                      <LogIn size={16} />
                      <span>Login</span>
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="account-menu-item register-item"
                    >
                      <UserPlus size={16} />
                      <span>Register</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {loyalty && (
        <LoyaltyHistoryModal
          isOpen={isLoyaltyOpen}
          onClose={() => setIsLoyaltyOpen(false)}
          transactions={transactions}
          pointsBalance={loyalty.pointsBalance}
          tier={loyalty.tier}
        />
      )}
    </header>
  );
};

export default Navbar;
