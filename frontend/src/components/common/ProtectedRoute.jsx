import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const targetUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect_url=${targetUrl}`} state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
