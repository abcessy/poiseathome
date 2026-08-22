import React, { useState, useEffect } from 'react';
import { fetchApi } from '../../../services/api';
import { formatMoney } from '../../../utils/formatters';
import { X, UploadCloud, FileText } from 'lucide-react';

const PaymentSubmissionModal = ({ appointment, onClose, onSuccess }) => {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    payment_method: '',
    amount: appointment.payment_summary?.remaining_required_downpayment || '',
    reference_number: '',
    proof: null
  });

  useEffect(() => {
    fetchApi('/customer/payment-methods')
      .then(res => res.json())
      .then(data => {
        setMethods(data.data);
        if (data.data.length > 0) {
          setForm(f => ({ ...f, payment_method: data.data[0].key }));
        }
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.proof) {
      setError('Please select a payment receipt/proof.');
      return;
    }

    setSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('payment_method', form.payment_method);
    formData.append('amount', form.amount);
    if (form.reference_number) formData.append('reference_number', form.reference_number);
    formData.append('proof', form.proof);

    try {
      const res = await fetchApi(`/customer/appointments/${appointment.id}/payments`, {
        method: 'POST',
        headers: {}, // FormData needs boundary auto-set
        body: formData,
      });
      
      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.message || 'Submission failed.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMethod = methods.find(m => m.key === form.payment_method);

  return (
    <div className="fixed bottom-0 left-0 right-0 top-16 z-20 overflow-y-auto bg-background md:left-64">
      <div className="form-surface mx-auto my-8 flex w-[calc(100%-2rem)] max-w-3xl flex-col rounded-2xl md:my-10">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div><h2 id="payment-modal-title" className="text-xl font-semibold">Submit downpayment proof</h2><p className="mt-1 text-sm text-text-muted">Payments are reviewed manually by the salon.</p></div>
          <button onClick={onClose} className="btn-ghost min-h-9 px-2" aria-label="Back to appointment"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? <div className="text-center text-text-muted py-4">Loading options...</div> : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="rounded-lg border border-primary-purple/15 bg-lavender/40 p-4 text-sm">
                <div className="flex justify-between gap-4"><span className="text-text-muted">Required downpayment</span><strong className="text-primary-deep">{formatMoney(appointment.payment_summary?.required_downpayment)}</strong></div>
                <div className="mt-2 flex justify-between gap-4"><span className="text-text-muted">Remaining required amount</span><strong>{formatMoney(appointment.payment_summary?.remaining_required_downpayment)}</strong></div>
              </div>

              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}

              <div>
                <label className="block text-sm font-semibold mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {methods.map(m => (
                    <button
                      type="button"
                      key={m.key}
                      onClick={() => setForm({...form, payment_method: m.key})}
                    className={`min-h-11 rounded-lg border px-4 py-2 text-sm font-medium ${form.payment_method === m.key ? 'border-primary-purple bg-primary-purple text-white' : 'border-gray-200 bg-white text-text-primary hover:border-primary-purple/50'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedMethod && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 font-mono text-sm space-y-1">
                  <p className="text-xs font-bold font-sans text-text-muted uppercase mb-2">Send Payment To:</p>
                  <p><span className="text-text-muted">Account Name:</span> {selectedMethod.account_name}</p>
                  <p><span className="text-text-muted">Account Number:</span> {selectedMethod.account_number}</p>
                  {selectedMethod.bank_name && <p><span className="text-text-muted">Bank:</span> {selectedMethod.bank_name}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold mb-2">Amount (₱)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    value={form.amount}
                    onChange={e => setForm({...form, amount: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-primary-purple focus:border-primary-purple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Reference Number</label>
                  <input 
                    type="text" 
                    value={form.reference_number}
                    onChange={e => setForm({...form, reference_number: e.target.value})}
                    placeholder="Optional"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-primary-purple focus:border-primary-purple"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Payment Receipt/Proof</label>
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5 text-center hover:border-primary-purple/50">
                  <input 
                    type="file" 
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={e => setForm({...form, proof: e.target.files[0]})}
                    className="hidden" 
                    id="proof-upload"
                  />
                  <label htmlFor="proof-upload" className="cursor-pointer flex flex-col items-center">
                    {form.proof ? (
                      form.proof.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(form.proof)} alt="Proof preview" className="h-32 object-contain mb-3 rounded shadow-sm" />
                      ) : (
                        <FileText className="w-12 h-12 text-primary-purple mb-3" />
                      )
                    ) : (
                      <UploadCloud className="w-12 h-12 text-gray-400 mb-3" />
                    )}
                    <span className="text-sm font-medium text-primary-purple">
                      {form.proof ? form.proof.name : 'Click to select a file'}
                    </span>
                    <span className="text-xs text-text-muted mt-1">JPEG, PNG, WebP, PDF (Max 5MB)</span>
                  </label>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting ? 'Submitting...' : 'Submit Payment for Verification'}
              </button>

            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSubmissionModal;
