import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { StatusBadge } from '../../customer/appointments/CustomerAppointments';
import { ArrowLeft, User } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';
import { useAppDialog } from '../../../context/AppDialogContext';

const AdminAppointmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [qualifiedStaff, setQualifiedStaff] = useState([]);
  const [usages, setUsages] = useState([]);
  const [reassigning, setReassigning] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const { confirmDialog, messageDialog } = useAppDialog();

  useEffect(() => {
    loadApp();
  }, [id]);

  const loadApp = async () => {
    setLoading(true);
    try {
      const [appRes, uRes] = await Promise.all([
        fetchApi(`/admin/appointments/${id}`),
        fetchApi(`/admin/appointments/${id}/product-usages`)
      ]);
      if (appRes.ok) {
        const data = (await appRes.json()).data;
        setApp(data);
        if (['pending', 'confirmed'].includes(data.status)) {
          loadQualifiedStaff(data.service_id);
        }
      } else {
        navigate('/admin/appointments');
      }
      if (uRes.ok) {
        setUsages((await uRes.json()).data);
      }
    } catch(e) {} finally { setLoading(false); }
  };

  const reverseUsage = async (usageId) => {
    if (!await confirmDialog('Reverse this product usage and restore its inventory quantity?', { title: 'Reverse product usage', confirmLabel: 'Reverse usage', tone: 'danger' })) return;
    try {
      const res = await fetchApi(`/admin/appointments/${id}/product-usages/${usageId}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Admin reversed' })
      });
      if (res.ok) loadApp();
      else await messageDialog((await res.json()).message || 'The product usage could not be reversed.');
    } catch(e) {}
  };

  const loadQualifiedStaff = async (serviceId) => {
    try {
      const res = await fetchApi(`/admin/services/${serviceId}/staff`);
      if (res.ok) setQualifiedStaff((await res.json()).data);
    } catch (e) {}
  };

  const updateStatus = async (newStatus) => {
    if (!await confirmDialog(`Mark this appointment as ${newStatus.replace('_', ' ')}?`, { title: 'Update appointment status', confirmLabel: 'Update status' })) return;
    try {
      const res = await fetchApi(`/admin/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) loadApp();
    } catch(e) {}
  };

  const cancelAppointment = async () => {
    try {
      const res = await fetchApi(`/admin/appointments/${id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: cancelReason.trim() || 'Cancelled by admin' })
      });
      if (res.ok) { setCancelling(false); setCancelReason(''); loadApp(); }
      else await messageDialog((await res.json()).message || 'The appointment could not be cancelled.');
    } catch(e) {}
  };

  const reassignStaff = async (staffId) => {
    if (!await confirmDialog('Assign this appointment to the selected staff member?', { title: 'Reassign appointment', confirmLabel: 'Reassign' })) { setReassigning(false); return; }
    try {
      const res = await fetchApi(`/admin/appointments/${id}/staff`, {
        method: 'PATCH',
        body: JSON.stringify({ staff_id: staffId })
      });
      if (res.ok) {
        loadApp();
        setReassigning(false);
      } else {
        const err = await res.json();
        await messageDialog(err.message || 'The appointment could not be reassigned.');
      }
    } catch(e) {}
  };

  if (loading) return <DashboardLayout role="admin"><div className="p-8">Loading...</div></DashboardLayout>;
  if (!app) return null;

  return (
    <DashboardLayout role="admin">
      <Link to="/admin/appointments" className="inline-flex items-center text-sm font-medium text-text-muted hover:text-primary-purple mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Appointments
      </Link>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <span className="text-xs font-mono font-bold text-text-muted block mb-1">{app.appointment_number}</span>
            <h1 className="text-2xl font-bold text-text-primary">{app.service_name_snapshot}</h1>
          </div>
          <StatusBadge status={app.status} />
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-2">Customer & Service</h3>
              <div className="bg-gray-50 p-4 rounded-xl text-sm space-y-2 border border-gray-100">
                <p><span className="font-semibold w-24 inline-block">Customer:</span> {app.customer_name_snapshot}</p>
                <p><span className="font-semibold w-24 inline-block">Contact:</span> {app.customer_contact_snapshot || 'N/A'}</p>
                <p><span className="font-semibold w-24 inline-block">Service ID:</span> {app.service_id}</p>
                <p><span className="font-semibold w-24 inline-block">Price:</span> {formatMoney(app.service_price_snapshot)}</p>
                <p><span className="font-semibold w-24 inline-block">Duration:</span> {app.service_duration_minutes_snapshot} min</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-2">Downpayment</h3>
              <div className="bg-white p-4 rounded-xl text-sm space-y-3 border-2 border-primary-purple/10">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Required (30%):</span>
                  <span className="font-medium">{formatMoney(app.payment_summary?.required_downpayment)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Verified:</span>
                  <span className="font-bold text-green-600">{formatMoney(app.payment_summary?.verified_amount)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="font-semibold">Status:</span>
                  <span className="font-bold uppercase text-xs tracking-wider text-primary-deep">{app.payment_summary?.payment_state.replace('_', ' ')}</span>
                </div>
                <Link to={`/admin/payments?status=`} className="block mt-2 w-full text-center py-2 bg-gray-50 hover:bg-gray-100 text-primary-purple font-medium rounded-lg transition-colors border border-gray-200">
                  View Payment Queue
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-2">Schedule & Location</h3>
              <div className="bg-gray-50 p-4 rounded-xl text-sm space-y-2 border border-gray-100">
                <p><span className="font-semibold w-24 inline-block">Date:</span> {app.appointment_date}</p>
                <p><span className="font-semibold w-24 inline-block">Time:</span> {app.start_time} - {app.end_time}</p>
                <p><span className="font-semibold w-24 inline-block">Address:</span> {app.service_address}</p>
                {app.address_notes && <p><span className="font-semibold w-24 inline-block">Addr Note:</span> {app.address_notes}</p>}
                {app.customer_notes && <p><span className="font-semibold w-24 inline-block">Cust Note:</span> {app.customer_notes}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-2 flex justify-between items-center">
                Assigned Staff
                {!['completed', 'cancelled'].includes(app.status) && (
                  <button onClick={() => setReassigning(!reassigning)} className="text-xs text-blue-600 font-medium hover:underline">
                    {reassigning ? 'Cancel Reassign' : 'Reassign'}
                  </button>
                )}
              </h3>
              
              {!reassigning ? (
                <div className="flex items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-lavender flex items-center justify-center mr-3 shrink-0">
                    <User className="w-5 h-5 text-primary-deep" />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary">{app.staff?.profile?.display_name || app.staff?.name}</p>
                    <p className="text-xs text-text-muted">ID: {app.staff_user_id}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs font-semibold text-blue-800 mb-3 uppercase">Select New Staff:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {qualifiedStaff.filter(s => s.id !== app.staff_user_id).map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => reassignStaff(s.id)}
                        className="w-full text-left p-2 bg-white rounded border border-blue-200 hover:border-blue-400 text-sm font-medium"
                      >
                        {s.name}
                      </button>
                    ))}
                    {qualifiedStaff.filter(s => s.id !== app.staff_user_id).length === 0 && (
                      <p className="text-sm text-text-muted">No other qualified staff available.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-2">Admin Actions</h3>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-wrap gap-2">
                {app.status === 'pending' && <button onClick={() => updateStatus('confirmed')} disabled={app.payment_summary?.payment_state !== 'paid' && app.payment_summary?.payment_state !== 'partially_paid'} className="px-4 py-2 bg-blue-100 text-blue-700 text-sm font-bold rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">Confirm</button>}
                {app.status === 'confirmed' && <button onClick={() => updateStatus('in_progress')} className="px-4 py-2 bg-purple-100 text-purple-700 text-sm font-bold rounded-lg hover:bg-purple-200">Start Service</button>}
                {app.status === 'in_progress' && <button onClick={() => updateStatus('completed')} className="px-4 py-2 bg-green-100 text-green-700 text-sm font-bold rounded-lg hover:bg-green-200">Complete</button>}
                {!['completed', 'cancelled'].includes(app.status) && (
                  <button onClick={() => setCancelling(true)} className="px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-bold rounded-lg hover:bg-red-50 ml-auto">Cancel Appointment</button>
                )}
                {['completed', 'cancelled'].includes(app.status) && <p className="text-sm text-text-muted">No actions available.</p>}
              </div>
              {cancelling && <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-4"><label className="block text-sm font-semibold text-red-900">Cancellation reason</label><textarea value={cancelReason} onChange={event => setCancelReason(event.target.value)} rows="3" className="mt-2 w-full bg-white p-3" placeholder="Explain why this appointment is being cancelled" /><div className="mt-3 flex justify-end gap-2"><button onClick={() => { setCancelling(false); setCancelReason(''); }} className="btn-outline">Keep appointment</button><button onClick={cancelAppointment} className="btn-primary bg-red-700 hover:bg-red-800">Confirm cancellation</button></div></div>}
            </div>

            <div>
              <h3 className="text-sm font-bold text-primary-purple uppercase tracking-wider mb-2">Products Used</h3>
              <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="p-3 font-semibold text-text-muted text-xs">Product</th>
                      <th className="p-3 font-semibold text-text-muted text-xs text-right">Qty</th>
                      <th className="p-3 font-semibold text-text-muted text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {usages.map(u => (
                      <tr key={u.id} className={u.reversed_at ? 'opacity-50' : ''}>
                        <td className="p-3">
                          <p className="font-bold">{u.product?.name}</p>
                          <p className="text-[10px] text-text-muted">Recorded by {u.recorder?.name}</p>
                        </td>
                        <td className="p-3 text-right font-mono">
                          {parseFloat(u.quantity)} <span className="text-xs">{u.product?.unit}</span>
                        </td>
                        <td className="p-3">
                          {u.reversed_at ? (
                            <span className="text-[10px] font-bold text-red-600 uppercase bg-red-50 px-2 py-1 rounded">Reversed</span>
                          ) : (
                            <span className="text-[10px] font-bold text-green-600 uppercase bg-green-50 px-2 py-1 rounded">Applied</span>
                          )}
                          {!u.reversed_at && (
                            <button onClick={() => reverseUsage(u.id)} className="block mt-1 text-[10px] text-red-600 hover:underline">Reverse</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {usages.length === 0 && (
                      <tr><td colSpan="3" className="p-4 text-center text-text-muted text-xs">No products recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminAppointmentDetail;
