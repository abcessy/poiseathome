import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../../services/api';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { Search, Loader, Plus, Minus, FileText, History, X } from 'lucide-react';
import { InventoryBadge } from '../../admin/catalog/AdminInventory';
import { formatDateTime } from '../../../utils/formatters';
import { useAppDialog } from '../../../context/AppDialogContext';

const StaffInventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state: { type: 'in' | 'out' | 'adjust' | 'movements', product: object }
  const [activeModal, setActiveModal] = useState(null);
  const [formData, setFormData] = useState({ quantity: '', notes: '', type: 'adjustment_in' });
  const [modalLoading, setModalLoading] = useState(false);
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const { messageDialog } = useAppDialog();

  useEffect(() => { loadInventory(); }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/staff/inventory');
      if (res.ok) setProducts((await res.json()).data);
    } catch(e) {} finally { setLoading(false); }
  };

  const openModal = (type, product) => {
    setActiveModal({ type, product });
    setFormData({ quantity: '', notes: '', type: 'adjustment_in' });
    if (type === 'movements') {
      loadMovements(product.id);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setFormData({ quantity: '', notes: '', type: 'adjustment_in' });
    setMovements([]);
  };

  const loadMovements = async (productId) => {
    setMovementsLoading(true);
    try {
      const res = await fetchApi(`/staff/inventory/${productId}/movements`);
      if (res.ok) {
        setMovements((await res.json()).data || []);
      }
    } catch (e) {
      setMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    if (!activeModal || !activeModal.product) return;
    const { type, product } = activeModal;
    
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

    let url = `/staff/inventory/${product.id}`;
    let body = {};

    if (type === 'in') {
      url += '/stock-in';
      body = { quantity: qty, notes: formData.notes };
    } else if (type === 'out') {
      url += '/stock-out';
      body = { quantity: qty, notes: formData.notes };
    } else if (type === 'adjust') {
      url += '/adjust';
      body = { quantity: qty, reason: formData.notes, type: formData.type };
    }

    setModalLoading(true);
    try {
      const res = await fetchApi(url, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      if (res.ok) {
        closeModal();
        loadInventory();
      } else {
        const err = await res.json();
        await messageDialog(err.message || 'The inventory operation could not be completed.');
      }
    } catch (e) {
      await messageDialog('The inventory operation failed. Please check your connection.');
    } finally {
      setModalLoading(false);
    }
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout role="staff">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Operational Inventory</h1>
          <p className="text-sm text-text-muted mt-1">Record stock usage, restocks, and adjustments directly.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search SKU or Name..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-text-muted"><Loader className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading inventory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">SKU / Product</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Category</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Available</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <p className="font-mono text-xs font-bold text-text-muted">{p.sku}</p>
                      <p className="font-bold text-text-primary text-sm mt-0.5">{p.name}</p>
                    </td>
                    <td className="p-4 text-sm text-text-muted">{p.category?.name}</td>
                    <td className="p-4 text-right">
                      <span className="text-lg font-bold text-text-primary">{parseFloat(p.inventory?.available_quantity || 0)}</span>
                      <span className="text-xs text-text-muted ml-1 capitalize">{p.unit === 'piece' ? 'pcs' : p.unit}</span>
                    </td>
                    <td className="p-4">
                      <InventoryBadge status={p.inventory_status} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => openModal('in', p)}
                          title="Stock In"
                          className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> In
                        </button>
                        <button 
                          onClick={() => openModal('out', p)}
                          title="Stock Out"
                          className="px-2.5 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" /> Out
                        </button>
                        <button 
                          onClick={() => openModal('adjust', p)}
                          title="Adjust Stock"
                          className="px-2.5 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" /> Adjust
                        </button>
                        <button 
                          onClick={() => openModal('movements', p)}
                          title="View Movement History"
                          className="p-1.5 text-text-muted hover:text-primary-purple hover:bg-lavender rounded-lg transition-colors"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-text-muted">No inventory records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Mutation Modal */}
      {activeModal && ['in', 'out', 'adjust'].includes(activeModal.type) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-xl text-text-primary capitalize">
                  {activeModal.type === 'in' ? 'Record Stock In' : activeModal.type === 'out' ? 'Record Stock Out' : 'Adjust Stock Count'}
                </h3>
                <p className="text-xs font-medium text-text-muted mt-0.5">
                  {activeModal.product.name} ({activeModal.product.sku})
                </p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-purple-50/50 rounded-xl flex justify-between items-center text-xs">
              <span className="text-text-muted">Current Available:</span>
              <span className="font-bold text-primary-deep text-sm">
                {parseFloat(activeModal.product.inventory?.available_quantity || 0)} {activeModal.product.unit}
              </span>
            </div>

            <form onSubmit={handleSubmitAction} className="space-y-4">
              {activeModal.type === 'adjust' && (
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase mb-1">Adjustment Type *</label>
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="adjustment_in">Increase Stock (Add count)</option>
                    <option value="adjustment_out">Decrease Stock (Remove count)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                  Quantity ({activeModal.product.unit}) *
                </label>
                <input 
                  type="number" 
                  step={activeModal.product.unit === 'piece' ? '1' : '0.001'} 
                  min={activeModal.product.unit === 'piece' ? '1' : '0.001'} 
                  max="100000"
                  required 
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder={`e.g. 1 ${activeModal.product.unit}`}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                  {activeModal.type === 'out' ? 'Usage / Destination Notes *' : activeModal.type === 'adjust' ? 'Reason for Adjustment *' : 'Restock / Delivery Notes (Optional)'}
                </label>
                <textarea 
                  required={activeModal.type !== 'in'}
                  rows="2"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={activeModal.type === 'out' ? 'e.g. Consumed for home appointments' : activeModal.type === 'adjust' ? 'e.g. Physical inventory reconciliation' : 'e.g. Delivered batch #104'}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={closeModal} className="btn-ghost text-sm">Cancel</button>
                <button type="submit" disabled={modalLoading} className="btn-primary text-sm">
                  {modalLoading ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movements History Modal */}
      {activeModal && activeModal.type === 'movements' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-xl text-text-primary">Stock Movements History</h3>
                <p className="text-xs font-medium text-text-muted mt-0.5">
                  {activeModal.product.name} ({activeModal.product.sku})
                </p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {movementsLoading ? (
                <div className="p-8 text-center text-text-muted">Loading movements...</div>
              ) : movements.length === 0 ? (
                <div className="p-8 text-center text-text-muted">No movement history recorded yet for this item.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 text-text-muted uppercase">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5 text-right">Qty</th>
                      <th className="p-2.5 text-right">Balance</th>
                      <th className="p-2.5">Recorded By / Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movements.map(m => (
                      <tr key={m.id}>
                        <td className="p-2.5 whitespace-nowrap text-text-muted">{formatDateTime(m.created_at)}</td>
                        <td className="p-2.5 capitalize font-semibold">{m.movement_type.replace(/_/g, ' ')}</td>
                        <td className={`p-2.5 text-right font-bold ${['stock_in', 'adjustment_in', 'usage_reversed'].includes(m.movement_type) ? 'text-green-600' : 'text-amber-700'}`}>
                          {['stock_in', 'adjustment_in', 'usage_reversed'].includes(m.movement_type) ? '+' : '-'}{parseFloat(m.quantity)}
                        </td>
                        <td className="p-2.5 text-right font-medium">{parseFloat(m.new_balance)}</td>
                        <td className="p-2.5 text-text-muted">
                          <span>{m.user?.name || 'Staff'}</span>
                          {m.notes && <p className="italic text-[11px] text-text-primary">{m.notes}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 pt-3 border-t flex justify-end">
              <button onClick={closeModal} className="btn-outline text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default StaffInventory;
