import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { formatMoney, formatDuration, formatDate, formatTime, formatDateTime, getTodayDateString } from '../../../utils/formatters';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { StatusBadge, PaymentStatusBadge } from './CustomerAppointments';
import { ArrowLeft, Calendar, Clock, MapPin, User, AlertCircle, UploadCloud, Scissors, Star, X, Phone, Mail } from 'lucide-react';
import PaymentSubmissionModal from './PaymentSubmissionModal';
import { useAppDialog } from '../../../context/AppDialogContext';

const CustomerAppointmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  // Rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [stylistRating, setStylistRating] = useState(5);
  const [shopRating, setShopRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [ratingError, setRatingError] = useState('');

  // Reschedule modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleLoadingSlots, setRescheduleLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');
  
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
      if (res.ok) {
        const data = (await res.json()).data;
        setApp(data);
        if (data.review) {
          setStylistRating(data.review.stylist_rating || data.review.rating || 5);
          setShopRating(data.review.shop_rating || data.review.rating || 5);
          setReviewComment(data.review.comment || '');
        }
      } else {
        navigate('/account/appointments');
      }
    } catch(e) {} finally { setLoading(false); }
  };

  const loadPaymentHistory = async () => {
    try {
      const res = await fetchApi(`/customer/appointments/${id}/payments`);
      if (res.ok) setPaymentHistory((await res.json()).data.history);
    } catch (e) {}
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim() || cancelReason.trim().length < 3) {
      setCancelError('Please enter a cancellation reason (minimum 3 characters).');
      return;
    }

    setCancelling(true);
    setCancelError('');
    try {
      const res = await fetchApi(`/customer/appointments/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason.trim() })
      });
      if (res.ok) {
        setShowCancelModal(false);
        setCancelReason('');
        loadApp();
      } else {
        const err = await res.json();
        setCancelError(err.message || 'The appointment could not be cancelled.');
      }
    } catch (e) {
      setCancelError('A network error occurred while cancelling the appointment.');
    } finally {
      setCancelling(false);
    }
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    setRatingSubmitting(true);
    setRatingError('');
    try {
      const res = await fetchApi(`/customer/appointments/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          stylist_rating: stylistRating,
          shop_rating: shopRating,
          comment: reviewComment.trim() || null
        })
      });
      if (res.ok) {
        setShowRatingModal(false);
        loadApp();
      } else {
        const err = await res.json();
        setRatingError(err.message || 'Failed to submit review.');
      }
    } catch (e) {
      setRatingError('Network error while submitting rating.');
    } finally {
      setRatingSubmitting(false);
    }
  };

  useEffect(() => {
    if (!showRescheduleModal || !app || !rescheduleDate) return;
    loadRescheduleSlots();
  }, [showRescheduleModal, rescheduleDate]);

  const loadRescheduleSlots = async () => {
    setRescheduleLoadingSlots(true);
    setRescheduleError('');
    setRescheduleTime('');
    try {
      const res = await fetchApi(
        `/booking/availability?staff_id=${app.staff_user_id}&date=${rescheduleDate}&service_id=${app.service_id}&ignore_appointment_id=${app.id}`
      );
      if (res.ok) {
        const json = await res.json();
        setRescheduleSlots(json.data?.slots || []);
      } else {
        setRescheduleSlots([]);
      }
    } catch {
      setRescheduleSlots([]);
    } finally {
      setRescheduleLoadingSlots(false);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleTime) {
      setRescheduleError('Please select a time slot.');
      return;
    }
    setRescheduling(true);
    setRescheduleError('');
    try {
      const res = await fetchApi(`/customer/appointments/${id}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify({
          date: rescheduleDate,
          start_time: rescheduleTime
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowRescheduleModal(false);
        await messageDialog('Your appointment has been successfully rescheduled.');
        loadApp();
      } else {
        setRescheduleError(data.message || 'Could not reschedule appointment.');
      }
    } catch {
      setRescheduleError('A network error occurred. Please try again.');
    } finally {
      setRescheduling(false);
    }
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

                {/* Multi-service breakdown if applicable */}
                {app.additional_services && Array.isArray(app.additional_services) && app.additional_services.length > 0 && (
                  <div className="mb-4 rounded-xl bg-white/70 p-3 border border-purple-100">
                    <p className="text-xs font-bold text-primary-deep uppercase mb-2">Booked Service Treatments ({app.additional_services.length + 1})</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span>{app.service_name_snapshot} (Primary)</span>
                      </div>
                      {app.additional_services.map((extra, idx) => (
                        <div key={idx} className="flex justify-between text-text-muted">
                          <span>+ {extra.name}</span>
                          <span>{formatDuration(extra.duration_minutes)} · {formatMoney(extra.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {app.extended_minutes > 0 && (
                  <div className="mb-4 inline-flex items-center gap-1.5 rounded-lg bg-purple-100/70 px-2.5 py-1 text-xs font-semibold text-primary-deep">
                    <Clock className="w-3.5 h-3.5" />
                    Extended buffer: +{app.extended_minutes} mins
                  </div>
                )}

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
                    <span className="text-text-muted">Total Service Price</span>
                    <span className="font-medium text-text-primary">{formatMoney(app.service_price_snapshot)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Required Downpayment (30%)</span>
                    <span className="font-medium text-text-primary">{formatMoney(app.payment_summary?.required_downpayment)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Verified Payment</span>
                    <span className="font-bold text-green-600">{formatMoney(app.payment_summary?.verified_amount)}</span>
                  </div>
                  {parseFloat(app.payment_summary?.remaining_required_downpayment || 0) > 0 && (
                    <div className="flex justify-between text-sm text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      <span className="font-medium">Downpayment Due:</span>
                      <span className="font-bold">{formatMoney(app.payment_summary?.remaining_required_downpayment)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-3 border-t border-gray-100">
                    <span className="font-bold">Remaining Balance</span>
                    <span className="font-bold text-primary-deep text-base">
                      {formatMoney(app.payment_summary?.remaining_balance ?? Math.max(0, parseFloat(app.service_price_snapshot || 0) - parseFloat(app.payment_summary?.verified_amount || 0)))}
                    </span>
                  </div>
                </div>

                {!['completed', 'cancelled'].includes(app.status) && app.payment_summary?.payment_state === 'unpaid' && (
                  <button onClick={() => setShowPaymentModal(true)} className="w-full flex items-center justify-center py-3 bg-primary-purple text-white font-bold rounded-xl hover:bg-primary-deep transition-colors shadow-sm">
                    <UploadCloud className="w-5 h-5 mr-2" /> Submit Downpayment
                  </button>
                )}

                {app.payment_summary?.payment_state === 'pending_verification' && (
                  <div className="bg-orange-50 text-orange-800 text-sm p-4 rounded-xl text-center font-medium border border-orange-100">
                    <p className="font-bold">Payment Under Review</p>
                    <p className="text-xs text-orange-700 mt-1">Our administrator is reviewing your payment proof. For urgent assistance, contact <a href="mailto:support@poiseathome.com" className="font-bold underline">support@poiseathome.com</a> or <a href="tel:+639171234567" className="font-bold underline">+63 917 123 4567</a>.</p>
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
                        <p className="text-xs text-red-700 mt-2">Questions? Contact Salon Support at <a href="mailto:support@poiseathome.com" className="font-bold underline">support@poiseathome.com</a> or call <a href="tel:+639171234567" className="font-bold underline">+63 917 123 4567</a>.</p>
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

            {/* Sir Jasz: Completed appointment rating */}
            {app.status === 'completed' && (
              <section>
                <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-4">Service Rating & Feedback</h3>
                <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-5">
                  {app.review ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-green-700 bg-green-100 px-2 py-0.5 rounded">
                          Review Submitted
                        </span>
                        <button 
                          onClick={() => setShowRatingModal(true)} 
                          className="text-xs font-bold text-primary-purple hover:underline"
                        >
                          Edit Review
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                        <div className="bg-white p-3 rounded-xl border border-purple-100">
                          <p className="text-text-muted mb-1 font-medium">Stylist Service</p>
                          <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span>{app.review.stylist_rating || app.review.rating || 5} / 5</span>
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-purple-100">
                          <p className="text-text-muted mb-1 font-medium">Salon Experience</p>
                          <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span>{app.review.shop_rating || app.review.rating || 5} / 5</span>
                          </div>
                        </div>
                      </div>

                      {app.review.comment && (
                        <p className="text-xs text-text-primary italic bg-white p-3 rounded-xl border border-purple-100">
                          "{app.review.comment}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-text-primary">How was your service?</p>
                      <p className="text-xs text-text-muted mt-1 mb-4">
                        Please take a moment to rate your hairstylist's work and your experience with Poise Hair Center.
                      </p>
                      <button 
                        onClick={() => setShowRatingModal(true)}
                        className="btn-primary w-full text-sm flex items-center justify-center gap-2"
                      >
                        <Star className="w-4 h-4 fill-white" /> Rate Stylist & Salon
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}

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
                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      setRescheduleDate(app.appointment_date);
                      setRescheduleTime('');
                      setRescheduleError('');
                      setShowRescheduleModal(true);
                    }}
                    className="w-full py-3 bg-lavender border-2 border-primary-purple/30 text-primary-deep font-bold rounded-xl hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-primary-purple" /> Reschedule Appointment
                  </button>
                  <button 
                    onClick={() => {
                      setCancelError('');
                      setShowCancelModal(true);
                    }}
                    className="w-full py-3 bg-white border-2 border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors"
                  >
                    Cancel Appointment
                  </button>
                  {app.payment_summary?.verified_amount > 0 && (
                    <p className="text-xs text-text-muted text-center">Verified payment exists. Your payment stays securely assigned to your appointment when rescheduling.</p>
                  )}
                </div>
              </section>
            )}

            {/* Salon Administrator Support */}
            <section>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-3">Salon Administrator Support</h3>
              <div className="rounded-2xl border border-purple-100 bg-lavender/35 p-5 space-y-3">
                <p className="text-xs text-text-muted leading-relaxed">
                  Have questions about payments, schedule modifications, or service location? Our administrators are here to help.
                </p>
                <div className="space-y-2 pt-2 border-t border-purple-100 text-xs">
                  <div className="flex items-center gap-2 text-text-primary">
                    <Phone className="w-4 h-4 text-primary-purple shrink-0" />
                    <span>Hotline: <a href="tel:+639171234567" className="font-bold text-primary-deep hover:underline">+63 917 123 4567</a> / (02) 8123-4567</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-primary">
                    <Mail className="w-4 h-4 text-primary-purple shrink-0" />
                    <span>Email: <a href="mailto:support@poiseathome.com" className="font-bold text-primary-deep hover:underline">support@poiseathome.com</a></span>
                  </div>
                  <div className="flex items-center gap-2 text-text-muted">
                    <Clock className="w-4 h-4 text-primary-purple shrink-0" />
                    <span>Available: Mon – Sun, 8:00 AM – 7:00 PM</span>
                  </div>
                </div>
              </div>
            </section>

          </div>

        </div>
      </div>

      {/* Maam Jessa: Required Cancellation Reason Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-xl text-red-600">Cancel Appointment</h3>
                <p className="text-xs text-text-muted mt-1">{app.appointment_number} • {app.service_name_snapshot}</p>
              </div>
              <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600">
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
                  placeholder="Please state why you need to cancel this appointment..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <p className="text-[11px] text-text-muted mt-1">Minimum 3 characters required. This reason will be notified to the salon admin and stylist.</p>
              </div>

              {cancelError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                  {cancelError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setShowCancelModal(false)} 
                  className="btn-ghost text-sm"
                >
                  Keep Appointment
                </button>
                <button 
                  type="submit" 
                  disabled={cancelling || cancelReason.trim().length < 3} 
                  className="btn-danger text-sm disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sir Jasz: Staff & Shop Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-purple-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-xl text-text-primary">Rate Your Experience</h3>
                <p className="text-xs text-text-muted mt-1">{app.service_name_snapshot} with {app.staff?.profile?.display_name || app.staff?.name}</p>
              </div>
              <button onClick={() => setShowRatingModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRatingSubmit} className="space-y-5">
              {/* Category 1: Stylist Service */}
              <div>
                <label className="block text-xs font-bold text-text-primary uppercase mb-1">
                  1. Stylist Service ({app.staff?.profile?.display_name || 'Hairstylist'}) *
                </label>
                <p className="text-[11px] text-text-muted mb-2">Skill, attentiveness, and quality of hair styling</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setStylistRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-7 h-7 ${star <= stylistRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                  <span className="text-sm font-bold text-primary-purple self-center ml-2">{stylistRating} / 5</span>
                </div>
              </div>

              {/* Category 2: Shop & Experience */}
              <div>
                <label className="block text-xs font-bold text-text-primary uppercase mb-1">
                  2. Salon Service & Poise Experience *
                </label>
                <p className="text-[11px] text-text-muted mb-2">Booking experience, communication, punctuality, and overall satisfaction</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setShopRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-7 h-7 ${star <= shopRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                  <span className="text-sm font-bold text-primary-purple self-center ml-2">{shopRating} / 5</span>
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                  Comments & Feedback (Optional)
                </label>
                <textarea 
                  rows="3"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Share details of your experience with the stylist and the salon..."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              {ratingError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                  {ratingError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button 
                  type="button" 
                  onClick={() => setShowRatingModal(false)} 
                  className="btn-ghost text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={ratingSubmitting} 
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {ratingSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-xl text-primary-deep">Reschedule Appointment</h3>
                <p className="text-xs text-text-muted mt-1">{app.appointment_number} • {app.service_name_snapshot}</p>
              </div>
              <button onClick={() => setShowRescheduleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-purple-50/60 rounded-xl text-xs space-y-1">
              <p><span className="text-text-muted">Current:</span> <span className="font-bold text-text-primary">{formatDate(app.appointment_date)} at {formatTime(app.start_time)}</span></p>
              <p><span className="text-text-muted">Stylist:</span> <span className="font-bold text-text-primary">{app.staff?.profile?.display_name || app.staff?.name}</span></p>
              <p><span className="text-text-muted">Duration:</span> <span className="font-semibold text-text-primary">{app.service_duration_minutes_snapshot} mins</span></p>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-primary uppercase mb-1">
                  Select New Date *
                </label>
                <input 
                  type="date"
                  min={getTodayDateString()}
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary uppercase mb-1">
                  Available Start Time *
                </label>
                {rescheduleLoadingSlots ? (
                  <p className="text-xs text-text-muted py-2">Loading available slots...</p>
                ) : rescheduleSlots.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    No available time slots on this date for {app.staff?.profile?.display_name || app.staff?.name}. Please pick another date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto p-1">
                    {rescheduleSlots.map(slot => (
                      <button
                        key={slot.start}
                        type="button"
                        onClick={() => setRescheduleTime(slot.start)}
                        className={`py-2 px-2 text-xs font-bold rounded-lg border transition-colors ${
                          rescheduleTime === slot.start
                            ? 'bg-primary-purple text-white border-primary-purple shadow-sm'
                            : 'bg-white text-text-primary border-gray-200 hover:border-primary-purple'
                        }`}
                      >
                        {slot.start}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {rescheduleError && (
                <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  {rescheduleError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onClick={() => setShowRescheduleModal(false)} className="btn-ghost text-sm">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={rescheduling || !rescheduleTime} 
                  className="btn-primary text-sm flex items-center gap-1.5"
                >
                  {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
