import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { Shield, Package, ShoppingBag, LogOut, Pizza } from 'lucide-react';

const AdminNavbar = () => {
  const { admin, adminLogout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await adminLogout();
    navigate('/admin/login');
  };

  return (
    <header className="navbar admin-navbar">
      <div className="nav-container">
        <Link to="/admin/inventory" className="nav-brand">
          <div className="brand-icon admin-brand-icon">
            <Shield size={24} color="#872F20" />
          </div>
          <span className="brand-name">
            Pizza<span className="brand-accent">Slice</span> <span className="admin-tag">ADMIN PORTAL</span>
          </span>
        </Link>

        <nav className="nav-links">
          <Link to="/admin/inventory" className="nav-link">
            <Package size={16} />
            Inventory Stock
          </Link>
          <Link to="/admin/orders" className="nav-link">
            <ShoppingBag size={16} />
            Orders Management
          </Link>
        </nav>

        <div className="nav-actions">
          <div className="user-menu">
            <div className="user-badge admin-user-badge">
              <Shield size={14} />
              <span>{admin?.email || 'Administrator'}</span>
            </div>
            <button onClick={handleLogout} className="btn-logout" title="Log out Admin">
              <LogOut size={16} />
              <span>Exit Admin</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
