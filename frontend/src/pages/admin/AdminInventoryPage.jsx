import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import AdminNavbar from '../../components/admin/AdminNavbar';
import {
  Package,
  AlertTriangle,
  CheckCircle,
  Save,
  RotateCw,
  Zap,
  Flame,
  Droplets,
  Layers,
  Salad,
  Loader2,
} from 'lucide-react';

const AdminInventoryPage = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [stockEdits, setStockEdits] = useState({});
  const [thresholdEdits, setThresholdEdits] = useState({});
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [metrics, setMetrics] = useState(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/inventory');
      setInventory(res.data.items || []);
      setMetrics(res.data.metrics || null);
      
      // Initialize edit states
      const initialStock = {};
      const initialThresholds = {};
      (res.data.items || []).forEach((item) => {
        initialStock[item._id] = item.stockQty;
        initialThresholds[item._id] = item.lowStockThreshold;
      });
      setStockEdits(initialStock);
      setThresholdEdits(initialThresholds);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleUpdateStock = async (id) => {
    try {
      setUpdatingId(id);
      setFeedback({ type: '', text: '' });

      const newQty = parseInt(stockEdits[id], 10);
      const newThreshold = parseInt(thresholdEdits[id], 10);

      if (isNaN(newQty) || newQty < 0) {
        setFeedback({ type: 'error', text: 'Stock quantity must be a non-negative number' });
        return;
      }

      await api.put(`/admin/inventory/${id}`, {
        stockQty: newQty,
        lowStockThreshold: newThreshold,
      });

      setFeedback({ type: 'success', text: 'Stock updated successfully!' });
      await fetchInventory();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleTriggerTest = async (id, name) => {
    try {
      setUpdatingId(id);
      setFeedback({ type: '', text: '' });
      const res = await api.post(`/admin/inventory/${id}/trigger-low-stock-test`);
      setFeedback({
        type: 'success',
        text: `Test triggered for '${name}': Stock reduced and alert dispatched!`,
      });
      await fetchInventory();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setUpdatingId(null);
    }
  };

  const getCategoryIcon = (type) => {
    switch (type) {
      case 'base':
        return <Layers size={15} color="#F86015" />;
      case 'sauce':
        return <Droplets size={15} color="#D42518" />;
      case 'cheese':
        return <Flame size={15} color="#FFCA26" />;
      case 'veggie':
        return <Salad size={15} color="#9ABC04" />;
      default:
        return <Package size={15} />;
    }
  };

  return (
    <div className="admin-page">
      <AdminNavbar />
      <div className="admin-container">
        <div className="admin-page-header">
          <div>
            <h2>🍕 Kitchen Inventory & Stock Manager</h2>
            <p>Monitor raw ingredient stock quantities, thresholds, and trigger alerts</p>
          </div>
          <button onClick={fetchInventory} className="btn btn-secondary btn-sm" disabled={loading}>
            <RotateCw size={15} className={loading ? 'spin-icon' : ''} />
            <span>Refresh Inventory</span>
          </button>
        </div>

        {feedback.text && (
          <div className={`alert ${feedback.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            {feedback.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Metrics Banner */}
        {metrics && (
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">Total Ingredients</span>
              <span className="metric-val">{metrics.totalItems}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">In Stock</span>
              <span className="metric-val text-success">{metrics.inStockItems}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Low Stock Warnings</span>
              <span className="metric-val text-warning">{metrics.lowStockItems}</span>
            </div>
          </div>
        )}

        {/* Inventory Table */}
        <div className="admin-card table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Category</th>
                <th>Price</th>
                <th>Current Stock</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const isLow = item.stockQty <= item.lowStockThreshold;
                const isUpdating = updatingId === item._id;

                return (
                  <tr key={item._id} className={isLow ? 'row-low-stock' : ''}>
                    <td className="font-bold">{item.name}</td>
                    <td>
                      <span className="category-pill">
                        {getCategoryIcon(item.type)}
                        <span>{item.type}</span>
                      </span>
                    </td>
                    <td className="font-bold">₹{item.price}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        className="table-input"
                        value={stockEdits[item._id] ?? item.stockQty}
                        onChange={(e) =>
                          setStockEdits({ ...stockEdits, [item._id]: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        className="table-input"
                        value={thresholdEdits[item._id] ?? item.lowStockThreshold}
                        onChange={(e) =>
                          setThresholdEdits({ ...thresholdEdits, [item._id]: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <span className={`stock-pill ${isLow ? 'low' : 'ok'}`}>
                        {isLow ? `Low Stock (${item.stockQty})` : 'Healthy Stock'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleUpdateStock(item._id)}
                          className="btn btn-primary btn-xs"
                          disabled={isUpdating}
                          title="Save Stock Changes"
                        >
                          {isUpdating ? <Loader2 size={13} className="spin-icon" /> : <Save size={13} />}
                          <span>Update</span>
                        </button>
                        <button
                          onClick={() => handleTriggerTest(item._id, item.name)}
                          className="btn btn-secondary btn-xs"
                          disabled={isUpdating}
                          title="Force Stock Low and Test Email Alert"
                        >
                          <Zap size={13} color="#f59e0b" />
                          <span>Test Alert</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminInventoryPage;
