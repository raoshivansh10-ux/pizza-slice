import React from 'react';
import { Navigate } from 'react-router-dom';

const ForgotPasswordPage = () => {
  return <Navigate to="/login" replace />;
};

export default ForgotPasswordPage;
