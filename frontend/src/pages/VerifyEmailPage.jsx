import React from 'react';
import { Navigate } from 'react-router-dom';

const VerifyEmailPage = () => {
  return <Navigate to="/login" replace />;
};

export default VerifyEmailPage;
