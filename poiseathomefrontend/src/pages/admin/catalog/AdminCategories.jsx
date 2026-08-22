import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { fetchApi } from '../../../services/api';
import { Plus, Edit2, CheckCircle, XCircle } from 'lucide-react';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: null, name: '', description: '', is_active: true, sort_order: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const res = await fetchApi('/admin/service-categories');
      if (res.ok) setCategories((await res.json()).data);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const openNew = () => {
    setForm({ id: null, name: '', description: '', is_active: true, sort_order: 0 });
    setError('');
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setForm({ id: cat.id, name: cat.name, description: cat.description || '', is_active: cat.is_active, sort_order: cat.sort_order });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const url = form.id ? `/admin/service-categories/${form.id}` : '/admin/service-categories';
      const method = form.id ? 'PUT' : 'POST';
      const res = await fetchApi(url, { method, body: JSON.stringify(form) });
      if (res.ok) {
        setShowModal(false);
        loadData();
      } else {
        setError((await res.json()).message);
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (cat) => {
    try {
      const res = await fetchApi(`/admin/service-categories/${cat.id}/active`, { method: 'PATCH' });
      if (res.ok) loadData();
    } catch (e) {}
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Service Categories</h1>
          <p className="text-text-muted mt-1">Manage top-level groupings for your salon services.</p>
        </div>
        <button onClick={openNew} className="flex items-center px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-primary-deep font-medium transition-colors">
          <Plus className="w-5 h-5 mr-1" /> Add Category
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm text-text-primary">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-text-muted">
            <tr>
              <th className="px-6 py-4 font-semibold">Name</th>
              <th className="px-6 py-4 font-semibold">Description</th>
              <th className="px-6 py-4 font-semibold text-center">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="4" className="text-center py-8">Loading...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-8">No categories found.</td></tr>
            ) : (
              categories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium">{cat.name}</td>
                  <td className="px-6 py-4 truncate max-w-xs text-text-muted">{cat.description || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => toggleActive(cat)} className="inline-flex items-center">
                      {cat.is_active ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-gray-300" />}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(cat)} className="text-primary-accent hover:text-primary-deep font-medium text-sm">Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed bottom-0 left-0 right-0 top-16 z-20 overflow-y-auto bg-background md:left-64">
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 md:py-10">
            <div className="form-surface rounded-2xl p-6 sm:p-8">
            <h3 className="text-xl font-bold text-text-primary mb-4">{form.id ? 'Edit' : 'Add'} Category</h3>
            {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category Name</label>
                <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                <textarea rows="3" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple"></textarea>
              </div>
              <div>
                <label className="flex items-center text-sm font-medium cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="mr-2 rounded text-primary-purple focus:ring-primary-purple" />
                  Active publicly
                </label>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-text-muted hover:bg-gray-100 rounded-lg">Back to categories</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-primary-deep">
                  {submitting ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminCategories;
