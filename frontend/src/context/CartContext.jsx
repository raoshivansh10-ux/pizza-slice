import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const currentUserId = user?.id || null;

  // Track active user ID to catch login/logout/account switch events
  const activeUserIdRef = useRef(currentUserId);

  // Cart items state - initialized empty
  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(false);
  const [serverCartLoaded, setServerCartLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartTab, setCartTab] = useState('cart'); // 'cart' | 'orders'
  const [toastMessage, setToastMessage] = useState(null);
  const [isOrderingModalOpen, setIsOrderingModalOpen] = useState(false);

  const openCart = useCallback((tab = 'cart') => {
    setCartTab(tab);
    setIsCartOpen(true);
  }, []);

  // Clean up any legacy shared cart keys
  useEffect(() => {
    try {
      localStorage.removeItem('pizza_slice_cart');
      localStorage.removeItem('shopping_cart');
      localStorage.removeItem('cart');
    } catch (_) {}
  }, []);

  // 1. Handle Auth State & User Switching
  useEffect(() => {
    const previousUserId = activeUserIdRef.current;
    activeUserIdRef.current = currentUserId;

    // Case A: User logged out (currentUserId is null)
    if (!currentUserId) {
      setCartItems([]);
      setServerCartLoaded(false);
      setLoadingCart(false);
      return;
    }

    // Case B: User logged in or switched to a different user account
    if (currentUserId !== previousUserId) {
      // Immediately wipe previous user's cart from React state
      setCartItems([]);
      setLoadingCart(true);
      setServerCartLoaded(false);

      // Fetch ONLY this user's persistent cart from the database
      api
        .get('/cart')
        .then((res) => {
          // Verify user hasn't changed while request was in-flight
          if (activeUserIdRef.current === currentUserId) {
            const serverItems = res.data?.cart?.items || [];
            setCartItems(serverItems);

            // Cache under user-specific key
            try {
              localStorage.setItem(`cart_${currentUserId}`, JSON.stringify(serverItems));
            } catch (_) {}

            setServerCartLoaded(true);
            setLoadingCart(false);
          }
        })
        .catch((err) => {
          console.warn('[Cart] Failed to fetch server cart, checking user cache:', err.message);
          if (activeUserIdRef.current === currentUserId) {
            try {
              const cached = localStorage.getItem(`cart_${currentUserId}`);
              if (cached) {
                setCartItems(JSON.parse(cached));
              } else {
                setCartItems([]);
              }
            } catch (_) {
              setCartItems([]);
            }
            setServerCartLoaded(true);
            setLoadingCart(false);
          }
        });
    }
  }, [currentUserId]);

  // 2. Persist cart changes to user-specific localStorage and sync with server
  useEffect(() => {
    if (!currentUserId || !serverCartLoaded) return;

    // Persist to user-specific cache
    try {
      localStorage.setItem(`cart_${currentUserId}`, JSON.stringify(cartItems));
    } catch (err) {
      console.warn('[Cart] LocalStorage save error:', err);
    }

    // Debounce server update to avoid excessive PUT requests
    const syncTimer = setTimeout(() => {
      if (activeUserIdRef.current === currentUserId) {
        api.put('/cart', { items: cartItems }).catch((err) => {
          console.warn('[Cart] Server sync error:', err.message);
        });
      }
    }, 400);

    return () => clearTimeout(syncTimer);
  }, [cartItems, currentUserId, serverCartLoaded]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 3000);
  };

  const addToCart = useCallback((item) => {
    const cartId = `cart-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newItem = {
      ...item,
      cartId,
      itemType: item.itemType || 'menuItem',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.price || 0,
      price: item.unitPrice || item.price || 0,
    };

    setCartItems((prev) => [...prev, newItem]);
    showToast(`🍕 Added "${newItem.name}" to cart!`);
    setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((cartId) => {
    setCartItems((prev) => prev.filter((item) => item.cartId !== cartId));
  }, []);

  const updateQuantity = useCallback((cartId, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.cartId === cartId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    if (currentUserId) {
      try {
        localStorage.removeItem(`cart_${currentUserId}`);
      } catch (_) {}
      api.delete('/cart').catch(() => {});
    }
  }, [currentUserId]);

  const totalItemCount = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  const cartSubtotal = cartItems.reduce(
    (acc, item) => acc + (item.unitPrice || item.price || 0) * (item.quantity || 1),
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loadingCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItemCount,
        cartSubtotal,
        isCartOpen,
        setIsCartOpen,
        cartTab,
        setCartTab,
        openCart,
        toastMessage,
        showToast,
        isOrderingModalOpen,
        setIsOrderingModalOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
