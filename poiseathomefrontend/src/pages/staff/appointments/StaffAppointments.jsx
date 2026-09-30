import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { StatusBadge } from '../../customer/appointments/CustomerAppointments';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { formatDate, formatTime } from '../../../utils/formatters';

const StaffAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today');

  useEffect(() => {
    loadAppointments();
  }, [filter]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      let url = '/staff/appointments';
      const today = new Date().toISOString().split('T')[0];
      
      if (filter === 'today') url += `?date=${today}&status=confirmed`;
      
      const res = await fetchApi(url);
      if (res.ok) {
        let all = (await res.json()).data;
        if (filter === 'upcoming') {
          all = all.filter(a => a.appointment_date >= today && !['completed', 'cancelled'].includes(a.status));
        } else if (filter === 'completed') {
          all = all.filter(a => a.status === 'completed');
        }
        setAppointments(all);
      }
    } catch (e) {} finally { setLoading(false); }
  };

  return (
    <DashboardLayout role="staff">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Schedule</h1>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-4 mb-6">
        {['today', 'upcoming', 'completed'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-4 py-2 font-medium rounded-full transition-colors ${filter === f ? 'bg-primary-purple text-white' : 'bg-white text-text-muted hover:bg-gray-50 border border-gray-200'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-muted">Loading schedule...</div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-primary mb-2">No Appointments</h3>
          <p className="text-text-muted">You have no {filter} appointments.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map(app => (
            <Link to={`/staff/appointments/${app.id}`} key={app.id} className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-primary-purple/50 transition-colors">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-lg text-text-primary mb-1">{app.customer_name_snapshot}</h3>
                  <span className="text-sm font-semibold text-primary-purple">{app.service_name_snapshot}</span>
                </div>
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                  <StatusBadge status={app.status} />
                  <span className="text-xs font-mono text-text-muted">{app.appointment_number}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-text-muted bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-primary-purple shrink-0" /> {formatDate(app.appointment_date)}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-primary-purple shrink-0" /> {formatTime(app.start_time)} - {formatTime(app.end_time)}
                </div>
                <div className="flex items-center truncate">
                  <MapPin className="w-4 h-4 mr-2 text-primary-purple shrink-0" /> <span className="truncate">{app.service_address}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default StaffAppointments;
