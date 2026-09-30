import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { StatusBadge } from '../../customer/appointments/CustomerAppointments';
import { Eye } from 'lucide-react';
import { formatDate, formatTime } from '../../../utils/formatters';

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    loadAppointments();
  }, [statusFilter, dateFilter]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      let url = '/admin/appointments?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (dateFilter) url += `date=${dateFilter}&`;
      
      const res = await fetchApi(url);
      if (res.ok) setAppointments((await res.json()).data);
    } catch(e) {} finally { setLoading(false); }
  };

  return (
    <DashboardLayout role="admin">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">Appointments</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Filter by Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-sm">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Filter by Date</label>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-sm" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-muted">Loading appointments...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Appointment</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Date & Time</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Customer</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Staff</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map(app => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <p className="font-mono text-xs font-bold text-text-muted">{app.appointment_number}</p>
                      <p className="font-semibold text-text-primary text-sm mt-0.5">{app.service_name_snapshot}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-medium">{formatDate(app.appointment_date)}</p>
                      <p className="text-xs text-text-muted mt-0.5">{formatTime(app.start_time)}</p>
                    </td>
                    <td className="p-4 text-sm font-medium">{app.customer_name_snapshot}</td>
                    <td className="p-4 text-sm">{app.staff?.profile?.display_name || app.staff?.name}</td>
                    <td className="p-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="p-4">
                      <Link to={`/admin/appointments/${app.id}`} className="p-2 text-text-muted hover:text-primary-purple bg-white rounded-lg border hover:border-primary-purple transition-colors inline-block">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {appointments.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-text-muted">No appointments found matching criteria.</td>
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

export default AdminAppointments;
