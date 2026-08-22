import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { StatusBadge } from '../../customer/appointments/CustomerAppointments';
import { ArrowLeft, Calendar, Clock, MapPin, User, Phone } from 'lucide-react';
import { StaffAppointmentUsage } from './StaffAppointmentUsage';
import { formatDate, formatTime } from '../../../utils/formatters';
import { useAppDialog } from '../../../context/AppDialogContext';

const StaffAppointmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [usages, setUsages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { confirmDialog, messageDialog } = useAppDialog();

  useEffect(() => {
    loadApp();
  }, [id]);

  const loadApp = async () => {
    try {
      const [appRes, uRes] = await Promise.all([
        fetchApi(`/staff/appointments/${id}`),
        fetchApi(`/staff/appointments/${id}/product-usages`)
      ]);
      if (appRes.ok) setApp((await appRes.json()).data);
      else navigate('/staff/appointments');
      
      if (uRes.ok) setUsages((await uRes.json()).data);
    } catch(e) {} finally { setLoading(false); }
  };

  const updateStatus = async (newStatus) => {
    if (!await confirmDialog(`Mark this appointment as ${newStatus.replace('_', ' ')}?`, { title: 'Update appointment status', confirmLabel: 'Update status' })) return;
    setActionLoading(true);
    try {
      const res = await fetchApi(`/staff/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) loadApp();
      else await messageDialog('The appointment status could not be updated.');
    } catch(e) {} finally { setActionLoading(false); }
  };

  if (loading) return <DashboardLayout role="staff"><div className="p-8">Loading...</div></DashboardLayout>;
  if (!app) return null;

  return (
    <DashboardLayout role="staff">
      <Link to="/staff/appointments" className="inline-flex items-center text-sm font-medium text-text-muted hover:text-primary-purple mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Schedule
      </Link>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <span className="text-xs font-mono font-bold text-text-muted block mb-1">{app.appointment_number}</span>
            <h1 className="text-2xl font-semibold text-text-primary">{app.service_name_snapshot}</h1>
          </div>
          <StatusBadge status={app.status} />
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-8">
            <section>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-4">Customer Details</h3>
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                <div className="flex items-center font-medium text-lg">
                  <User className="w-5 h-5 mr-2 text-primary-purple" /> {app.customer_name_snapshot}
                </div>
                {app.customer_contact_snapshot && (
                  <div className="flex items-center text-text-muted">
                    <Phone className="w-4 h-4 mr-2" /> {app.customer_contact_snapshot}
                  </div>
                )}
                {app.customer_notes && (
                  <div className="pt-4 border-t border-gray-200">
                    <span className="text-xs font-bold text-text-muted uppercase mb-1 block">Customer Notes</span>
                    <p className="text-sm">{app.customer_notes}</p>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-4">Location</h3>
              <div className="bg-lavender/30 rounded-2xl p-5 border border-primary-purple/10">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 mr-3 mt-0.5 text-primary-deep shrink-0" />
                  <div>
                    <p className="font-medium text-text-primary mb-1">{app.service_address}</p>
                    {app.address_notes && <p className="text-sm text-primary-deep mt-2">Note: {app.address_notes}</p>}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-4">Schedule</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <span className="block text-xs font-semibold text-text-muted uppercase mb-1">Date</span>
                  <div className="flex items-center font-medium"><Calendar className="w-4 h-4 mr-2 text-primary-purple" /> {formatDate(app.appointment_date)}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <span className="block text-xs font-semibold text-text-muted uppercase mb-1">Time</span>
                  <div className="flex items-center font-medium"><Clock className="w-4 h-4 mr-2 text-primary-purple" /> {formatTime(app.start_time)} – {formatTime(app.end_time)}</div>
                </div>
              </div>
              <p className="text-sm text-text-muted mt-2">Expected duration: {app.service_duration_minutes_snapshot} minutes</p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-4">Downpayment</h3>
              <div className={`p-4 rounded-xl border ${app.payment_summary?.payment_state === 'paid' || app.payment_summary?.payment_state === 'partially_paid' ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                <p className="font-bold text-sm text-center">
                  {(app.payment_summary?.payment_state === 'paid' || app.payment_summary?.payment_state === 'partially_paid') ? 'Verified' : 'Not Verified'}
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-4">Actions</h3>
              <div className="space-y-3">
                {app.status === 'pending' && (
                  <button 
                    onClick={() => updateStatus('confirmed')} 
                    disabled={actionLoading || (app.payment_summary?.payment_state !== 'paid' && app.payment_summary?.payment_state !== 'partially_paid')} 
                    className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm Appointment
                  </button>
                )}
                {app.status === 'confirmed' && (
                  <button onClick={() => updateStatus('in_progress')} disabled={actionLoading} className="btn-primary w-full">
                    Start Service
                  </button>
                )}
                {app.status === 'in_progress' && (
                  <button onClick={() => updateStatus('completed')} disabled={actionLoading} className="w-full min-h-11 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50">
                    Mark Completed
                  </button>
                )}
                {['completed', 'cancelled'].includes(app.status) && (
                  <div className="p-4 bg-gray-50 rounded-xl text-center text-sm font-medium text-text-muted">
                    No actions available for {app.status} appointment.
                  </div>
                )}
              </div>
            </section>
            
            <StaffAppointmentUsage appointmentId={id} status={app.status} usages={usages} loadApp={loadApp} />
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default StaffAppointmentDetail;
