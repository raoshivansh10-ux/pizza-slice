import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { BuilderProvider } from './context/BuilderContext';
import { CartProvider, useCart } from './context/CartContext';
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminRoute from './components/admin/AdminRoute';
import CartDrawer from './components/cart/CartDrawer';
import OrderingSectionModal from './components/ordering/OrderingSectionModal';
import PwaInstallPrompt from './components/common/PwaInstallPrompt';
import MobileBottomNav from './components/common/MobileBottomNav';
import Footer from './components/common/Footer';

// Customer Pages
import DashboardPage from './pages/DashboardPage';
import MenuPage from './pages/MenuPage';
import OffersPage from './pages/OffersPage';
import PizzaBuilderPage from './pages/PizzaBuilderPage';
import OrderSummaryPage from './pages/OrderSummaryPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import MyOrdersPage from './pages/MyOrdersPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminInventoryPage from './pages/admin/AdminInventoryPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';

// App Layout that includes global modals and cart drawer
function AppLayout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const { isOrderingModalOpen, setIsOrderingModalOpen } = useCart();

  return (
    <div className="app-shell">
      {!isAdminRoute && <Navbar />}

      {/* Global Slide-Over Cart Drawer & Ordering Modal */}
      {!isAdminRoute && <CartDrawer />}
      {!isAdminRoute && (
        <OrderingSectionModal
          isOpen={isOrderingModalOpen}
          onClose={() => setIsOrderingModalOpen(false)}
        />
      )}

      {/* PWA Floating Install Prompt */}
      {!isAdminRoute && <PwaInstallPrompt />}

      {/* Persistent Mobile Bottom Navigation Bar */}
      {!isAdminRoute && <MobileBottomNav />}

      <main className="main-content">
        <Routes>
          {/* Public Customer Browsing & Menu */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/builder" element={<PizzaBuilderPage />} />

          {/* Customer Authentication Routes (Wildcard /* required for Clerk SSO callback and multi-step routing) */}
          <Route path="/register/*" element={<RegisterPage />} />
          <Route path="/verify-email/*" element={<VerifyEmailPage />} />
          <Route path="/login/*" element={<LoginPage />} />
          <Route path="/forgot-password/*" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/*" element={<ResetPasswordPage />} />

          {/* Protected Customer Routes */}
          <Route
            path="/order-summary"
            element={
              <ProtectedRoute>
                <OrderSummaryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-success"
            element={
              <ProtectedRoute>
                <OrderSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <MyOrdersPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes (Completely Isolated Route Tree) */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin/inventory"
            element={
              <AdminRoute>
                <AdminInventoryPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AdminRoute>
                <AdminOrdersPage />
              </AdminRoute>
            }
          />
          <Route path="/admin" element={<Navigate to="/admin/inventory" replace />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Domino's Style Site Footer (Description, Reviews, Contact Details, Navigation Links) */}
      {!isAdminRoute && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AdminAuthProvider>
          <BuilderProvider>
            <CartProvider>
              <AppLayout />
            </CartProvider>
          </BuilderProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
