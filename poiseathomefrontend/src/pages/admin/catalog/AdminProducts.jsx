import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../../services/api';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { Edit2, Plus, Loader } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';
import { useAppDialog } from '../../../context/AppDialogContext';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProd, setEditingProd] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
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
  const { messageDialog } = useAppDialog();

  useEffect(() => { 
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetchApi('/admin/products'),
        fetchApi('/admin/product-categories')
      ]);
      if (prodRes.ok) setProducts((await prodRes.json()).data);
      if (catRes.ok) setCategories((await catRes.json()).data);
    } catch(e) {} finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const url = editingProd ? `/admin/products/${editingProd.id}` : '/admin/products';
      const payload = { ...formData };
      if (!payload.cost_price) delete payload.cost_price;
      
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
    } catch(e) {}
  };

  const openModal = (prod = null) => {
    setEditingProd(prod);
    setFormData(prod ? { ...prod, cost_price: prod.cost_price || '' } : initialForm);
    setShowModal(true);
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Products</h1>
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
                    <td className="p-4 text-right">
                      <button onClick={() => openModal(p)} className="p-2 text-text-muted hover:text-primary-purple bg-white rounded-lg border hover:border-primary-purple transition-colors inline-block">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-text-muted">No products found.</td>
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
                <input required type="number" step="0.001" min="0" className="w-full px-3 py-2 border rounded-lg" value={formData.low_stock_threshold} onChange={e => setFormData({...formData, low_stock_threshold: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Cost Price (Optional)</label>
                <input type="number" step="0.01" min="0" className="w-full px-3 py-2 border rounded-lg" value={formData.cost_price || ''} onChange={e => setFormData({...formData, cost_price: e.target.value})} />
              </div>
              
              {!editingProd && (
                <div className="col-span-1 md:col-span-2 bg-lavender p-4 rounded-xl border border-primary-purple/20">
                  <label className="block text-sm font-semibold mb-1 text-primary-deep">Initial Inventory Quantity</label>
                  <p className="text-xs text-primary-purple mb-2">Sets the starting stock level immediately.</p>
                  <input type="number" step="0.001" min="0" className="w-full px-3 py-2 border rounded-lg" value={formData.initial_quantity || ''} onChange={e => setFormData({...formData, initial_quantity: e.target.value})} />
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
