import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { formatMoney, formatDuration, formatDate, formatTime, formatDateTime } from '../../../utils/formatters';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { StatusBadge, PaymentStatusBadge } from './CustomerAppointments';
import { ArrowLeft, Calendar, Clock, MapPin, User, AlertCircle, UploadCloud, Scissors } from 'lucide-react';
import PaymentSubmissionModal from './PaymentSubmissionModal';
import { useAppDialog } from '../../../context/AppDialogContext';

const CustomerAppointmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const { confirmDialog, messageDialog } = useAppDialog();

  useEffect(() => {
    loadApp();
    loadPaymentHistory();
  }, [id]);

  const loadApp = async () => {
    try {
      const res = await fetchApi(`/customer/appointments/${id}`);
      if (res.ok) setApp((await res.json()).data);
      else navigate('/account/appointments');
    } catch(e) {} finally { setLoading(false); }
  };

  const loadPaymentHistory = async () => {
    try {
      const res = await fetchApi(`/customer/appointments/${id}/payments`);
      if (res.ok) setPaymentHistory((await res.json()).data.history);
    } catch (e) {}
  };

  const handleCancel = async () => {
    if (!await confirmDialog('Cancel this appointment? This may affect its payment and scheduling status.', { title: 'Cancel appointment', confirmLabel: 'Cancel appointment', tone: 'danger' })) return;
    setCancelling(true);
    try {
      const res = await fetchApi(`/customer/appointments/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason || 'Customer requested cancellation' })
      });
      if (res.ok) {
        loadApp();
        setCancelReason('');
      } else {
        await messageDialog('The appointment could not be cancelled.');
      }
    } catch (e) {} finally { setCancelling(false); }
  };

  if (loading) return <DashboardLayout role="customer"><div className="p-8">Loading...</div></DashboardLayout>;
  if (!app) return null;

  return (
    <DashboardLayout role="customer">
      <Link to="/account/appointments" className="mb-6 inline-flex items-center text-sm font-medium text-text-muted transition-colors hover:text-primary-purple">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Appointments
      </Link>

      <div className="overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm">
        {/* Header */}
        <div className="relative flex flex-col justify-between gap-5 overflow-hidden bg-[#301837] p-6 text-white md:flex-row md:items-center md:p-8"><div className="absolute -right-12 -top-20 h-52 w-52 rounded-full bg-fuchsia-500/25 blur-3xl" />
          <div className="relative flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15"><Scissors className="h-5 w-5 text-fuchsia-200" /></span><div>
            <p className="text-xs font-bold uppercase tracking-[.15em] text-fuchsia-200">Appointment details</p><h1 className="mt-1 text-2xl font-bold">{app.service_name_snapshot}</h1>
            <p className="mt-1 font-mono text-sm text-white/60">{app.appointment_number}</p></div>
          </div>
          <div className="relative flex flex-wrap items-center gap-2 md:justify-end">
            <StatusBadge status={app.status} />
            {app.payment_summary && <PaymentStatusBadge state={app.payment_summary.payment_state} />}
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 gap-8 p-6 md:grid-cols-2 md:p-8">
          
          <div className="space-y-8">
            <section>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-4">Service Information</h3>
              <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-lavender/65 to-white p-5">
                <p className="font-bold text-lg text-text-primary mb-1">{app.service_name_snapshot}</p>
                <div className="flex items-center text-sm text-text-muted mb-4">
                  <User className="w-4 h-4 mr-1.5" /> with {app.staff?.profile?.display_name || app.staff?.name}
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="text-sm font-medium text-text-muted">{formatDuration(app.service_duration_minutes_snapshot)}</span>
                  <span className="font-bold text-primary-purple text-lg">{formatMoney(app.service_price_snapshot)}</span>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-4">Payment</h3>
              <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-[inset_4px_0_0_#9333ea]">
                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Required Downpayment (30%)</span>
                    <span className="font-medium text-text-primary">{formatMoney(app.payment_summary?.required_downpayment)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Verified Total</span>
                    <span className="font-bold text-green-600">{formatMoney(app.payment_summary?.verified_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-3 border-t border-gray-100">
                    <span className="font-bold">Remaining Balance</span>
                    <span className="font-bold text-text-primary">{formatMoney(app.payment_summary?.remaining_required_downpayment)}</span>
                  </div>
                </div>

                {!['completed', 'cancelled'].includes(app.status) && app.payment_summary?.payment_state === 'unpaid' && (
                  <button onClick={() => setShowPaymentModal(true)} className="w-full flex items-center justify-center py-3 bg-primary-purple text-white font-bold rounded-xl hover:bg-primary-deep transition-colors shadow-sm">
                    <UploadCloud className="w-5 h-5 mr-2" /> Submit Downpayment
                  </button>
                )}

                {app.payment_summary?.payment_state === 'pending_verification' && (
                  <div className="bg-orange-50 text-orange-800 text-sm p-4 rounded-xl text-center font-medium border border-orange-100">
                    Payment Under Review
                  </div>
                )}
                
                {app.payment_summary?.payment_state === 'partially_paid' && (
                  <div className="bg-green-50 text-green-800 text-sm p-4 rounded-xl text-center font-medium border border-green-100">
                    Downpayment Verified
                  </div>
                )}
              </div>

              {/* Rejected Payments Warning */}
              {paymentHistory.filter(p => p.status === 'rejected').length > 0 && (
                <div className="mt-4 space-y-2">
                  {paymentHistory.filter(p => p.status === 'rejected').map(rej => (
                    <div key={rej.id} className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-2 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-800">Payment Rejected ({formatDate(rej.submitted_at)})</p>
                        <p className="text-sm text-red-600 mt-1">Reason: {rej.rejection_reason}</p>
                      </div>
                    </div>
                  ))}
                  {app.payment_summary?.payment_state !== 'pending_verification' && app.payment_summary?.payment_state !== 'paid' && (
                    <button onClick={() => setShowPaymentModal(true)} className="w-full py-2 bg-white border border-red-200 text-red-600 font-bold rounded-xl text-sm hover:bg-red-50">
                      Submit New Proof
                    </button>
                  )}
                </div>
              )}
            </section>

          </div>

          <div className="space-y-8">
            <section>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-4">Schedule & Location</h3>
              <div className="space-y-3 rounded-2xl border border-gray-100 bg-background p-5">
                <div className="flex">
                  <div className="mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-deep shadow-sm">
                    <Calendar className="w-5 h-5 text-primary-deep" />
                  </div>
                  <div>
                    <p className="text-sm text-text-muted mb-0.5">Date</p>
                    <p className="font-semibold text-text-primary">{formatDate(app.appointment_date)}</p>
                  </div>
                </div>
                <div className="flex">
                  <div className="mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-deep shadow-sm">
                    <Clock className="w-5 h-5 text-primary-deep" />
                  </div>
                  <div>
                    <p className="text-sm text-text-muted mb-0.5">Time</p>
                    <p className="font-semibold text-text-primary">{formatTime(app.start_time)} – {formatTime(app.end_time)}</p>
                  </div>
                </div>
                <div className="flex">
                  <div className="mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-deep shadow-sm">
                    <MapPin className="w-5 h-5 text-primary-deep" />
                  </div>
                  <div>
                    <p className="text-sm text-text-muted mb-0.5">Home Service Address</p>
                    <p className="font-semibold text-text-primary">{app.service_address}</p>
                    {app.address_notes && <p className="text-sm text-text-muted mt-1">Note: {app.address_notes}</p>}
                  </div>
                </div>
              </div>
            </section>

             <section>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-4">Notes & Status</h3>
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                {app.customer_notes && (
                  <div>
                    <p className="text-xs font-semibold text-text-muted uppercase mb-1">Your Notes</p>
                    <p className="text-sm text-text-primary">{app.customer_notes}</p>
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
                <p className="text-xs text-text-muted pt-4 border-t border-gray-200">
                  Booked on {formatDateTime(app.created_at)}
                </p>
              </div>
            </section>

            {/* Actions */}
            {['pending', 'confirmed'].includes(app.status) && (
              <section>
                <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-4">Actions</h3>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    aria-label="Cancellation reason" placeholder="Cancellation reason (optional)" 
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <button 
                    disabled={cancelling}
                    onClick={handleCancel}
                    className="w-full py-3 bg-white border-2 border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Cancel Appointment
                  </button>
                  {app.payment_summary?.verified_amount > 0 && (
                    <p className="text-xs text-text-muted text-center">Verified payment exists. Refund handling requires manual administrative action if you cancel.</p>
                  )}
                </div>
              </section>
            )}

          </div>

        </div>
      </div>

      {showPaymentModal && (
        <PaymentSubmissionModal 
          appointment={app} 
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            loadApp();
            loadPaymentHistory();
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default CustomerAppointmentDetail;
