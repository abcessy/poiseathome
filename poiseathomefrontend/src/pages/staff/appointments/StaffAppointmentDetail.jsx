import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { StatusBadge } from '../../customer/appointments/CustomerAppointments';
import { ArrowLeft, Calendar, Clock, MapPin, User, Phone, X, AlertCircle } from 'lucide-react';
import { StaffAppointmentUsage } from './StaffAppointmentUsage';
import { formatDate, formatTime, formatMoney } from '../../../utils/formatters';
import { useAppDialog } from '../../../context/AppDialogContext';

const StaffAppointmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [usages, setUsages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Extend time state
  const [extending, setExtending] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(15);
  const [extendReason, setExtendReason] = useState('');
  const [extendLoading, setExtendLoading] = useState(false);

  // Cancellation state
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

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

  const handleExtendTime = async (e) => {
    e.preventDefault();
    setExtendLoading(true);
    try {
      const res = await fetchApi(`/staff/appointments/${id}/extend-time`, {
        method: 'POST',
        body: JSON.stringify({
          minutes: Number(extendMinutes),
          reason: extendReason.trim() || null
        })
      });
      if (res.ok) {
        setExtending(false);
        setExtendReason('');
        loadApp();
      } else {
        const err = await res.json();
        await messageDialog(err.message || 'Could not extend appointment duration.');
      }
    } catch (e) {
      await messageDialog('Network error while extending appointment duration.');
    } finally {
      setExtendLoading(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim() || cancelReason.trim().length < 3) {
      setCancelError('Please enter a cancellation reason (minimum 3 characters required).');
      return;
    }
    setCancelLoading(true);
    setCancelError('');
    try {
      const res = await fetchApi(`/staff/appointments/${id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: cancelReason.trim() })
      });
      if (res.ok) {
        setCancelling(false);
        setCancelReason('');
        loadApp();
      } else {
        const err = await res.json();
        setCancelError(err.message || 'The appointment could not be cancelled.');
      }
    } catch (e) {
      setCancelError('Network error while cancelling appointment.');
    } finally {
      setCancelLoading(false);
    }
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
                {app.status === 'cancelled' && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-800">Cancelled on {formatDate(app.cancelled_at)}</p>
                      <p className="text-sm text-red-600 mt-1">Reason: {app.cancellation_reason}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-4">Service Details</h3>
              <div className="bg-white rounded-2xl p-5 border border-purple-100 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-base text-text-primary">{app.service_name_snapshot}</h4>
                    <p className="text-xs text-text-muted">Primary treatment</p>
                  </div>
                  <span className="font-bold text-primary-purple">{formatMoney(app.service_price_snapshot)}</span>
                </div>

                {app.additional_services && Array.isArray(app.additional_services) && app.additional_services.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <p className="text-xs font-bold text-primary-deep uppercase">Additional Items ({app.additional_services.length})</p>
                    {app.additional_services.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-text-muted">
                        <span>+ {item.name}</span>
                        <span>{item.duration_minutes}m · {formatMoney(item.price)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {app.extended_minutes > 0 && (
                  <div className="pt-2 border-t border-gray-100 text-xs font-semibold text-primary-deep flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Extended buffer: +{app.extended_minutes} mins
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
              <p className="text-sm text-text-muted mt-2">Total duration: {app.service_duration_minutes_snapshot} minutes</p>
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

                {/* Sir Prado: Extend-Time Button */}
                {!['completed', 'cancelled'].includes(app.status) && (
                  <button 
                    onClick={() => setExtending(true)} 
                    className="w-full py-2.5 bg-purple-50 border border-purple-200 text-primary-deep font-bold text-sm rounded-xl hover:bg-purple-100 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Clock className="w-4 h-4" /> Extend Appointment Time
                  </button>
                )}

                {/* Maam Jessa: Cancellation Action */}
                {!['completed', 'cancelled'].includes(app.status) && (
                  <button 
                    onClick={() => { setCancelling(true); setCancelError(''); }} 
                    className="w-full py-2.5 bg-white border border-red-200 text-red-600 font-bold text-sm rounded-xl hover:bg-red-50 transition-colors"
                  >
                    Cancel Appointment
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

      {/* Sir Prado: Staff Extend Time Modal */}
      {extending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-xl text-text-primary">Extend Time</h3>
                <p className="text-xs text-text-muted mt-0.5">{app.appointment_number} • {app.service_name_snapshot}</p>
              </div>
              <button onClick={() => setExtending(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExtendTime} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">
                  Select Extra Minutes *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setExtendMinutes(mins)}
                      className={`py-2 rounded-lg text-xs font-bold transition ${extendMinutes === mins ? 'bg-primary-purple text-white shadow-sm' : 'bg-gray-50 border border-gray-200 text-text-primary hover:border-primary-purple'}`}
                    >
                      +{mins} min
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                  Reason for Extension (Optional)
                </label>
                <textarea 
                  rows="2"
                  value={extendReason}
                  onChange={e => setExtendReason(e.target.value)}
                  placeholder="e.g. Detailed styling requested by client, extra drying time..."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setExtending(false)} className="btn-ghost text-sm">Cancel</button>
                <button type="submit" disabled={extendLoading} className="btn-primary text-sm disabled:opacity-50">
                  {extendLoading ? 'Extending...' : 'Confirm Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Maam Jessa: Staff Cancellation Reason Modal */}
      {cancelling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-xl text-red-600">Cancel Appointment</h3>
                <p className="text-xs text-text-muted mt-0.5">{app.appointment_number} • {app.customer_name_snapshot}</p>
              </div>
              <button onClick={() => setCancelling(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-primary uppercase mb-1">
                  Reason for Cancellation (Required) *
                </label>
                <textarea 
                  required
                  rows="3"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Please enter the exact reason why this appointment is cancelled..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <p className="text-[11px] text-text-muted mt-1">Minimum 3 characters. This reason will be logged and sent to customer and salon admin.</p>
              </div>

              {cancelError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                  {cancelError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setCancelling(false)} className="btn-ghost text-sm">Keep Appointment</button>
                <button type="submit" disabled={cancelLoading || cancelReason.trim().length < 3} className="btn-danger text-sm disabled:opacity-50">
                  {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default StaffAppointmentDetail;
