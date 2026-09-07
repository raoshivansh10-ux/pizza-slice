import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Sparkles } from 'lucide-react';

const PwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem('pizza_pwa_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent automatic mini-infobar in mobile browsers
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log('🎉 Pizza Slice PWA was installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isDismissed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA Install] User response: ${outcome}`);

    if (outcome === 'accepted') {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    try {
      localStorage.setItem('pizza_pwa_dismissed', 'true');
    } catch (_) {}
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <div className="pwa-install-banner-wrap">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="pwa-install-banner"
        >
          <div className="pwa-install-left">
            <img
              src="/icons/icon-192x192.png"
              alt="Pizza Slice App"
              className="pwa-app-icon-img"
            />
            <div className="pwa-text-info">
              <span className="pwa-app-title">Install Pizza Slice App</span>
              <span className="pwa-app-desc">Instant ordering & offline live tracking</span>
            </div>
          </div>

          <div className="pwa-install-actions">
            <button
              type="button"
              onClick={handleInstallClick}
              className="btn-pwa-install"
            >
              <Download size={14} />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="btn-pwa-dismiss"
              aria-label="Dismiss install prompt"
            >
              <X size={15} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PwaInstallPrompt;
