import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verify admin session on mount via GET /api/admin/me
  const checkAdminAuth = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/me');
      if (res.data?.admin) {
        setAdmin(res.data.admin);
      } else {
        setAdmin(null);
      }
    } catch (err) {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const adminLogin = async (email, password) => {
    setError(null);
    try {
      const res = await api.post('/admin/login', { email, password });
      setAdmin(res.data.admin);
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const adminLogout = async () => {
    try {
      await api.post('/admin/logout');
    } catch (err) {
      console.warn('Admin logout error:', err.message);
    } finally {
      setAdmin(null);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        loading,
        error,
        isAuthenticated: !!admin,
        adminLogin,
        adminLogout,
        checkAdminAuth,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export default AdminAuthContext;
