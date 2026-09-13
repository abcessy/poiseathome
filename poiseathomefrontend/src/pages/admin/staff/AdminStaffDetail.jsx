import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { fetchApi, mediaUrl } from '../../../services/api';
import { ArrowLeft, User, Trash2 } from 'lucide-react';
import { useAppDialog } from '../../../context/AppDialogContext';

const AdminStaffDetail = () => {
  const { id } = useParams();
  const [staff, setStaff] = useState(null);
  const [daysOff, setDaysOff] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [dayOffForm, setDayOffForm] = useState({ date: '', reason: '' });
  const { confirmDialog, messageDialog } = useAppDialog();

  const loadData = async () => {
    try {
      const [staffRes, daysRes] = await Promise.all([
        fetchApi(`/admin/staff/${id}`),
        fetchApi(`/admin/staff/${id}/days-off`)
      ]);
      
      if (staffRes.ok) setStaff((await staffRes.json()).data);
      if (daysRes.ok) setDaysOff((await daysRes.json()).data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const toggleActive = async () => {
    if (!await confirmDialog(`${staff.is_active ? 'Deactivate' : 'Activate'} this staff member?`, { title: `${staff.is_active ? 'Deactivate' : 'Activate'} staff account`, confirmLabel: staff.is_active ? 'Deactivate' : 'Activate', tone: staff.is_active ? 'danger' : 'primary' })) return;
    try {
      const res = await fetchApi(`/admin/users/${id}/active`, { method: 'PATCH' });
      if (res.ok) loadData();
    } catch (e) {}
  };

  const handleAddDayOff = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchApi(`/admin/staff/${id}/days-off`, {
        method: 'POST',
        body: JSON.stringify(dayOffForm)
      });
      if (res.ok) {
        setDayOffForm({ date: '', reason: '' });
        loadData();
      } else {
        await messageDialog((await res.json()).message || 'The day off could not be added.');
      }
    } catch (e) {}
  };

  const removeDayOff = async (dayOffId) => {
    if (!await confirmDialog('Remove this day off from the staff schedule?', { title: 'Remove day off', confirmLabel: 'Remove', tone: 'danger' })) return;
    try {
      await fetchApi(`/admin/staff/${id}/days-off/${dayOffId}`, { method: 'DELETE' });
      loadData();
    } catch (e) {}
  };

  if (loading) return <DashboardLayout role="admin"><div className="p-8">Loading...</div></DashboardLayout>;
  if (!staff) return <DashboardLayout role="admin"><div className="p-8 text-red-500">Staff not found</div></DashboardLayout>;

  return (
    <DashboardLayout role="admin">
      <Link to="/admin/staff" className="inline-flex items-center text-sm text-text-muted hover:text-primary-purple mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Staff
      </Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Profile info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="mx-auto w-32 h-32 rounded-full overflow-hidden bg-lavender flex items-center justify-center mb-4 border-2 border-primary-purple/20">
              {staff.profile?.profile_photo_path ? (
                <img src={mediaUrl(staff.profile.profile_photo_path)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-primary-purple" />
              )}
            </div>
            <h2 className="text-xl font-bold text-text-primary">{staff.name}</h2>
            {staff.profile?.display_name && staff.profile.display_name !== staff.name && (
              <p className="text-sm font-medium text-primary-purple">Display: {staff.profile.display_name}</p>
            )}
            <p className="text-sm text-text-muted">{staff.profile?.specialization || 'No specialization'}</p>
            
            <div className="mt-6 pt-6 border-t border-gray-100 text-left space-y-3 text-sm">
              <div>
                <span className="block text-text-muted text-xs uppercase font-semibold">Email</span>
                <span className="text-text-primary">{staff.email}</span>
              </div>
              <div>
                <span className="block text-text-muted text-xs uppercase font-semibold">Contact</span>
                <span className="text-text-primary">{staff.contact_number}</span>
              </div>
              <div>
                <span className="block text-text-muted text-xs uppercase font-semibold">Status</span>
                <span className={`font-medium ${staff.is_active ? 'text-green-600' : 'text-red-600'}`}>
                  {staff.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <span className="block text-text-muted text-xs uppercase font-semibold">Availability</span>
                <span className={`font-medium ${staff.profile?.is_available ? 'text-green-600' : 'text-gray-500'}`}>
                  {staff.profile?.is_available ? 'Available' : 'Unavailable'}
                </span>
              </div>
            </div>

            <button 
              onClick={toggleActive}
              className={`w-full mt-6 py-2 rounded-lg font-medium text-sm transition-colors ${staff.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
            >
              {staff.is_active ? 'Deactivate Account' : 'Activate Account'}
            </button>
          </div>
        </div>

        {/* Right Col: Days off management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-text-primary mb-4">Manage Days Off</h3>
            
            <form onSubmit={handleAddDayOff} className="rounded-xl border-l-4 border-primary-purple bg-lavender/35 p-4 flex gap-4 mb-6 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" required value={dayOffForm.date} onChange={e => setDayOffForm({...dayOffForm, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
                <input type="text" value={dayOffForm.reason} onChange={e => setDayOffForm({...dayOffForm, reason: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple" />
              </div>
              <button type="submit" className="px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-primary-deep font-medium">Add</button>
            </form>

            {daysOff.length === 0 ? (
              <p className="text-sm text-text-muted">No days off recorded.</p>
            ) : (
              <div className="space-y-3">
                {daysOff.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <span className="font-semibold text-text-primary">{d.date}</span>
                      {d.reason && <span className="ml-2 text-sm text-text-muted">- {d.reason}</span>}
                    </div>
                    <button onClick={() => removeDayOff(d.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Services Block */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
            <h3 className="text-lg font-bold text-text-primary mb-4">Qualified Services</h3>
            <p className="text-sm text-text-muted mb-4">View services this staff member is authorized to perform. To manage, use the Services catalog.</p>
            {staff.services && staff.services.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {staff.services.map(svc => (
                  <span key={svc.id} className="px-3 py-1 bg-lavender text-primary-deep text-sm font-medium rounded-full">
                    {svc.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No services assigned yet.</p>
            )}
          </div>
        </div>
        
      </div>
    </DashboardLayout>
  );
};

export default AdminStaffDetail;
