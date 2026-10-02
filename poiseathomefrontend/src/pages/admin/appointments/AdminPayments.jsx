import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { formatDate, formatMoney } from '../../../utils/formatters';
import { Eye } from 'lucide-react';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending_verification');

  useEffect(() => {
    loadPayments();
  }, [statusFilter]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      let url = '/admin/payments?';
      if (statusFilter) url += `status=${statusFilter}`;
      
      const res = await fetchApi(url);
      if (res.ok) setPayments((await res.json()).data);
    } catch(e) {} finally { setLoading(false); }
  };

  const getStatusColor = (s) => {
    if (s === 'pending_verification') return 'bg-orange-100 text-orange-800';
    if (s === 'verified') return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">Payment Reviews</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {['pending_verification', 'verified', 'rejected', ''].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${statusFilter === status ? 'bg-primary-purple text-white' : 'bg-gray-50 text-text-muted hover:bg-gray-100 border border-gray-200'}`}
            >
              {status === '' ? 'All Payments' : status.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-muted">Loading payments...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Appt / Customer</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Method</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Amount</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map(pay => (
                  <tr key={pay.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm">{formatDate(pay.submitted_at)}</td>
                    <td className="p-4">
                      <Link to={`/admin/appointments/${pay.appointment_id}`} className="font-mono text-xs font-bold text-primary-purple hover:underline">{pay.appointment.appointment_number}</Link>
                      <p className="text-sm font-semibold mt-0.5">{pay.appointment.customer_name_snapshot}</p>
                    </td>
                    <td className="p-4 text-sm capitalize">{pay.payment_method.replace('_', ' ')}</td>
                    <td className="p-4 font-bold text-text-primary">{formatMoney(pay.amount)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${getStatusColor(pay.status)}`}>
                        {pay.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link to={`/admin/payments/${pay.id}`} className="p-2 text-text-muted hover:text-primary-purple bg-white rounded-lg border hover:border-primary-purple transition-colors inline-block">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-text-muted">No payments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminPayments;
