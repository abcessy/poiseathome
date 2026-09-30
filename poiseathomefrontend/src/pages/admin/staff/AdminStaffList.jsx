import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { fetchApi, mediaUrl } from '../../../services/api';
import { Plus, User, CheckCircle, XCircle } from 'lucide-react';

const AdminStaffList = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', contact_number: '', password: '', password_confirmation: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadStaff = async () => {
    try {
      const res = await fetchApi('/admin/staff');
      if (res.ok) {
        const data = await res.json();
        setStaff(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanPhone = formData.contact_number.trim().replace(/[\s-]/g, '');
    if (!/^(09\d{9}|\+639\d{9})$/.test(cleanPhone)) {
      setError('Please enter a valid Philippine mobile number (e.g. 09123456789 or +639123456789).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchApi('/admin/staff', {
        method: 'POST',
        body: JSON.stringify({ ...formData, contact_number: cleanPhone })
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setFormData({ name: '', email: '', contact_number: '', password: '', password_confirmation: '' });
        loadStaff();
      } else {
        setError(data.message || 'Error adding staff');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Staff Management</h1>
          <p className="text-text-muted mt-1">Manage salon employees and hairstylists.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-primary-deep font-medium transition-colors"
        >
          <Plus className="w-5 h-5 mr-1" />
          Add Staff
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text-primary">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-text-muted">
              <tr>
                <th className="px-6 py-4 font-semibold">Staff Member</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Specialization</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Availability</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8 text-text-muted">Loading...</td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-text-muted">No staff found.</td></tr>
              ) : (
                staff.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {s.profile?.profile_photo_path ? (
                          <img src={mediaUrl(s.profile.profile_photo_path)} alt={s.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-lavender flex items-center justify-center text-primary-purple font-bold">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                        <div className="ml-3">
                          <p className="font-semibold text-text-primary">{s.name}</p>
                          {s.profile?.display_name && s.profile.display_name !== s.name && (
                            <p className="text-xs font-medium text-primary-purple">Display: {s.profile.display_name}</p>
                          )}
                          <p className="text-xs text-text-muted">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{s.contact_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{s.profile?.specialization || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       {s.profile?.is_available ? (
                          <span className="inline-flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-1"/> Available</span>
                       ) : (
                          <span className="inline-flex items-center text-gray-400"><XCircle className="w-4 h-4 mr-1"/> Unavailable</span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/admin/staff/${s.id}`} className="text-primary-accent hover:text-primary-deep font-medium text-sm">Manage</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed bottom-0 left-0 right-0 top-16 z-20 overflow-y-auto bg-background md:left-64">
          <div className="form-surface mx-auto my-8 w-[calc(100%-2rem)] max-w-3xl rounded-2xl p-6 sm:p-8 md:my-10">
            <h3 className="text-xl font-bold text-text-primary mb-4">Add Staff Member</h3>
            {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Number</label>
                <input type="text" value={formData.contact_number} onChange={e => setFormData({...formData, contact_number: e.target.value})} required className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <input type="password" value={formData.password_confirmation} onChange={e => setFormData({...formData, password_confirmation: e.target.value})} required className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple" />
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-text-muted hover:bg-gray-100 rounded-lg">Back to staff</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-primary-deep">
                  {submitting ? 'Adding...' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminStaffList;
