import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { fetchApi } from '../../../services/api';
import { Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useAppDialog } from '../../../context/AppDialogContext';

const StaffAvailability = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [daysOff, setDaysOff] = useState([]);
  const [workingHours, setWorkingHours] = useState({ working_start_time: '09:00', working_end_time: '18:00' });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: '', reason: '' });
  const [adding, setAdding] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const { confirmDialog, messageDialog } = useAppDialog();

  const loadData = async () => {
    try {
      const [profRes, daysRes] = await Promise.all([
        fetchApi('/staff/profile'),
        fetchApi('/staff/days-off')
      ]);
      
      if (profRes.ok) {
        const profile = (await profRes.json()).data.profile;
        setIsAvailable(profile?.is_available || false);
        setWorkingHours({
          working_start_time: profile?.working_start_time?.slice(0, 5) || '09:00',
          working_end_time: profile?.working_end_time?.slice(0, 5) || '18:00'
        });
      }
      if (daysRes.ok) {
        setDaysOff((await daysRes.json()).data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const saveWorkingHours = async (e) => {
    e.preventDefault();
    setSavingHours(true);
    try {
      const res = await fetchApi('/staff/availability', {
        method: 'PUT',
        body: JSON.stringify(workingHours)
      });
      const data = await res.json();
      if (!res.ok) {
        await messageDialog(data.message || 'Working hours could not be saved.');
        return;
      }
      await messageDialog('Working hours saved. Customers can now book within this time range.');
    } catch (e) {
      await messageDialog('Working hours could not be saved because of a network error.');
    } finally {
      setSavingHours(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleAvailability = async () => {
    const newValue = !isAvailable;
    setIsAvailable(newValue); // optimistic UI
    try {
      await fetchApi('/staff/availability', {
        method: 'PUT',
        body: JSON.stringify({ is_available: newValue })
      });
    } catch (e) {
      setIsAvailable(!newValue); // revert on error
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetchApi('/staff/days-off', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setForm({ date: '', reason: '' });
        loadData();
      } else {
        await messageDialog((await res.json()).message || 'The day off could not be added.');
      }
    } catch (e) {
      await messageDialog('The day off could not be added because of a network error.');
    } finally {
      setAdding(false);
    }
  };

  const removeDayOff = async (id) => {
    if (!await confirmDialog('Remove this day off from your schedule?', { title: 'Remove day off', confirmLabel: 'Remove', tone: 'danger' })) return;
    try {
      await fetchApi(`/staff/days-off/${id}`, { method: 'DELETE' });
      loadData();
    } catch (e) {}
  };

  if (loading) return <DashboardLayout role="staff"><div className="p-8">Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout role="staff">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Availability</h1>
        <p className="text-text-muted mb-8">Manage your operational availability and personal days off.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* General Availability Toggle */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <h3 className="font-bold text-lg mb-4 text-text-primary">General Status</h3>
              
              <div className="mb-6 flex justify-center">
                {isAvailable ? (
                  <CheckCircle className="w-16 h-16 text-green-500" />
                ) : (
                  <XCircle className="w-16 h-16 text-gray-400" />
                )}
              </div>
              
              <p className="text-sm text-text-muted mb-6">
                {isAvailable ? 'You are currently receiving appointments.' : 'You are completely hidden from bookings.'}
              </p>

              <button 
                onClick={toggleAvailability}
                className={`w-full py-3 rounded-lg font-bold transition-colors ${
                  isAvailable 
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isAvailable ? 'Go Unavailable' : 'Become Available'}
              </button>
            </div>
          </div>

          {/* Days Off Management */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-text-primary mb-2">Working Hours</h3>
              <p className="text-sm text-text-muted mb-6">Customers will only see appointment times within this daily range.</p>
              <form onSubmit={saveWorkingHours} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">Start time</label>
                  <input type="time" required value={workingHours.working_start_time} onChange={e => setWorkingHours({...workingHours, working_start_time: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">End time</label>
                  <input type="time" required min={workingHours.working_start_time} value={workingHours.working_end_time} onChange={e => setWorkingHours({...workingHours, working_end_time: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple" />
                </div>
                <button type="submit" disabled={savingHours || workingHours.working_end_time <= workingHours.working_start_time} className="btn-primary h-[42px]">
                  {savingHours ? 'Saving...' : 'Save hours'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-text-primary mb-2">Days Off</h3>
              <p className="text-sm text-text-muted mb-6">Block specific dates where you will be unavailable.</p>
              
              <form onSubmit={handleAdd} className="rounded-xl border-l-4 border-primary-purple bg-lavender/35 p-4 flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">Date</label>
                  <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-text-muted mb-1 uppercase tracking-wider">Reason (Optional)</label>
                  <input type="text" placeholder="e.g. Vacation" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-primary-purple" />
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={adding} className="w-full sm:w-auto px-6 py-2 bg-primary-purple text-white rounded-lg hover:bg-primary-deep font-medium h-[42px]">
                    {adding ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                {daysOff.length === 0 ? (
                  <div className="text-center py-6 text-text-muted bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    You have no upcoming days off.
                  </div>
                ) : (
                  daysOff.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 transition-colors hover:border-gray-200">
                      <div>
                        <p className="font-semibold text-text-primary">{d.date}</p>
                        <p className="text-sm text-text-muted">{d.reason || 'Personal Day'}</p>
                      </div>
                      <button onClick={() => removeDayOff(d.id)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default StaffAvailability;
