import React, { useCallback, useState, useEffect } from 'react';
import { fetchApi } from '../../../services/api';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { Archive, ArchiveRestore, Edit2, Plus, Loader } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';
import { useAppDialog } from '../../../context/AppDialogContext';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProd, setEditingProd] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState('active');
  
  const initialForm = {
    product_category_id: '',
    sku: '',
    name: '',
    description: '',
    brand: '',
    unit: 'milliliter',
    cost_price: '',
    low_stock_threshold: 0,
    is_active: true,
    initial_quantity: ''
  };
  
  const [formData, setFormData] = useState(initialForm);
  const { confirmDialog, messageDialog } = useAppDialog();

  const loadData = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetchApi(`/admin/products?status=${view}`),
        fetchApi('/admin/product-categories')
      ]);
      if (prodRes.ok) setProducts((await prodRes.json()).data);
      if (catRes.ok) setCategories((await catRes.json()).data);
    } catch {} finally { setLoading(false); }
  }, [view]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleArchive = async (product) => {
    const restoring = !product.is_active;
    const confirmed = await confirmDialog(
      restoring
        ? `Restore ${product.name} to active products and inventory?`
        : `Archive ${product.name}? Its inventory and movement history will be preserved.`,
      {
        title: restoring ? 'Restore product' : 'Archive product',
        confirmLabel: restoring ? 'Restore' : 'Archive',
        tone: restoring ? 'primary' : 'danger'
      }
    );
    if (!confirmed) return;

    try {
      const action = restoring ? 'restore' : 'archive';
      const res = await fetchApi(`/admin/products/${product.id}/${action}`, { method: 'PATCH' });
      if (res.ok) {
        await loadData();
      } else {
        const error = await res.json();
        await messageDialog(error.message || `The product could not be ${restoring ? 'restored' : 'archived'}.`);
      }
    } catch {
      await messageDialog(`The product could not be ${restoring ? 'restored' : 'archived'}.`);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const lowStock = Number(formData.low_stock_threshold) || 0;
    const initialQty = (!editingProd && formData.initial_quantity !== '' && formData.initial_quantity !== null && formData.initial_quantity !== undefined)
      ? Number(formData.initial_quantity)
      : null;

    if (formData.unit === 'piece') {
      if (!Number.isInteger(lowStock)) {
        await messageDialog('Low stock threshold must be a whole number for items counted in pieces.');
        return;
      }
      if (initialQty !== null && !Number.isInteger(initialQty)) {
        await messageDialog('Initial quantity must be a whole number for items counted in pieces.');
        return;
      }
    }

    if (lowStock > 100000) {
      await messageDialog('Low stock threshold cannot exceed 100,000.');
      return;
    }
    if (initialQty !== null && initialQty > 100000) {
      await messageDialog('Initial quantity cannot exceed 100,000.');
      return;
    }

    try {
      const url = editingProd ? `/admin/products/${editingProd.id}` : '/admin/products';
      const payload = {
        product_category_id: formData.product_category_id,
        sku: formData.sku?.trim(),
        name: formData.name?.trim(),
        description: formData.description || null,
        brand: formData.brand || null,
        unit: formData.unit,
        low_stock_threshold: lowStock,
        is_active: Boolean(formData.is_active),
      };

      if (formData.cost_price !== '' && formData.cost_price !== null && formData.cost_price !== undefined) {
        payload.cost_price = Number(formData.cost_price);
      } else {
        payload.cost_price = null;
      }

      if (initialQty !== null) {
        payload.initial_quantity = initialQty;
      }
      
      const res = await fetchApi(url, {
        method: editingProd ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        loadData();
      } else {
        const err = await res.json();
        await messageDialog(err.message || 'The product could not be saved.');
      }
    } catch {
      await messageDialog('A network error occurred while saving the product.');
    }
  };

  const openModal = (prod = null) => {
    setEditingProd(prod);
    if (prod) {
      setFormData({
        product_category_id: prod.product_category_id || '',
        sku: prod.sku || '',
        name: prod.name || '',
        description: prod.description || '',
        brand: prod.brand || '',
        unit: prod.unit || 'milliliter',
        cost_price: prod.cost_price ?? '',
        low_stock_threshold: prod.low_stock_threshold ?? 0,
        is_active: Boolean(prod.is_active),
        initial_quantity: ''
      });
    } else {
      setFormData(initialForm);
    }
    setShowModal(true);
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Products</h1>
          <div className="mt-3 inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {['active', 'archived'].map(status => (
              <button key={status} onClick={() => { setLoading(true); setView(status); }} className={`rounded-md px-4 py-2 text-sm font-bold capitalize transition-colors ${view === status ? 'bg-primary-purple text-white' : 'text-text-muted hover:text-primary-purple'}`}>
                {status}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => openModal()} className="px-4 py-2 bg-primary-purple text-white font-bold rounded-lg hover:bg-primary-deep transition-colors flex items-center">
          <Plus className="w-5 h-5 mr-2" /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-muted"><Loader className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading products...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">SKU / Product</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Category</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Unit</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Cost Price</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-center">Status</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <p className="font-mono text-xs font-bold text-text-muted">{p.sku}</p>
                      <p className="font-bold text-text-primary text-sm mt-0.5">{p.name}</p>
                      {p.brand && <p className="text-xs text-text-muted">{p.brand}</p>}
                    </td>
                    <td className="p-4 text-sm text-text-muted">{p.category?.name}</td>
                    <td className="p-4 text-sm text-text-muted capitalize">{p.unit}</td>
                    <td className="p-4 text-right text-sm font-medium">{p.cost_price ? formatMoney(p.cost_price) : '—'}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button onClick={() => openModal(p)} className="p-2 mr-2 text-text-muted hover:text-primary-purple bg-white rounded-lg border hover:border-primary-purple transition-colors inline-block" aria-label={`Edit ${p.name}`}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleArchive(p)} className={`p-2 bg-white rounded-lg border transition-colors inline-block ${p.is_active ? 'text-text-muted hover:border-red-400 hover:text-red-700' : 'text-primary-purple hover:border-primary-purple'}`} aria-label={`${p.is_active ? 'Archive' : 'Restore'} ${p.name}`}>
                        {p.is_active ? <Archive className="w-4 h-4" /> : <ArchiveRestore className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-text-muted">No {view} products found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed bottom-0 left-0 right-0 top-16 z-20 overflow-y-auto bg-background md:left-64">
          <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 md:py-10">
            <div className="form-surface rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold mb-4">{editingProd ? 'Edit Product' : 'New Product'}</h2>
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold mb-1">Name</label>
                <input required type="text" className="w-full px-3 py-2 border rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">SKU</label>
                <input required type="text" className="w-full px-3 py-2 border rounded-lg font-mono text-sm uppercase" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Category</label>
                <select required className="w-full px-3 py-2 border rounded-lg" value={formData.product_category_id} onChange={e => setFormData({...formData, product_category_id: e.target.value})}>
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Brand (Optional)</label>
                <input type="text" className="w-full px-3 py-2 border rounded-lg" value={formData.brand || ''} onChange={e => setFormData({...formData, brand: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Unit</label>
                <select required className="w-full px-3 py-2 border rounded-lg capitalize" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                  {['piece','milliliter','gram','bottle','pack','tube','other'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Low Stock Threshold</label>
                <input
                  required
                  type="number"
                  step={formData.unit === 'piece' ? '1' : '0.001'}
                  min="0"
                  max="100000"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.low_stock_threshold}
                  onChange={e => setFormData({...formData, low_stock_threshold: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Cost Price (Optional)</label>
                <input type="number" step="0.01" min="0" className="w-full px-3 py-2 border rounded-lg" value={formData.cost_price || ''} onChange={e => setFormData({...formData, cost_price: e.target.value})} />
              </div>
              
              {!editingProd && (
                <div className="col-span-1 md:col-span-2 bg-lavender p-4 rounded-xl border border-primary-purple/20">
                  <label className="block text-sm font-semibold mb-1 text-primary-deep">Initial Inventory Quantity</label>
                  <p className="text-xs text-primary-purple mb-2">Sets the starting stock level immediately.</p>
                  <input
                    type="number"
                    step={formData.unit === 'piece' ? '1' : '0.001'}
                    min="0"
                    max="100000"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={formData.initial_quantity || ''}
                    onChange={e => setFormData({...formData, initial_quantity: e.target.value})}
                  />
                </div>
              )}

              <div className="col-span-1 md:col-span-2 flex items-center mt-2">
                <input type="checkbox" id="active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="mr-2" />
                <label htmlFor="active" className="text-sm font-semibold">Active Product</label>
              </div>

              <div className="col-span-1 md:col-span-2 flex gap-3 mt-4">
                <button type="submit" className="flex-1 py-2 bg-primary-purple text-white font-bold rounded-lg hover:bg-primary-deep">Save Product</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200">Back to products</button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminProducts;
