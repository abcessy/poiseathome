import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { ArrowLeft, Loader, Plus, Minus, FileText, Edit2 } from 'lucide-react';
import { InventoryBadge } from './AdminInventory';
import { formatDateTime } from '../../../utils/formatters';
import { useAppDialog } from '../../../context/AppDialogContext';

const AdminInventoryDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showModal, setShowModal] = useState(null); // 'in', 'out', 'adjust'
  const [formData, setFormData] = useState({ quantity: '', notes: '', reason: '', type: 'adjustment_in' });
  const { messageDialog } = useAppDialog();

  useEffect(() => { loadAll(); }, [id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([
        fetchApi(`/admin/products/${id}`),
        fetchApi(`/admin/inventory/${id}/movements`)
      ]);
      if (pRes.ok) setProduct((await pRes.json()).data);
      if (mRes.ok) setMovements((await mRes.json()).data);
    } catch(e) {} finally { setLoading(false); }
  };

  const handleAction = async (e) => {
    e.preventDefault();
    const qty = Number(formData.quantity);
    if (!qty || qty <= 0) {
      await messageDialog('Please enter a valid quantity greater than zero.');
      return;
    }
    if (qty > 100000) {
      await messageDialog('Quantity cannot exceed 100,000.');
      return;
    }
    if (product.unit === 'piece' && !Number.isInteger(qty)) {
      await messageDialog('Quantity must be a whole number for items counted in pieces.');
      return;
    }

    let url = `/admin/inventory/${id}`;
    let method = 'POST';
    let body = {};

    if (showModal === 'in') { url += '/stock-in'; body = { quantity: qty, notes: formData.notes }; }
    else if (showModal === 'out') { url += '/stock-out'; body = { quantity: qty, notes: formData.notes }; }
    else if (showModal === 'adjust') { url += '/adjust'; body = { quantity: qty, reason: formData.notes, type: formData.type }; }

    try {
      const res = await fetchApi(url, { method, body: JSON.stringify(body) });
      if (res.ok) {
        setShowModal(null);
        setFormData({ quantity: '', notes: '', reason: '', type: 'adjustment_in' });
        loadAll();
      } else {
        const err = await res.json();
        await messageDialog(err.message || 'The inventory operation could not be completed.');
      }
    } catch (e) {
      await messageDialog('The inventory operation could not be completed.');
    }
  };

  const getMovementLabel = (type) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) return <DashboardLayout role="admin"><div className="p-8 text-center text-text-muted"><Loader className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading inventory details...</div></DashboardLayout>;
  if (!product) return null;

  return (
    <DashboardLayout role="admin">
      <Link to="/admin/inventory" className="inline-flex items-center text-sm font-medium text-text-muted hover:text-primary-purple mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Inventory
      </Link>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50">
          <div>
            <span className="text-xs font-mono font-bold text-text-muted block mb-1">SKU: {product.sku}</span>
            <h1 className="text-2xl font-bold text-text-primary">{product.name}</h1>
            <p className="text-sm text-text-muted mt-1">{product.category?.name} • {product.brand || 'No Brand'}</p>
          </div>
          <div className="mt-4 md:mt-0 text-left md:text-right">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Available Stock</p>
            <div className="flex items-center md:justify-end">
              <span className="text-3xl font-bold text-text-primary mr-2">{parseFloat(product.inventory?.available_quantity || 0)}</span>
              <span className="text-sm text-text-muted capitalize">{product.unit}</span>
            </div>
            <div className="mt-2"><InventoryBadge status={product.inventory_status} /></div>
          </div>
        </div>

        <div className="p-6 bg-white border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <button onClick={() => setShowModal('in')} className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-lg hover:bg-blue-200 flex items-center text-sm">
            <Plus className="w-4 h-4 mr-1" /> Stock In
          </button>
          <button onClick={() => setShowModal('out')} className="px-4 py-2 bg-orange-100 text-orange-700 font-bold rounded-lg hover:bg-orange-200 flex items-center text-sm">
            <Minus className="w-4 h-4 mr-1" /> Stock Out
          </button>
          <Link to="/admin/products" className="px-4 py-2 bg-purple-50 text-primary-purple font-bold rounded-lg hover:bg-purple-100 flex items-center text-sm">
            <Edit2 className="w-4 h-4 mr-1" /> Manage in Products
          </Link>
          <button onClick={() => setShowModal('adjust')} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 flex items-center text-sm ml-auto">
            <FileText className="w-4 h-4 mr-1" /> Adjust Stock
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold">Stock Movement History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-text-muted uppercase text-xs">Date</th>
                <th className="p-4 font-semibold text-text-muted uppercase text-xs">Type</th>
                <th className="p-4 font-semibold text-text-muted uppercase text-xs text-right">Qty Change</th>
                <th className="p-4 font-semibold text-text-muted uppercase text-xs text-right">Balance</th>
                <th className="p-4 font-semibold text-text-muted uppercase text-xs">Reference</th>
                <th className="p-4 font-semibold text-text-muted uppercase text-xs">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.map(m => {
                const isAddition = ['stock_in', 'adjustment_in', 'appointment_usage_reversal', 'initial_stock'].includes(m.movement_type);
                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-xs">{formatDateTime(m.created_at)}</td>
                    <td className="p-4 font-semibold text-xs uppercase tracking-wider">{getMovementLabel(m.movement_type)}</td>
                    <td className={`p-4 text-right font-bold ${isAddition ? 'text-green-600' : 'text-red-600'}`}>
                      {isAddition ? '+' : '-'}{parseFloat(m.quantity)}
                    </td>
                    <td className="p-4 text-right font-mono text-xs">{parseFloat(m.quantity_after)}</td>
                    <td className="p-4 text-xs">
                      {m.reference_type === 'appointment' ? (
                        <Link to={`/admin/appointments/${m.reference_id}`} className="text-primary-purple hover:underline font-mono">Appt #{m.reference_id}</Link>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                      {m.notes && <p className="text-[10px] text-gray-500 mt-1">{m.notes}</p>}
                    </td>
                    <td className="p-4 text-xs text-text-muted">{m.user?.name || 'System'}</td>
                  </tr>
                );
              })}
              {movements.length === 0 && (
                <tr><td colSpan="6" className="p-8 text-center text-text-muted">No movements found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed bottom-0 left-0 right-0 top-16 z-20 overflow-y-auto bg-background md:left-64">
          <div className="form-surface mx-auto my-8 w-[calc(100%-2rem)] max-w-3xl rounded-2xl p-6 sm:p-8 md:my-10">
            <h2 className="text-xl font-bold mb-4">
              {showModal === 'in' ? 'Stock In' : showModal === 'out' ? 'Stock Out' : 'Adjust Stock'}
            </h2>
            <form onSubmit={handleAction} className="space-y-4">
              
              {showModal === 'adjust' && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Adjustment Type</label>
                  <select required className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="adjustment_in">Adjustment In (+)</option>
                    <option value="adjustment_out">Adjustment Out (-)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1">Quantity ({product.unit})</label>
                <input
                  required
                  type="number"
                  step={product.unit === 'piece' ? '1' : '0.001'}
                  min={product.unit === 'piece' ? '1' : '0.001'}
                  max="100000"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.quantity}
                  onChange={e => setFormData({...formData, quantity: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">{showModal === 'adjust' || showModal === 'out' ? 'Reason (Required)' : 'Notes (Optional)'}</label>
                <textarea required={showModal !== 'in'} className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
              </div>

              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 py-2 bg-primary-purple text-white font-bold rounded-lg hover:bg-primary-deep">Confirm</button>
                <button type="button" onClick={() => setShowModal(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200">Back to inventory</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminInventoryDetail;
