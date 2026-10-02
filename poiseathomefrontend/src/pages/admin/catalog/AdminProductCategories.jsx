import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../../services/api';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { Edit2, Plus, Loader } from 'lucide-react';

const AdminProductCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCat, setEditingCat] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', slug: '', sort_order: 0, is_active: true });

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const res = await fetchApi('/admin/product-categories');
      if (res.ok) setCategories((await res.json()).data);
    } catch(e) {} finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const url = editingCat ? `/admin/product-categories/${editingCat.id}` : '/admin/product-categories';
      const res = await fetchApi(url, {
        method: editingCat ? 'PUT' : 'POST',
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        loadCategories();
      }
    } catch(e) {}
  };

  const openModal = (cat = null) => {
    setEditingCat(cat);
    setFormData(cat ? { ...cat } : { name: '', description: '', slug: '', sort_order: 0, is_active: true });
    setShowModal(true);
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Product Categories</h1>
        <button onClick={() => openModal()} className="px-4 py-2 bg-primary-purple text-white font-bold rounded-lg hover:bg-primary-deep transition-colors flex items-center">
          <Plus className="w-5 h-5 mr-2" /> Add Category
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-muted"><Loader className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading categories...</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Name / Slug</th>
                <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Description</th>
                <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-center">Status</th>
                <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-text-primary text-sm">{c.name}</p>
                    <p className="text-xs text-text-muted font-mono mt-0.5">{c.slug}</p>
                  </td>
                  <td className="p-4 text-sm text-text-muted">{c.description || '—'}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => openModal(c)} className="p-2 text-text-muted hover:text-primary-purple bg-white rounded-lg border hover:border-primary-purple transition-colors inline-block">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-text-muted">No product categories found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed bottom-0 left-0 right-0 top-16 z-20 overflow-y-auto bg-background md:left-64">
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 md:py-10">
            <div className="form-surface rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-bold mb-4">{editingCat ? 'Edit Category' : 'New Category'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Name</label>
                <input required type="text" className="w-full px-3 py-2 border rounded-lg" value={formData.name} onChange={e => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, name: val, slug: !editingCat ? val.toLowerCase().replace(/\s+/g, '-') : prev.slug }))
                }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Slug</label>
                <input required type="text" className="w-full px-3 py-2 border rounded-lg font-mono text-sm" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Description</label>
                <textarea className="w-full px-3 py-2 border rounded-lg text-sm" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>
              <div className="flex items-center mt-2">
                <input type="checkbox" id="active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="mr-2" />
                <label htmlFor="active" className="text-sm font-semibold">Active Category</label>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 py-2 bg-primary-purple text-white font-bold rounded-lg hover:bg-primary-deep">Save</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200">Back to categories</button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminProductCategories;
