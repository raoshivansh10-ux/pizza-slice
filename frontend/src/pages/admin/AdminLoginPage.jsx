import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Shield, Lock, AlertCircle, Loader2 } from 'lucide-react';

const AdminLoginPage = () => {
  const { adminLogin } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('admin@pizzadelivery.com');
  const [password, setPassword] = useState('AdminSecurePassword123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/admin/inventory';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await adminLogin(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page admin-login-page">
      <div className="auth-card admin-auth-card">
        <div className="auth-header">
          <div className="auth-icon-badge admin-badge-glow">
            <Shield size={28} color="#F86015" />
          </div>
          <h2>Administrator Portal</h2>
          <p>Restricted access for kitchen inventory management and order fulfillment</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="admin-email">Admin Email</label>
            <input
              id="admin-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-password">Admin Password</label>
            <input
              id="admin-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>Authenticating Admin...</span>
              </>
            ) : (
              <>
                <Lock size={16} />
                <span>Sign In to Admin Portal</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
