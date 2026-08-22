import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { formatDateTime, formatMoney } from '../../../utils/formatters';
import { ArrowLeft, CheckCircle, XCircle, FileText, Download } from 'lucide-react';
import { useAppDialog } from '../../../context/AppDialogContext';

const AdminPaymentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { confirmDialog, messageDialog } = useAppDialog();

  useEffect(() => {
    loadPayment();
  }, [id]);

  const loadPayment = async () => {
    try {
      const res = await fetchApi(`/admin/payments/${id}`);
      if (res.ok) setPayment((await res.json()).data);
      else navigate('/admin/payments');
    } catch(e) {} finally { setLoading(false); }
  };

  const handleApprove = async () => {
    if (!await confirmDialog('Verify this payment and apply it to the appointment?', { title: 'Verify payment', confirmLabel: 'Verify payment' })) return;
    setActionLoading(true);
    try {
      const res = await fetchApi(`/admin/payments/${id}/approve`, { method: 'PATCH' });
      if (res.ok) loadPayment();
      else await messageDialog('The payment could not be approved.');
    } catch (e) {} finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectReason) { await messageDialog('Enter a rejection reason before continuing.'); return; }
    setActionLoading(true);
    try {
      const res = await fetchApi(`/admin/payments/${id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectReason })
      });
      if (res.ok) {
        setRejecting(false);
        loadPayment();
      } else await messageDialog('The payment could not be rejected.');
    } catch (e) {} finally { setActionLoading(false); }
  };

  const handleDownloadProof = async () => {
    try {
      const res = await fetchApi(`/admin/payments/${id}/proof`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payment-proof-${id}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        await messageDialog('The payment proof could not be downloaded.');
      }
    } catch (e) {
      await messageDialog('An error occurred while downloading the payment proof.');
    }
  };

  if (loading) return <DashboardLayout role="admin"><div className="py-16 text-center text-sm text-text-muted">Loading payment review...</div></DashboardLayout>;
  if (!payment) return null;

  return (
    <DashboardLayout role="admin">
      <Link to="/admin/payments" className="inline-flex items-center text-sm font-medium text-text-muted hover:text-primary-purple mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Payments
      </Link>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <span className="mb-1 block font-mono text-xs text-text-muted">Payment #{payment.id}</span>
            <h1 className="page-title">Payment Review</h1>
          </div>
          <span className={`px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider ${
            payment.status === 'verified' ? 'bg-green-100 text-green-800' :
            payment.status === 'rejected' ? 'bg-red-100 text-red-800' :
            'bg-orange-100 text-orange-800'
          }`}>
            {payment.status.replace('_', ' ')}
          </span>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-6">
            <section>
              <h2 className="section-title mb-3">Appointment</h2>
              <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm">
                <p><span className="font-semibold text-text-muted w-32 inline-block">Appt Number:</span> <Link to={`/admin/appointments/${payment.appointment_id}`} className="text-primary-purple font-mono hover:underline">{payment.appointment.appointment_number}</Link></p>
                <p><span className="font-semibold text-text-muted w-32 inline-block">Customer:</span> {payment.appointment.customer_name_snapshot}</p>
                <p><span className="font-semibold text-text-muted w-32 inline-block">Service:</span> {payment.appointment.service_name_snapshot}</p>
                <div className="pt-3 border-t border-gray-200 mt-3 flex justify-between items-center">
                  <span className="font-semibold text-text-muted">Required Downpayment:</span>
                  <span className="font-bold">{formatMoney(payment.appointment.required_downpayment_amount)}</span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="section-title mb-3">Submission details</h2>
              <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 text-sm">
                <p><span className="font-semibold text-text-muted w-32 inline-block">Submitted Amount:</span> <span className="text-lg font-bold text-primary-deep">{formatMoney(payment.amount)}</span></p>
                <p><span className="font-semibold text-text-muted w-32 inline-block">Method:</span> <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span></p>
                <p><span className="font-semibold text-text-muted w-32 inline-block">Reference:</span> <span className="font-mono">{payment.reference_number || 'N/A'}</span></p>
                <p><span className="font-semibold text-text-muted w-32 inline-block">Submitted:</span> {formatDateTime(payment.submitted_at)}</p>
              </div>
            </section>

            {payment.status === 'pending_verification' && (
              <section>
                <h2 className="section-title mb-3">Review decision</h2>
                <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
                  {!rejecting ? (
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button onClick={handleApprove} disabled={actionLoading} className="btn-primary flex-1 !bg-green-700 hover:!bg-green-800">
                        <CheckCircle className="w-5 h-5 mr-2" /> {actionLoading ? 'Verifying...' : 'Verify payment'}
                      </button>
                      <button onClick={() => setRejecting(true)} disabled={actionLoading} className="btn-outline flex-1 !border-red-300 !text-red-700 hover:!bg-red-50">
                        <XCircle className="w-5 h-5 mr-2" /> Reject payment
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold">Rejection Reason</label>
                      <textarea 
                        rows="3"
                        className="w-full px-3 py-2 border rounded-xl focus:border-red-500 focus:ring-red-500 text-sm"
                        placeholder="e.g. Receipt is unreadable, amount does not match, etc."
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                      ></textarea>
                      <div className="flex gap-3">
                        <button onClick={handleReject} disabled={actionLoading} className="btn-danger flex-1">{actionLoading ? 'Rejecting...' : 'Confirm rejection'}</button>
                        <button onClick={() => setRejecting(false)} disabled={actionLoading} className="btn-secondary">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {payment.status === 'verified' && (
              <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                <div>
                  <p className="font-bold text-green-800">Payment Verified</p>
                  <p className="text-sm text-green-700">Verified by admin #{payment.verified_by} on {formatDateTime(payment.verified_at)}</p>
                </div>
              </div>
            )}

            {payment.status === 'rejected' && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start">
                <XCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                <div>
                  <p className="font-bold text-red-800">Payment Rejected</p>
                  <p className="text-sm text-red-700 mt-1">Reason: {payment.rejection_reason}</p>
                </div>
              </div>
            )}
          </div>

          <div>
             <section className="h-full flex flex-col">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="section-title">Payment proof</h2>
                <button onClick={handleDownloadProof} className="btn-ghost !min-h-9 !px-2 text-xs">
                  <Download className="w-4 h-4 mr-1" /> Secure Download
                </button>
              </div>
              <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-4 sm:min-h-[400px]">
                <ProofViewer paymentId={id} />
              </div>
            </section>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

const ProofViewer = ({ paymentId }) => {
  const [url, setUrl] = useState(null);
  const [contentType, setContentType] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl;
    const loadProof = async () => {
      try {
        const res = await fetchApi(`/admin/payments/${paymentId}/proof`);
        if (res.ok) {
          const blob = await res.blob();
          setContentType(blob.type);
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        } else setError(true);
      } catch (e) { setError(true); }
    };
    loadProof();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [paymentId]);

  if (error) return <div className="text-text-muted flex flex-col items-center"><FileText className="w-12 h-12 mb-2 text-gray-300"/>Proof not available or could not be loaded.</div>;
  if (!url) return <div className="text-text-muted">Loading secure proof preview...</div>;

  if (contentType === 'application/pdf') {
    return <object data={url} type="application/pdf" aria-label="Payment proof PDF" className="h-[520px] w-full rounded-lg border border-gray-200"><a href={url}>Open payment proof PDF</a></object>;
  }

  return <img src={url} alt="Customer-submitted payment proof" className="max-h-[600px] max-w-full rounded-lg object-contain" />;
};

export default AdminPaymentDetail;
