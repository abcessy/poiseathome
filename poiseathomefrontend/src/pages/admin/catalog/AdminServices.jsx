import React, { useEffect, useState, useRef } from 'react';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { fetchApi, mediaUrl } from '../../../services/api';
import { formatMoney, formatDuration } from '../../../utils/formatters';
import { Plus, CheckCircle, XCircle, Users, ImageIcon, UploadCloud, Trash2 } from 'lucide-react';
import { useAppDialog } from '../../../context/AppDialogContext';

const AdminServices = () => {
  const { confirmDialog, messageDialog } = useAppDialog();
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Service Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: null, service_category_id: '', name: '', description: '', duration_minutes: 60, price: 0, is_home_service: true, is_active: true });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Staff Modal
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [activeService, setActiveService] = useState(null);
  const [allStaff, setAllStaff] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);

  const loadData = async () => {
    try {
      const [svcRes, catRes] = await Promise.all([
        fetchApi('/admin/services'),
        fetchApi('/admin/service-categories')
      ]);
      if (svcRes.ok) setServices((await svcRes.json()).data);
      if (catRes.ok) setCategories((await catRes.json()).data);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const openNew = () => {
    setForm({ id: null, service_category_id: categories[0]?.id || '', name: '', description: '', duration_minutes: 60, price: 0, is_home_service: true, is_active: true });
    setImageFile(null);
    setImagePreview(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (svc) => {
    setForm({ id: svc.id, service_category_id: svc.service_category_id, name: svc.name, description: svc.description || '', duration_minutes: svc.duration_minutes, price: svc.price, is_home_service: svc.is_home_service, is_active: svc.is_active });
    setImageFile(null);
    setImagePreview(svc.image_path ? mediaUrl(svc.image_path) : null);
    setError('');
    setShowModal(true);
  };

  const selectImage = file => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('The service image must not exceed 5 MB.');
      return;
    }
    setError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDrop = event => {
    event.preventDefault();
    setDragActive(false);
    selectImage(event.dataTransfer.files?.[0]);
  };

  const clearSelectedImage = () => {
    setImageFile(null);
    const currentService = services.find(service => service.id === form.id);
    setImagePreview(currentService?.image_path ? mediaUrl(currentService.image_path) : null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    const formData = new FormData();
    Object.keys(form).forEach(k => {
      if (k !== 'id') formData.append(k, form[k]);
    });
    if (imageFile) formData.append('image', imageFile);

    try {
      const url = form.id ? `/admin/services/${form.id}` : '/admin/services';
      // If PUT with FormData in Laravel, spoof it via POST with _method=PUT
      if (form.id) formData.append('_method', 'PUT');
      
      const res = await fetchApi(url, { method: 'POST', body: formData });
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

  const toggleActive = async (svc) => {
    await fetchApi(`/admin/services/${svc.id}/active`, { method: 'PATCH' });
    loadData();
  };

  const handleDelete = async (svc) => {
    const confirmed = await confirmDialog(
      `Are you sure you want to remove the service "${svc.name}"? This action cannot be undone.`,
      {
        title: 'Delete Service',
        confirmLabel: 'Delete',
        tone: 'danger',
      }
    );
    if (!confirmed) return;

    try {
      const res = await fetchApi(`/admin/services/${svc.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        loadData();
      } else {
        await messageDialog(data.message || 'The service could not be deleted.');
      }
    } catch (e) {
      await messageDialog('A network error occurred while attempting to delete the service.');
    }
  };

  const openStaffManager = async (svc) => {
    setActiveService(svc);
    setShowStaffModal(true);
    setStaffLoading(true);
    try {
      const [allRes, assignedRes] = await Promise.all([
        fetchApi('/admin/staff'),
        fetchApi(`/admin/services/${svc.id}/staff`)
      ]);
      if (allRes.ok) setAllStaff((await allRes.json()).data);
      if (assignedRes.ok) {
        const assigned = (await assignedRes.json()).data;
        setSelectedStaffIds(assigned.map(s => s.id));
      }
    } catch(e) {} finally {
      setStaffLoading(false);
    }
  };

  const saveStaffAssignments = async () => {
    setStaffLoading(true);
    try {
      const res = await fetchApi(`/admin/services/${activeService.id}/staff`, {
        method: 'PUT',
        body: JSON.stringify({ staff_ids: selectedStaffIds })
      });
      if (res.ok) {
        setShowStaffModal(false);
        loadData(); // refresh count
      }
    } catch(e) {} finally {
      setStaffLoading(false);
    }
  };

  const toggleStaffSelection = (id) => {
    setSelectedStaffIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Services</h1>
          <p className="text-text-muted mt-1">Manage salon services and pricing.</p>
        </div>
        <button onClick={openNew} className="flex items-center px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-primary-deep font-medium transition-colors">
          <Plus className="w-5 h-5 mr-1" /> Add Service
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text-primary">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-text-muted">
              <tr>
                <th className="px-6 py-4 font-semibold">Service</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Price / Duration</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Staff</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr>
              ) : services.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8">No services found.</td></tr>
              ) : (
                services.map(svc => (
                  <tr key={svc.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {svc.image_path ? (
                          <img src={mediaUrl(svc.image_path)} className="w-10 h-10 rounded object-cover mr-3" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center mr-3 text-gray-400"><ImageIcon className="w-5 h-5" /></div>
                        )}
                        <div>
                          <p className="font-semibold">{svc.name}</p>
                          {svc.is_home_service && <span className="text-[10px] bg-lavender text-primary-deep px-2 py-0.5 rounded mt-1 inline-block">Home Service</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{svc.category?.name}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold">{formatMoney(svc.price)}</div>
                      <div className="text-xs text-text-muted">{formatDuration(svc.duration_minutes)}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => toggleActive(svc)} className="inline-flex items-center">
                        {svc.is_active ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-gray-300" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => openStaffManager(svc)} className="inline-flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium transition-colors">
                        <Users className="w-3 h-3 mr-1" /> {svc.qualified_staff_count}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-3">
                      <button onClick={() => openEdit(svc)} className="text-primary-accent hover:text-primary-deep font-medium text-sm">Edit</button>
                      <button onClick={() => handleDelete(svc)} className="text-red-600 hover:text-red-800 font-medium text-sm">Delete</button>
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
          <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 md:py-10">
            <div className="form-surface rounded-2xl p-6 sm:p-8">
            <h3 className="text-xl font-bold text-text-primary mb-4">{form.id ? 'Edit' : 'Add'} Service</h3>
            {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Service Name</label>
                <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select required value={form.service_category_id} onChange={e => setForm({...form, service_category_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple">
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                <textarea rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (₱)</label>
                  <input type="number" min="0" step="0.01" required value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                  <input type="number" min="1" required value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple" />
                  <p className="text-xs text-text-muted mt-1">{formatDuration(form.duration_minutes)}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Service image</label>
                <div onDragEnter={event => { event.preventDefault(); setDragActive(true); }} onDragOver={event => event.preventDefault()} onDragLeave={event => { if (event.currentTarget === event.target) setDragActive(false); }} onDrop={handleDrop} className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-colors ${dragActive ? 'border-primary-purple bg-lavender' : 'border-purple-200 bg-white hover:border-primary-purple/60'}`}>
                  {imagePreview ? <div className="grid gap-5 p-4 sm:grid-cols-[11rem_1fr] sm:items-center"><img src={imagePreview} alt="Service preview" className="aspect-[4/3] w-full rounded-lg object-cover" /><div><p className="font-semibold">{imageFile?.name || 'Current service image'}</p><p className="mt-1 text-sm text-text-muted">Drop another image here to replace it, or select a different file.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => fileInputRef.current?.click()} className="btn-outline"><UploadCloud className="h-4 w-4" />Replace image</button>{imageFile && <button type="button" onClick={clearSelectedImage} className="btn-ghost text-red-700"><Trash2 className="h-4 w-4" />Undo replacement</button>}</div></div></div> : <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full flex-col items-center px-5 py-9 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-lavender text-primary-deep"><UploadCloud className="h-6 w-6" /></span><span className="mt-4 font-semibold text-primary-deep">Drop a service image here</span><span className="mt-1 text-sm text-text-muted">or click to browse · JPG, PNG or WebP · maximum 5 MB</span></button>}
                  <input type="file" ref={fileInputRef} onChange={event => selectImage(event.target.files?.[0])} accept="image/jpeg,image/png,image/webp" className="hidden" />
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <label className="flex items-center text-sm font-medium cursor-pointer">
                  <input type="checkbox" checked={form.is_home_service} onChange={e => setForm({...form, is_home_service: e.target.checked})} className="mr-2 rounded text-primary-purple" />
                  Available for Home Service
                </label>
                <label className="flex items-center text-sm font-medium cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="mr-2 rounded text-primary-purple" />
                  Active publicly
                </label>
              </div>
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-text-muted hover:bg-gray-100 rounded-lg">Back to services</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-primary-deep">
                  {submitting ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {showStaffModal && activeService && (
        <div className="fixed bottom-0 left-0 right-0 top-16 z-20 overflow-y-auto bg-background md:left-64">
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 md:py-10">
            <div className="form-surface rounded-2xl p-6 sm:p-8">
            <h3 className="text-xl font-bold text-text-primary mb-1">Qualified Hairstylists</h3>
            <p className="text-sm text-text-muted mb-4">Assign staff qualified to perform: <span className="font-semibold text-primary-purple">{activeService.name}</span></p>
            
            {staffLoading ? (
              <div className="py-8 text-center text-text-muted">Loading...</div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 mb-6">
                {allStaff.length === 0 ? (
                  <p className="text-sm text-text-muted">No staff found.</p>
                ) : (
                  allStaff.map(staff => (
                    <label key={staff.id} className="flex items-center p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={selectedStaffIds.includes(staff.id)}
                        onChange={() => toggleStaffSelection(staff.id)}
                        className="w-4 h-4 text-primary-purple rounded focus:ring-primary-purple mr-3"
                      />
                      <div>
                        <p className="font-medium text-sm text-text-primary">{staff.profile?.display_name || staff.name}</p>
                        <p className="text-xs text-text-muted">{staff.profile?.specialization || 'Staff'}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowStaffModal(false)} className="px-4 py-2 text-text-muted hover:bg-gray-100 rounded-lg">Back to services</button>
              <button onClick={saveStaffAssignments} disabled={staffLoading} className="px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-primary-deep">
                Save Assignments
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminServices;
